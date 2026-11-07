// arb-rt --probe : checks what the native renderer can use on this PC and proves the DLSS chain end to end.
//
//   1. Vulkan: which graphics cards exist, their driver, and whether they can do hardware ray tracing (ray query + acceleration structures).
//   2. DLSS: starts NVIDIA's NGX, asks whether DLSS is available, and runs a real DLSS upscale on a test picture
//      (rendered at a smaller size with sub-pixel jitter, upscaled to 1920x1080) and compares it with a plain bilinear upscale.
//      It also finds out which sign of the jitter DLSS expects, so the game renderer can use the right one.
//   3. Ray tracing: builds a bottom and top level acceleration structure on the GPU.
//
// Everything is written to <out>/probe-report.txt and the test pictures to <out>/*.png. Nothing is installed or changed.
#include "vk_min.h"
#include <cmath>
#include <chrono>
#include <algorithm>
#include <map>
#include <set>
#include <functional>
#ifdef ARB_DLSS
#include "nvsdk_ngx_vk.h"
#include "nvsdk_ngx_helpers.h"
#include "nvsdk_ngx_helpers_vk.h"
#endif

// ------------------------------------------------------------------ log
static FILE* gLog = nullptr;
static void L(const char* f, ...) {
  char b[2048];
  va_list a; va_start(a, f); vsnprintf(b, sizeof b, f, a); va_end(a);
  fputs(b, stdout); fputc('\n', stdout); fflush(stdout);
  if (gLog) { fputs(b, gLog); fputc('\n', gLog); fflush(gLog); }
}
static std::string gOut = ".";
static std::string P(const char* n) { return gOut + "/" + n; }

// ------------------------------------------------------------------ png (stored deflate, no dependencies)
static uint32_t crcT[256]; static bool crcInit = false;
static uint32_t crc32u(uint32_t c, const uint8_t* p, size_t n) {
  if (!crcInit) { for (uint32_t i = 0; i < 256; i++) { uint32_t x = i; for (int k = 0; k < 8; k++) x = x & 1 ? 0xEDB88320u ^ (x >> 1) : x >> 1; crcT[i] = x; } crcInit = true; }
  c = ~c; for (size_t i = 0; i < n; i++) c = crcT[(c ^ p[i]) & 255] ^ (c >> 8); return ~c;
}
static void be32(std::vector<uint8_t>& v, uint32_t x) { v.push_back(x >> 24); v.push_back(x >> 16); v.push_back(x >> 8); v.push_back(x); }
static void chunk(FILE* f, const char* t, const std::vector<uint8_t>& d) {
  std::vector<uint8_t> h; be32(h, (uint32_t)d.size()); fwrite(h.data(), 1, 4, f);
  std::vector<uint8_t> td(t, t + 4); td.insert(td.end(), d.begin(), d.end()); fwrite(td.data(), 1, td.size(), f);
  std::vector<uint8_t> c; be32(c, crc32u(0, td.data(), td.size())); fwrite(c.data(), 1, 4, f);
}
static bool writePng(const std::string& path, int w, int h, const uint8_t* rgba) {
  FILE* f = fopen(path.c_str(), "wb"); if (!f) return false;
  const uint8_t sig[8] = { 137, 80, 78, 71, 13, 10, 26, 10 }; fwrite(sig, 1, 8, f);
  std::vector<uint8_t> ih; be32(ih, w); be32(ih, h); ih.push_back(8); ih.push_back(2); ih.push_back(0); ih.push_back(0); ih.push_back(0); chunk(f, "IHDR", ih);
  std::vector<uint8_t> raw; raw.reserve((size_t)(w * 3 + 1) * h);
  for (int y = 0; y < h; y++) { raw.push_back(0); for (int x = 0; x < w; x++) { const uint8_t* p = rgba + ((size_t)y * w + x) * 4; raw.push_back(p[0]); raw.push_back(p[1]); raw.push_back(p[2]); } }
  std::vector<uint8_t> z; z.push_back(0x78); z.push_back(0x01);
  size_t pos = 0; uint32_t a = 1, b = 0;
  for (size_t i = 0; i < raw.size(); i++) { a = (a + raw[i]) % 65521; b = (b + a) % 65521; }
  while (pos < raw.size()) { size_t n = std::min<size_t>(65535, raw.size() - pos); bool last = pos + n >= raw.size(); z.push_back(last ? 1 : 0); z.push_back(n & 255); z.push_back(n >> 8); z.push_back(~n & 255); z.push_back((~n >> 8) & 255); z.insert(z.end(), raw.begin() + pos, raw.begin() + pos + n); pos += n; }
  be32(z, (b << 16) | a); chunk(f, "IDAT", z); chunk(f, "IEND", {}); fclose(f); return true;
}

// ------------------------------------------------------------------ vulkan helpers
struct Ctx { VkInstance inst = nullptr; VkPhysicalDevice pd = nullptr; VkDevice dev = nullptr; VkQueue q = nullptr; uint32_t qf = 0; VkCommandPool pool = nullptr; VkPhysicalDeviceMemoryProperties mp{}; float tsPeriod = 1; bool tsOK = false; } C;
#define VKCHK(x) do { VkResult r_ = (x); if (r_ != VK_SUCCESS) { L("  Vulkan call failed: %s -> %s (%d)", #x, vkResultName(r_), (int)r_); return false; } } while (0)

static uint32_t findMem(uint32_t bits, VkMemoryPropertyFlags want) {
  for (uint32_t i = 0; i < C.mp.memoryTypeCount; i++) if ((bits & (1u << i)) && (C.mp.memoryTypes[i].propertyFlags & want) == want) return i;
  return UINT32_MAX;
}
struct Buf { VkBuffer b = nullptr; VkDeviceMemory m = nullptr; void* map = nullptr; VkDeviceSize size = 0; VkDeviceAddress addr = 0; };
static bool mkBuf(Buf& o, VkDeviceSize size, VkBufferUsageFlags usage, VkMemoryPropertyFlags props, bool addr = false) {
  VkBufferCreateInfo bi{ VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO }; bi.size = size; bi.usage = usage | (addr ? VK_BUFFER_USAGE_SHADER_DEVICE_ADDRESS_BIT : 0); bi.sharingMode = VK_SHARING_MODE_EXCLUSIVE;
  VKCHK(vkCreateBuffer(C.dev, &bi, nullptr, &o.b));
  VkMemoryRequirements mr; vkGetBufferMemoryRequirements(C.dev, o.b, &mr);
  uint32_t mt = findMem(mr.memoryTypeBits, props); if (mt == UINT32_MAX) { L("  no memory type for a buffer"); return false; }
  VkMemoryAllocateFlagsInfo fi{ VK_STRUCTURE_TYPE_MEMORY_ALLOCATE_FLAGS_INFO }; fi.flags = VK_MEMORY_ALLOCATE_DEVICE_ADDRESS_BIT;
  VkMemoryAllocateInfo ai{ VK_STRUCTURE_TYPE_MEMORY_ALLOCATE_INFO }; ai.allocationSize = mr.size; ai.memoryTypeIndex = mt; if (addr) ai.pNext = &fi;
  VKCHK(vkAllocateMemory(C.dev, &ai, nullptr, &o.m)); VKCHK(vkBindBufferMemory(C.dev, o.b, o.m, 0)); o.size = size;
  if (props & VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT) VKCHK(vkMapMemory(C.dev, o.m, 0, VK_WHOLE_SIZE, 0, &o.map));
  if (addr) { VkBufferDeviceAddressInfo di{ VK_STRUCTURE_TYPE_BUFFER_DEVICE_ADDRESS_INFO }; di.buffer = o.b; o.addr = vkGetBufferDeviceAddress(C.dev, &di); }
  return true;
}
static void freeBuf(Buf& o) { if (o.map) vkUnmapMemory(C.dev, o.m); if (o.b) vkDestroyBuffer(C.dev, o.b, nullptr); if (o.m) vkFreeMemory(C.dev, o.m, nullptr); o = Buf(); }

struct Img { VkImage img = nullptr; VkDeviceMemory mem = nullptr; VkImageView view = nullptr; VkFormat fmt = VK_FORMAT_UNDEFINED; uint32_t w = 0, h = 0; VkImageAspectFlags asp = VK_IMAGE_ASPECT_COLOR_BIT; VkImageLayout lay = VK_IMAGE_LAYOUT_UNDEFINED; };
static bool mkImg(Img& o, uint32_t w, uint32_t h, VkFormat fmt, VkImageUsageFlags use, VkImageAspectFlags asp) {
  VkImageCreateInfo ci{ VK_STRUCTURE_TYPE_IMAGE_CREATE_INFO }; ci.imageType = VK_IMAGE_TYPE_2D; ci.format = fmt; ci.extent = { w, h, 1 }; ci.mipLevels = 1; ci.arrayLayers = 1;
  ci.samples = VK_SAMPLE_COUNT_1_BIT; ci.tiling = VK_IMAGE_TILING_OPTIMAL; ci.usage = use; ci.sharingMode = VK_SHARING_MODE_EXCLUSIVE; ci.initialLayout = VK_IMAGE_LAYOUT_UNDEFINED;
  VKCHK(vkCreateImage(C.dev, &ci, nullptr, &o.img));
  VkMemoryRequirements mr; vkGetImageMemoryRequirements(C.dev, o.img, &mr);
  uint32_t mt = findMem(mr.memoryTypeBits, VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT); if (mt == UINT32_MAX) { L("  no memory type for an image"); return false; }
  VkMemoryAllocateInfo ai{ VK_STRUCTURE_TYPE_MEMORY_ALLOCATE_INFO }; ai.allocationSize = mr.size; ai.memoryTypeIndex = mt;
  VKCHK(vkAllocateMemory(C.dev, &ai, nullptr, &o.mem)); VKCHK(vkBindImageMemory(C.dev, o.img, o.mem, 0));
  VkImageViewCreateInfo vi{ VK_STRUCTURE_TYPE_IMAGE_VIEW_CREATE_INFO }; vi.image = o.img; vi.viewType = VK_IMAGE_VIEW_TYPE_2D; vi.format = fmt; vi.subresourceRange = { asp, 0, 1, 0, 1 };
  VKCHK(vkCreateImageView(C.dev, &vi, nullptr, &o.view)); o.fmt = fmt; o.w = w; o.h = h; o.asp = asp; o.lay = VK_IMAGE_LAYOUT_UNDEFINED; return true;
}
static void freeImg(Img& o) { if (o.view) vkDestroyImageView(C.dev, o.view, nullptr); if (o.img) vkDestroyImage(C.dev, o.img, nullptr); if (o.mem) vkFreeMemory(C.dev, o.mem, nullptr); o = Img(); }
static void toLayout(VkCommandBuffer cb, Img& im, VkImageLayout nl) {
  if (im.lay == nl) return;
  VkImageMemoryBarrier b{ VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER }; b.oldLayout = im.lay; b.newLayout = nl; b.srcQueueFamilyIndex = b.dstQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;
  b.image = im.img; b.subresourceRange = { im.asp, 0, 1, 0, 1 }; b.srcAccessMask = VK_ACCESS_MEMORY_READ_BIT | VK_ACCESS_MEMORY_WRITE_BIT; b.dstAccessMask = VK_ACCESS_MEMORY_READ_BIT | VK_ACCESS_MEMORY_WRITE_BIT;
  vkCmdPipelineBarrier(cb, VK_PIPELINE_STAGE_ALL_COMMANDS_BIT, VK_PIPELINE_STAGE_ALL_COMMANDS_BIT, 0, 0, nullptr, 0, nullptr, 1, &b); im.lay = nl;
}
static VkCommandBuffer beginCmd() {
  VkCommandBufferAllocateInfo ai{ VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO }; ai.commandPool = C.pool; ai.level = VK_COMMAND_BUFFER_LEVEL_PRIMARY; ai.commandBufferCount = 1;
  VkCommandBuffer cb = nullptr; if (vkAllocateCommandBuffers(C.dev, &ai, &cb) != VK_SUCCESS) return nullptr;
  VkCommandBufferBeginInfo bi{ VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO }; bi.flags = VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT; vkBeginCommandBuffer(cb, &bi); return cb;
}
static bool endCmd(VkCommandBuffer cb) {
  vkEndCommandBuffer(cb);
  VkFenceCreateInfo fi{ VK_STRUCTURE_TYPE_FENCE_CREATE_INFO }; VkFence f = nullptr; vkCreateFence(C.dev, &fi, nullptr, &f);
  VkSubmitInfo si{ VK_STRUCTURE_TYPE_SUBMIT_INFO }; si.commandBufferCount = 1; si.pCommandBuffers = &cb;
  VkResult r = vkQueueSubmit(C.q, 1, &si, f); if (r == VK_SUCCESS) r = vkWaitForFences(C.dev, 1, &f, VK_TRUE, 30ull * 1000 * 1000 * 1000);
  vkDestroyFence(C.dev, f, nullptr); vkFreeCommandBuffers(C.dev, C.pool, 1, &cb);
  if (r != VK_SUCCESS) { L("  GPU work failed: %s", vkResultName(r)); return false; } return true;
}

// ------------------------------------------------------------------ the test scene (an exact formula, so the right answer is known at any resolution)
static const int TW = 1920, TH = 1080;      // target (output) size
static void scene(float x, float y, float& r, float& g, float& b, float& z) {   // x,y in target pixels
  float u = x / TW, v = y / TH; r = .12f + .25f * u; g = .18f + .2f * v; b = .35f; z = .8f;
  if (u < .5f && v >= .25f) { float s = std::fmod((x + y) / 7.f, 1.f); z = .3f; if (s < .5f) { r = .95f; g = .85f; b = .2f; } else { r = .15f; g = .15f; b = .5f; } }
  else if (u >= .5f && v < .5f) { int c = ((int)std::floor(x / 5.f) + (int)std::floor(y / 5.f)) & 1; z = .5f; r = g = b = c ? .92f : .1f; }
  float dx = x - 1440.f, dy = y - 810.f, d = std::sqrt(dx * dx + dy * dy);
  if (std::fabs(d - 220.f) < 1.5f) { r = 1.f; g = .3f; b = .3f; z = .4f; }
  if (u < .5f && v < .25f) { if (std::fmod(y, 40.f) < 1.f) { r = g = b = 1.f; z = .35f; } if (std::fmod(x, 60.f) < 1.f) { r = g = b = .9f; z = .35f; } }
}
static float halton(int i, int b) { float f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i /= b; } return r; }

// ------------------------------------------------------------------ ray tracing sanity check (no shaders needed: just build the structures)
static bool rtSanity() {
  struct V3 { float x, y, z; } tri[3] = { { 0, 0, 0 }, { 1, 0, 0 }, { 0, 1, 0 } };
  Buf vb; if (!mkBuf(vb, sizeof tri, VK_BUFFER_USAGE_ACCELERATION_STRUCTURE_BUILD_INPUT_READ_ONLY_BIT_KHR, VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT, true)) return false;
  memcpy(vb.map, tri, sizeof tri);
  VkAccelerationStructureGeometryKHR g{ VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_GEOMETRY_KHR }; g.geometryType = VK_GEOMETRY_TYPE_TRIANGLES_KHR; g.flags = VK_GEOMETRY_OPAQUE_BIT_KHR;
  g.geometry.triangles.sType = VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_GEOMETRY_TRIANGLES_DATA_KHR; g.geometry.triangles.vertexFormat = VK_FORMAT_R32G32B32_SFLOAT;
  g.geometry.triangles.vertexData.deviceAddress = vb.addr; g.geometry.triangles.vertexStride = sizeof(V3); g.geometry.triangles.maxVertex = 2; g.geometry.triangles.indexType = VK_INDEX_TYPE_NONE_KHR;
  VkAccelerationStructureBuildGeometryInfoKHR bg{ VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_BUILD_GEOMETRY_INFO_KHR }; bg.type = VK_ACCELERATION_STRUCTURE_TYPE_BOTTOM_LEVEL_KHR; bg.flags = VK_BUILD_ACCELERATION_STRUCTURE_PREFER_FAST_TRACE_BIT_KHR;
  bg.mode = VK_BUILD_ACCELERATION_STRUCTURE_MODE_BUILD_KHR; bg.geometryCount = 1; bg.pGeometries = &g;
  uint32_t np = 1; VkAccelerationStructureBuildSizesInfoKHR bs{ VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_BUILD_SIZES_INFO_KHR };
  vkGetAccelerationStructureBuildSizesKHR(C.dev, VK_ACCELERATION_STRUCTURE_BUILD_TYPE_DEVICE_KHR, &bg, &np, &bs);
  Buf ab, sc, ib, ab2, sc2; VkAccelerationStructureKHR blas = nullptr, tlas = nullptr;
  if (!mkBuf(ab, bs.accelerationStructureSize, VK_BUFFER_USAGE_ACCELERATION_STRUCTURE_STORAGE_BIT_KHR, VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT, true)) return false;
  if (!mkBuf(sc, bs.buildScratchSize + 4096, VK_BUFFER_USAGE_STORAGE_BUFFER_BIT, VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT, true)) return false;
  VkAccelerationStructureCreateInfoKHR ci{ VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_CREATE_INFO_KHR }; ci.buffer = ab.b; ci.size = bs.accelerationStructureSize; ci.type = VK_ACCELERATION_STRUCTURE_TYPE_BOTTOM_LEVEL_KHR;
  VKCHK(vkCreateAccelerationStructureKHR(C.dev, &ci, nullptr, &blas));
  bg.dstAccelerationStructure = blas; bg.scratchData.deviceAddress = (sc.addr + 255) & ~(VkDeviceAddress)255;
  VkAccelerationStructureBuildRangeInfoKHR range{ 1, 0, 0, 0 }; const VkAccelerationStructureBuildRangeInfoKHR* pr = &range;
  VkCommandBuffer cb = beginCmd(); vkCmdBuildAccelerationStructuresKHR(cb, 1, &bg, &pr); if (!endCmd(cb)) return false;
  VkAccelerationStructureDeviceAddressInfoKHR da{ VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_DEVICE_ADDRESS_INFO_KHR }; da.accelerationStructure = blas;
  VkDeviceAddress blasAddr = vkGetAccelerationStructureDeviceAddressKHR(C.dev, &da);
  VkAccelerationStructureInstanceKHR inst{}; inst.transform.matrix[0][0] = inst.transform.matrix[1][1] = inst.transform.matrix[2][2] = 1.f; inst.mask = 0xFF; inst.accelerationStructureReference = blasAddr;
  if (!mkBuf(ib, sizeof inst, VK_BUFFER_USAGE_ACCELERATION_STRUCTURE_BUILD_INPUT_READ_ONLY_BIT_KHR, VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT, true)) return false;
  memcpy(ib.map, &inst, sizeof inst);
  VkAccelerationStructureGeometryKHR tg{ VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_GEOMETRY_KHR }; tg.geometryType = VK_GEOMETRY_TYPE_INSTANCES_KHR; tg.geometry.instances.sType = VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_GEOMETRY_INSTANCES_DATA_KHR; tg.geometry.instances.data.deviceAddress = ib.addr;
  VkAccelerationStructureBuildGeometryInfoKHR tb{ VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_BUILD_GEOMETRY_INFO_KHR }; tb.type = VK_ACCELERATION_STRUCTURE_TYPE_TOP_LEVEL_KHR; tb.flags = VK_BUILD_ACCELERATION_STRUCTURE_PREFER_FAST_TRACE_BIT_KHR; tb.mode = VK_BUILD_ACCELERATION_STRUCTURE_MODE_BUILD_KHR; tb.geometryCount = 1; tb.pGeometries = &tg;
  VkAccelerationStructureBuildSizesInfoKHR ts{ VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_BUILD_SIZES_INFO_KHR }; vkGetAccelerationStructureBuildSizesKHR(C.dev, VK_ACCELERATION_STRUCTURE_BUILD_TYPE_DEVICE_KHR, &tb, &np, &ts);
  if (!mkBuf(ab2, ts.accelerationStructureSize, VK_BUFFER_USAGE_ACCELERATION_STRUCTURE_STORAGE_BIT_KHR, VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT, true)) return false;
  if (!mkBuf(sc2, ts.buildScratchSize + 4096, VK_BUFFER_USAGE_STORAGE_BUFFER_BIT, VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT, true)) return false;
  VkAccelerationStructureCreateInfoKHR ci2{ VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_CREATE_INFO_KHR }; ci2.buffer = ab2.b; ci2.size = ts.accelerationStructureSize; ci2.type = VK_ACCELERATION_STRUCTURE_TYPE_TOP_LEVEL_KHR;
  VKCHK(vkCreateAccelerationStructureKHR(C.dev, &ci2, nullptr, &tlas)); tb.dstAccelerationStructure = tlas; tb.scratchData.deviceAddress = (sc2.addr + 255) & ~(VkDeviceAddress)255;
  const VkAccelerationStructureBuildRangeInfoKHR* pr2 = &range; cb = beginCmd(); vkCmdBuildAccelerationStructuresKHR(cb, 1, &tb, &pr2); bool ok = endCmd(cb);
  L("  bottom level structure: %llu bytes, top level structure: %llu bytes", (unsigned long long)bs.accelerationStructureSize, (unsigned long long)ts.accelerationStructureSize);
  vkDestroyAccelerationStructureKHR(C.dev, tlas, nullptr); vkDestroyAccelerationStructureKHR(C.dev, blas, nullptr);
  freeBuf(ab); freeBuf(sc); freeBuf(ib); freeBuf(ab2); freeBuf(sc2); freeBuf(vb); return ok;
}

// ------------------------------------------------------------------ the picture test: DLSS (when available) and a bilinear baseline
struct Pic { std::vector<uint8_t> rgba; };
static double psnr(const std::vector<uint8_t>& a, const std::vector<uint8_t>& gt) {
  double se = 0; size_t n = 0;
  for (int y = 8; y < TH - 8; y++) for (int x = 8; x < TW - 8; x++) { size_t i = ((size_t)y * TW + x) * 4; for (int c = 0; c < 3; c++) { double d = (double)a[i + c] - gt[i + c]; se += d * d; n++; } }
  double mse = se / n; return mse < 1e-9 ? 99.0 : 10.0 * std::log10(255.0 * 255.0 / mse);
}
static void renderLow(int rw, int rh, float jx, float jy, std::vector<uint8_t>& col, std::vector<float>& dep) {
  col.resize((size_t)rw * rh * 4); dep.resize((size_t)rw * rh);
  for (int y = 0; y < rh; y++) for (int x = 0; x < rw; x++) {
    float r, g, b, z; scene((x + .5f + jx) * TW / rw, (y + .5f + jy) * TH / rh, r, g, b, z);
    uint8_t* p = &col[((size_t)y * rw + x) * 4]; p[0] = (uint8_t)(std::min(1.f, r) * 255 + .5f); p[1] = (uint8_t)(std::min(1.f, g) * 255 + .5f); p[2] = (uint8_t)(std::min(1.f, b) * 255 + .5f); p[3] = 255; dep[(size_t)y * rw + x] = z;
  }
}
static bool readback(Img& src, std::vector<uint8_t>& out) {
  Buf rb; if (!mkBuf(rb, (VkDeviceSize)src.w * src.h * 4, VK_BUFFER_USAGE_TRANSFER_DST_BIT, VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT)) return false;
  VkCommandBuffer cb = beginCmd(); toLayout(cb, src, VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL);
  VkBufferImageCopy rg{}; rg.imageSubresource = { VK_IMAGE_ASPECT_COLOR_BIT, 0, 0, 1 }; rg.imageExtent = { src.w, src.h, 1 }; vkCmdCopyImageToBuffer(cb, src.img, VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL, rb.b, 1, &rg);
  if (!endCmd(cb)) return false; out.assign((uint8_t*)rb.map, (uint8_t*)rb.map + (size_t)src.w * src.h * 4); freeBuf(rb); return true;
}

#ifdef ARB_DLSS
static void NVSDK_CONV ngxLog(const char* msg, NVSDK_NGX_Logging_Level, NVSDK_NGX_Feature) { if (gLog) { fputs("  [NGX] ", gLog); fputs(msg, gLog); fflush(gLog); } }
static std::wstring widen(const std::string& s) { std::wstring w; for (unsigned char c : s) w.push_back(c); return w; }
static std::wstring gWOut, gWExe; static wchar_t* gPathPtr = nullptr;
static NVSDK_NGX_FeatureCommonInfo gCommon; static NVSDK_NGX_FeatureDiscoveryInfo gDisc;
static void ngxPrepare(const std::string& exeDir) {
  gWOut = widen(gOut); gWExe = widen(exeDir); gPathPtr = (wchar_t*)gWExe.c_str();
  memset(&gCommon, 0, sizeof gCommon); gCommon.PathListInfo.Path = &gPathPtr; gCommon.PathListInfo.Length = 1;
  gCommon.LoggingInfo.LoggingCallback = ngxLog; gCommon.LoggingInfo.MinimumLoggingLevel = NVSDK_NGX_LOGGING_LEVEL_ON; gCommon.LoggingInfo.DisableOtherLoggingSinks = false;
  memset(&gDisc, 0, sizeof gDisc); gDisc.SDKVersion = NVSDK_NGX_Version_API; gDisc.FeatureID = NVSDK_NGX_Feature_SuperSampling;
  gDisc.Identifier.IdentifierType = NVSDK_NGX_Application_Identifier_Type_Project_Id; gDisc.Identifier.v.ProjectDesc.ProjectId = "a4d3e1c8-7f2b-4b8e-9c55-2d6a0e7b31f4";
  gDisc.Identifier.v.ProjectDesc.EngineType = NVSDK_NGX_ENGINE_TYPE_CUSTOM; gDisc.Identifier.v.ProjectDesc.EngineVersion = "0.9"; gDisc.ApplicationDataPath = gWOut.c_str(); gDisc.FeatureInfo = &gCommon;
}
#endif

int probeMain(int argc, char** argv) {
  std::string exeDir = "."; { std::string a0 = argv[0]; size_t p = a0.find_last_of("/\\"); if (p != std::string::npos) exeDir = a0.substr(0, p); }
#ifdef _WIN32
  { char b[MAX_PATH * 2]; DWORD n = GetModuleFileNameA(nullptr, b, sizeof b); if (n > 0 && n < sizeof b) { std::string a0 = b; size_t p = a0.find_last_of("\\/"); if (p != std::string::npos) exeDir = a0.substr(0, p); } }
#endif
  bool wantDlss = true, wantRt = true; int devIdx = -1, quality = 2; std::string ngxPath = exeDir;
  for (int i = 1; i < argc; i++) {
    std::string a = argv[i];
    if (a == "--out" && i + 1 < argc) gOut = argv[++i]; else if (a == "--no-dlss") wantDlss = false; else if (a == "--no-rt") wantRt = false;
    else if (a == "--device" && i + 1 < argc) devIdx = atoi(argv[++i]); else if (a == "--quality" && i + 1 < argc) quality = atoi(argv[++i]); else if (a == "--ngx-path" && i + 1 < argc) ngxPath = argv[++i];
  }
#ifdef _WIN32
  { char b[MAX_PATH * 2]; DWORD n = GetFullPathNameA(gOut.c_str(), sizeof b, b, nullptr); if (n > 0 && n < sizeof b) gOut = b; }
#endif
  gLog = fopen(P("probe-report.txt").c_str(), "w");
  L("Arberia native renderer probe");
  L("----------------------------");
  std::string err; if (!vkmLoadLoader(err)) { L("RESULT: Vulkan is not available: %s", err.c_str()); return 2; }
  bool dlssBuilt = false;
#ifdef ARB_DLSS
  dlssBuilt = true; ngxPrepare(ngxPath);
#else
  (void)ngxPath;
#endif
  L("DLSS code in this build: %s", dlssBuilt ? "yes" : "no (built without the NVIDIA SDK)");
  L("Program folder: %s", exeDir.c_str());
#ifdef _WIN32
  if (dlssBuilt) { std::string d = exeDir + "\\nvngx_dlss.dll"; DWORD at = GetFileAttributesA(d.c_str()); L("nvngx_dlss.dll next to the program: %s", at == INVALID_FILE_ATTRIBUTES ? "MISSING" : "found"); }
#endif

  // ---- instance
  uint32_t ne = 0; vkEnumerateInstanceExtensionProperties(nullptr, &ne, nullptr); std::vector<VkExtensionProperties> iex(ne); vkEnumerateInstanceExtensionProperties(nullptr, &ne, iex.data());
  std::set<std::string> instHave; for (auto& e : iex) instHave.insert(e.extensionName);
  std::vector<std::string> instWant;
#ifdef ARB_DLSS
  if (wantDlss) { uint32_t n = 0; NVSDK_NGX_Result r = NVSDK_NGX_VULKAN_GetFeatureInstanceExtensionRequirements(&gDisc, &n, nullptr); L("NGX instance extensions query: result 0x%x, %u extension(s)", (unsigned)r, n);
    if (NVSDK_NGX_SUCCEED(r) && n) { VkExtensionProperties* props = nullptr; r = NVSDK_NGX_VULKAN_GetFeatureInstanceExtensionRequirements(&gDisc, &n, &props); if (NVSDK_NGX_SUCCEED(r)) for (uint32_t i = 0; i < n; i++) { instWant.push_back(props[i].extensionName); L("  needs instance extension %s", props[i].extensionName); } } }
#endif
  std::vector<const char*> iext; for (auto& s : instWant) if (instHave.count(s)) iext.push_back(s.c_str()); else L("  (instance extension %s is not offered by the loader)", s.c_str());
  VkApplicationInfo app{ VK_STRUCTURE_TYPE_APPLICATION_INFO }; app.pApplicationName = "Arberia Deathmatch native probe"; app.apiVersion = VK_API_VERSION_1_2;
  VkInstanceCreateInfo ici{ VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO }; ici.pApplicationInfo = &app; ici.enabledExtensionCount = (uint32_t)iext.size(); ici.ppEnabledExtensionNames = iext.data();
  VkResult vr = vkCreateInstance(&ici, nullptr, &C.inst);
  if (vr != VK_SUCCESS) { L("RESULT: could not create a Vulkan instance: %s", vkResultName(vr)); return 3; }
  vkmLoadInstance(C.inst);

  // ---- devices
  uint32_t nd = 0; vkEnumeratePhysicalDevices(C.inst, &nd, nullptr); std::vector<VkPhysicalDevice> pds(nd); vkEnumeratePhysicalDevices(C.inst, &nd, pds.data());
  L("Graphics devices found: %u", nd);
  struct Info { VkPhysicalDeviceProperties pr; std::set<std::string> ext; bool as = false, rq = false, bda = false; };
  std::vector<Info> infos(nd);
  for (uint32_t i = 0; i < nd; i++) {
    Info& in = infos[i]; vkGetPhysicalDeviceProperties(pds[i], &in.pr);
    uint32_t n = 0; vkEnumerateDeviceExtensionProperties(pds[i], nullptr, &n, nullptr); std::vector<VkExtensionProperties> ex(n); vkEnumerateDeviceExtensionProperties(pds[i], nullptr, &n, ex.data()); for (auto& e : ex) in.ext.insert(e.extensionName);
    VkPhysicalDeviceAccelerationStructureFeaturesKHR asf{ VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_ACCELERATION_STRUCTURE_FEATURES_KHR }; VkPhysicalDeviceRayQueryFeaturesKHR rqf{ VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_RAY_QUERY_FEATURES_KHR };
    VkPhysicalDeviceVulkan12Features f12{ VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_VULKAN_1_2_FEATURES }; f12.pNext = &asf; asf.pNext = &rqf;
    VkPhysicalDeviceFeatures2 f2{ VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_FEATURES_2 }; f2.pNext = &f12;
    if (in.pr.apiVersion >= VK_API_VERSION_1_2) vkGetPhysicalDeviceFeatures2(pds[i], &f2);
    in.as = in.ext.count("VK_KHR_acceleration_structure") && asf.accelerationStructure; in.rq = in.ext.count("VK_KHR_ray_query") && rqf.rayQuery; in.bda = f12.bufferDeviceAddress;
    const char* type = in.pr.deviceType == VK_PHYSICAL_DEVICE_TYPE_DISCRETE_GPU ? "discrete" : in.pr.deviceType == VK_PHYSICAL_DEVICE_TYPE_INTEGRATED_GPU ? "integrated" : in.pr.deviceType == VK_PHYSICAL_DEVICE_TYPE_CPU ? "software (CPU)" : "other";
    L("[%u] %s  (%s, vendor 0x%04x, Vulkan %u.%u.%u, driver 0x%x)", i, in.pr.deviceName, type, in.pr.vendorID, VK_VERSION_MAJOR(in.pr.apiVersion), VK_VERSION_MINOR(in.pr.apiVersion), VK_VERSION_PATCH(in.pr.apiVersion), in.pr.driverVersion);
    L("     ray tracing: acceleration structures %s, ray query %s, buffer addresses %s", in.as ? "YES" : "no", in.rq ? "YES" : "no", in.bda ? "yes" : "no");
  }
  if (!nd) { L("RESULT: no Vulkan graphics device was found"); return 4; }
  int pick = devIdx;
  if (pick < 0 || pick >= (int)nd) { pick = 0; int best = -1; for (uint32_t i = 0; i < nd; i++) { int s = (infos[i].pr.vendorID == 0x10de ? 10 : 0) + (infos[i].pr.deviceType == VK_PHYSICAL_DEVICE_TYPE_DISCRETE_GPU ? 5 : 0) + (infos[i].rq ? 2 : 0); if (s > best) { best = s; pick = i; } } }
  C.pd = pds[pick]; Info& DV = infos[pick]; L("Using device [%d] %s", pick, DV.pr.deviceName);
  vkGetPhysicalDeviceMemoryProperties(C.pd, &C.mp); C.tsPeriod = DV.pr.limits.timestampPeriod;
  bool nvidia = DV.pr.vendorID == 0x10de;

  // ---- device (with everything NGX asks for)
  std::vector<std::string> devWant;
#ifdef ARB_DLSS
  if (wantDlss) { uint32_t n = 0; NVSDK_NGX_Result r = NVSDK_NGX_VULKAN_GetFeatureDeviceExtensionRequirements(C.inst, C.pd, &gDisc, &n, nullptr); L("NGX device extensions query: result 0x%x, %u extension(s)", (unsigned)r, n);
    if (NVSDK_NGX_SUCCEED(r) && n) { VkExtensionProperties* props = nullptr; r = NVSDK_NGX_VULKAN_GetFeatureDeviceExtensionRequirements(C.inst, C.pd, &gDisc, &n, &props); if (NVSDK_NGX_SUCCEED(r)) for (uint32_t i = 0; i < n; i++) { devWant.push_back(props[i].extensionName); L("  needs device extension %s", props[i].extensionName); } }
    NVSDK_NGX_FeatureRequirement req{}; r = NVSDK_NGX_VULKAN_GetFeatureRequirements(C.inst, C.pd, &gDisc, &req); L("NGX feature requirements: result 0x%x, supported-flags %d, min architecture %u, min OS '%s'", (unsigned)r, (int)req.FeatureSupported, req.MinHWArchitecture, req.MinOSVersion); }
#endif
  bool useRt = wantRt && DV.as && DV.rq && DV.bda;
  if (useRt) { devWant.push_back("VK_KHR_acceleration_structure"); devWant.push_back("VK_KHR_ray_query"); devWant.push_back("VK_KHR_deferred_host_operations"); }
  std::vector<const char*> dext;
  std::set<std::string> uniq; std::vector<std::string> finalExt; for (auto& s : devWant) if (DV.ext.count(s) && !uniq.count(s)) { uniq.insert(s); finalExt.push_back(s); }
  dext.clear(); for (auto& s : finalExt) dext.push_back(s.c_str());
  uint32_t nq = 0; vkGetPhysicalDeviceQueueFamilyProperties(C.pd, &nq, nullptr); std::vector<VkQueueFamilyProperties> qfp(nq); vkGetPhysicalDeviceQueueFamilyProperties(C.pd, &nq, qfp.data());
  C.qf = UINT32_MAX; for (uint32_t i = 0; i < nq; i++) if ((qfp[i].queueFlags & (VK_QUEUE_GRAPHICS_BIT | VK_QUEUE_COMPUTE_BIT | VK_QUEUE_TRANSFER_BIT)) == (VK_QUEUE_GRAPHICS_BIT | VK_QUEUE_COMPUTE_BIT | VK_QUEUE_TRANSFER_BIT)) { C.qf = i; break; }
  if (C.qf == UINT32_MAX) { L("RESULT: no queue that can draw and compute"); return 5; }
  float prio = 1.f; VkDeviceQueueCreateInfo qci{ VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO }; qci.queueFamilyIndex = C.qf; qci.queueCount = 1; qci.pQueuePriorities = &prio;
  VkPhysicalDeviceAccelerationStructureFeaturesKHR asf{ VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_ACCELERATION_STRUCTURE_FEATURES_KHR }; asf.accelerationStructure = VK_TRUE;
  VkPhysicalDeviceRayQueryFeaturesKHR rqf{ VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_RAY_QUERY_FEATURES_KHR }; rqf.rayQuery = VK_TRUE; rqf.pNext = &asf;
  VkPhysicalDeviceVulkan12Features f12{ VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_VULKAN_1_2_FEATURES }; f12.bufferDeviceAddress = useRt ? VK_TRUE : VK_FALSE; f12.pNext = useRt ? (void*)&rqf : nullptr;
  VkPhysicalDeviceFeatures2 f2{ VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_FEATURES_2 }; f2.pNext = &f12;
  VkDeviceCreateInfo dci{ VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO }; dci.pNext = &f2; dci.queueCreateInfoCount = 1; dci.pQueueCreateInfos = &qci; dci.enabledExtensionCount = (uint32_t)dext.size(); dci.ppEnabledExtensionNames = dext.data();
  vr = vkCreateDevice(C.pd, &dci, nullptr, &C.dev); if (vr != VK_SUCCESS) { L("RESULT: could not create the Vulkan device: %s", vkResultName(vr)); return 6; }
  vkmLoadDevice(C.inst, C.dev, useRt); vkGetDeviceQueue(C.dev, C.qf, 0, &C.q);
  VkCommandPoolCreateInfo pci{ VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO }; pci.queueFamilyIndex = C.qf; pci.flags = VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT; vkCreateCommandPool(C.dev, &pci, nullptr, &C.pool);
  C.tsOK = qfp[C.qf].timestampValidBits > 0; L("Device created (%zu extensions enabled).", dext.size());

  std::string summaryRt = "not available on this graphics card", summaryDlss = nvidia ? "not tested" : "needs an NVIDIA RTX graphics card";
  // ---- ray tracing structures
  if (useRt) { L("Ray tracing check:"); bool ok = rtSanity(); summaryRt = ok ? "WORKS (acceleration structures built on the GPU)" : "FAILED while building acceleration structures (see above)"; L("  -> %s", summaryRt.c_str()); }
  else if (wantRt) L("Ray tracing check skipped: this device does not offer ray query + acceleration structures.");

  // ---- the picture test
  const int jitterSigns[4][2] = { { 1, 1 }, { 1, -1 }, { -1, 1 }, { -1, -1 } };
  std::vector<uint8_t> gt((size_t)TW * TH * 4);
  { L("Rendering the reference picture (%dx%d, 3x3 samples per pixel)...", TW, TH); for (int y = 0; y < TH; y++) for (int x = 0; x < TW; x++) { float r = 0, g = 0, b = 0, z; for (int sy = 0; sy < 3; sy++) for (int sx = 0; sx < 3; sx++) { float rr, gg, bb; scene(x + (sx + .5f) / 3, y + (sy + .5f) / 3, rr, gg, bb, z); r += rr; g += gg; b += bb; } uint8_t* p = &gt[((size_t)y * TW + x) * 4]; p[0] = (uint8_t)(std::min(1.f, r / 9) * 255 + .5f); p[1] = (uint8_t)(std::min(1.f, g / 9) * 255 + .5f); p[2] = (uint8_t)(std::min(1.f, b / 9) * 255 + .5f); p[3] = 255; } }
  writePng(P("test-reference.png"), TW, TH, gt.data());

  unsigned rw = TW * 2 / 3, rh = TH * 2 / 3;   // used by the bilinear baseline and, unless DLSS says otherwise, by the DLSS test
#ifdef ARB_DLSS
  NVSDK_NGX_Parameter* capParams = nullptr; bool ngxUp = false, dlssOk = false; NVSDK_NGX_Handle* feature = nullptr; NVSDK_NGX_Parameter* params = nullptr;
  if (wantDlss && nvidia) {
    L("DLSS check:");
    NVSDK_NGX_Result r = NVSDK_NGX_VULKAN_Init_with_ProjectID(gDisc.Identifier.v.ProjectDesc.ProjectId, NVSDK_NGX_ENGINE_TYPE_CUSTOM, "0.9", gWOut.c_str(), C.inst, C.pd, C.dev, vkGetInstanceProcAddr_, vkGetDeviceProcAddr, &gCommon, NVSDK_NGX_Version_API);
    L("  NVSDK_NGX_VULKAN_Init_with_ProjectID -> 0x%x", (unsigned)r);
    if (NVSDK_NGX_SUCCEED(r)) {
      ngxUp = true; r = NVSDK_NGX_VULKAN_GetCapabilityParameters(&capParams); L("  GetCapabilityParameters -> 0x%x", (unsigned)r);
      int avail = 0, needDrv = 0, initRes = 0; unsigned mj = 0, mn = 0;
      if (capParams) {
        NVSDK_NGX_Parameter_GetI(capParams, NVSDK_NGX_Parameter_SuperSampling_Available, &avail); NVSDK_NGX_Parameter_GetI(capParams, NVSDK_NGX_Parameter_SuperSampling_NeedsUpdatedDriver, &needDrv);
        NVSDK_NGX_Parameter_GetUI(capParams, NVSDK_NGX_Parameter_SuperSampling_MinDriverVersionMajor, &mj); NVSDK_NGX_Parameter_GetUI(capParams, NVSDK_NGX_Parameter_SuperSampling_MinDriverVersionMinor, &mn);
        NVSDK_NGX_Parameter_GetI(capParams, NVSDK_NGX_Parameter_SuperSampling_FeatureInitResult, &initRes);
        L("  DLSS available: %d, needs newer driver: %d (minimum %u.%u), init result: %d", avail, needDrv, mj, mn, initRes);
        if (needDrv) summaryDlss = "needs a newer NVIDIA driver"; else if (!avail) summaryDlss = "not available on this card/driver (see the log)";
        if (avail && !needDrv) {
          const char* qn[] = { "Max performance", "Balanced", "Max quality", "Ultra performance", "Ultra quality", "DLAA" };
          for (int q = 0; q < 6; q++) { unsigned ow = 0, oh = 0, xw = 0, xh = 0, nw = 0, nh = 0; float sh = 0; NVSDK_NGX_Result rr = NGX_DLSS_GET_OPTIMAL_SETTINGS(capParams, TW, TH, (NVSDK_NGX_PerfQuality_Value)q, &ow, &oh, &xw, &xh, &nw, &nh, &sh); L("  mode %d %-18s render size %ux%u (range %ux%u - %ux%u) result 0x%x", q, qn[q], ow, oh, nw, nh, xw, xh, (unsigned)rr); if (q == quality && ow && oh) { rw = ow; rh = oh; } }
          dlssOk = true;
        }
      }
    }
  } else if (wantDlss) L("DLSS check skipped: DLSS needs an NVIDIA RTX graphics card (this is %s).", DV.pr.deviceName);
#endif
  L("Picture test: render size %ux%u -> %dx%d", rw, rh, TW, TH);
  Img col, dep, mv, out; bool imgOK = mkImg(col, rw, rh, VK_FORMAT_R8G8B8A8_UNORM, VK_IMAGE_USAGE_SAMPLED_BIT | VK_IMAGE_USAGE_TRANSFER_DST_BIT | VK_IMAGE_USAGE_TRANSFER_SRC_BIT, VK_IMAGE_ASPECT_COLOR_BIT)
    && mkImg(dep, rw, rh, VK_FORMAT_D32_SFLOAT, VK_IMAGE_USAGE_SAMPLED_BIT | VK_IMAGE_USAGE_TRANSFER_DST_BIT, VK_IMAGE_ASPECT_DEPTH_BIT)
    && mkImg(mv, rw, rh, VK_FORMAT_R16G16_SFLOAT, VK_IMAGE_USAGE_SAMPLED_BIT | VK_IMAGE_USAGE_TRANSFER_DST_BIT, VK_IMAGE_ASPECT_COLOR_BIT)
    && mkImg(out, TW, TH, VK_FORMAT_R8G8B8A8_UNORM, VK_IMAGE_USAGE_STORAGE_BIT | VK_IMAGE_USAGE_SAMPLED_BIT | VK_IMAGE_USAGE_TRANSFER_SRC_BIT | VK_IMAGE_USAGE_TRANSFER_DST_BIT, VK_IMAGE_ASPECT_COLOR_BIT);
  if (!imgOK) { L("RESULT: could not create the test images"); return 7; }
  Buf stC, stD; if (!mkBuf(stC, (VkDeviceSize)rw * rh * 4, VK_BUFFER_USAGE_TRANSFER_SRC_BIT, VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT) || !mkBuf(stD, (VkDeviceSize)rw * rh * 4, VK_BUFFER_USAGE_TRANSFER_SRC_BIT, VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT)) { L("RESULT: could not create the upload buffers"); return 7; }
  VkQueryPoolCreateInfo qpi{ VK_STRUCTURE_TYPE_QUERY_POOL_CREATE_INFO }; qpi.queryType = VK_QUERY_TYPE_TIMESTAMP; qpi.queryCount = 2; VkQueryPool qp = nullptr; if (C.tsOK) vkCreateQueryPool(C.dev, &qpi, nullptr, &qp);
  std::vector<uint8_t> low; std::vector<float> lowDepth;

  // bilinear baseline (no DLSS): one unjittered frame blitted to full size
  double psnrBil = 0;
  {
    renderLow((int)rw, (int)rh, 0, 0, low, lowDepth); memcpy(stC.map, low.data(), low.size());
    VkCommandBuffer cb = beginCmd(); toLayout(cb, col, VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL);
    VkBufferImageCopy cp{}; cp.imageSubresource = { VK_IMAGE_ASPECT_COLOR_BIT, 0, 0, 1 }; cp.imageExtent = { rw, rh, 1 }; vkCmdCopyBufferToImage(cb, stC.b, col.img, VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL, 1, &cp);
    toLayout(cb, col, VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL); toLayout(cb, out, VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL);
    VkImageBlit bl{}; bl.srcSubresource = { VK_IMAGE_ASPECT_COLOR_BIT, 0, 0, 1 }; bl.srcOffsets[1] = { (int)rw, (int)rh, 1 }; bl.dstSubresource = bl.srcSubresource; bl.dstOffsets[1] = { TW, TH, 1 };
    vkCmdBlitImage(cb, col.img, VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL, out.img, VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL, 1, &bl, VK_FILTER_LINEAR);
    if (!endCmd(cb)) return 8; std::vector<uint8_t> px; if (!readback(out, px)) return 8; psnrBil = psnr(px, gt); writePng(P("test-bilinear.png"), TW, TH, px.data());
    L("Bilinear upscale of the %ux%u picture: PSNR %.2f dB (higher is closer to the reference)", rw, rh, psnrBil);
  }

#ifdef ARB_DLSS
  double bestPsnr = 0; int bestSign = -1; double msPerFrame = 0;
  if (dlssOk) {
    NVSDK_NGX_Result r = NVSDK_NGX_VULKAN_AllocateParameters(&params); if (!NVSDK_NGX_SUCCEED(r)) { L("  AllocateParameters failed -> 0x%x", (unsigned)r); }
    NVSDK_NGX_DLSS_Create_Params cp{}; cp.Feature.InWidth = rw; cp.Feature.InHeight = rh; cp.Feature.InTargetWidth = TW; cp.Feature.InTargetHeight = TH; cp.Feature.InPerfQualityValue = (NVSDK_NGX_PerfQuality_Value)quality;
    cp.InFeatureCreateFlags = NVSDK_NGX_DLSS_Feature_Flags_MVLowRes | NVSDK_NGX_DLSS_Feature_Flags_AutoExposure;
    VkCommandBuffer cb = beginCmd(); r = NGX_VULKAN_CREATE_DLSS_EXT1(C.dev, cb, 1, 1, &feature, params, &cp); bool okc = endCmd(cb);
    L("  create DLSS feature -> 0x%x%s", (unsigned)r, okc ? "" : " (GPU work failed)");
    if (NVSDK_NGX_SUCCEED(r) && okc && feature) {
      auto rng = [](VkImageAspectFlags a) { VkImageSubresourceRange s{}; s.aspectMask = a; s.levelCount = 1; s.layerCount = 1; return s; };
      for (int sv = 0; sv < 4; sv++) {
        const int sx = jitterSigns[sv][0], sy = jitterSigns[sv][1]; double tot = 0; int cnt = 0; bool fail = false;
        for (int f = 0; f < 24 && !fail; f++) {
          float jx = halton(f % 16 + 1, 2) - .5f, jy = halton(f % 16 + 1, 3) - .5f;   // the offsets handed to DLSS
          renderLow((int)rw, (int)rh, sx * jx, sy * jy, low, lowDepth); memcpy(stC.map, low.data(), low.size()); memcpy(stD.map, lowDepth.data(), lowDepth.size() * 4);
          cb = beginCmd();
          toLayout(cb, col, VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL); toLayout(cb, dep, VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL); toLayout(cb, mv, VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL);
          VkBufferImageCopy c1{}; c1.imageSubresource = { VK_IMAGE_ASPECT_COLOR_BIT, 0, 0, 1 }; c1.imageExtent = { rw, rh, 1 }; vkCmdCopyBufferToImage(cb, stC.b, col.img, VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL, 1, &c1);
          VkBufferImageCopy c2 = c1; c2.imageSubresource.aspectMask = VK_IMAGE_ASPECT_DEPTH_BIT; vkCmdCopyBufferToImage(cb, stD.b, dep.img, VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL, 1, &c2);
          VkClearColorValue z{}; VkImageSubresourceRange cr = rng(VK_IMAGE_ASPECT_COLOR_BIT); vkCmdClearColorImage(cb, mv.img, VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL, &z, 1, &cr);
          toLayout(cb, col, VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL); toLayout(cb, dep, VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL); toLayout(cb, mv, VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL); toLayout(cb, out, VK_IMAGE_LAYOUT_GENERAL);
          NVSDK_NGX_Resource_VK rc = NVSDK_NGX_Create_ImageView_Resource_VK(col.view, col.img, rng(VK_IMAGE_ASPECT_COLOR_BIT), col.fmt, rw, rh, false);
          NVSDK_NGX_Resource_VK rd = NVSDK_NGX_Create_ImageView_Resource_VK(dep.view, dep.img, rng(VK_IMAGE_ASPECT_DEPTH_BIT), dep.fmt, rw, rh, false);
          NVSDK_NGX_Resource_VK rm = NVSDK_NGX_Create_ImageView_Resource_VK(mv.view, mv.img, rng(VK_IMAGE_ASPECT_COLOR_BIT), mv.fmt, rw, rh, false);
          NVSDK_NGX_Resource_VK ro = NVSDK_NGX_Create_ImageView_Resource_VK(out.view, out.img, rng(VK_IMAGE_ASPECT_COLOR_BIT), out.fmt, TW, TH, true);
          NVSDK_NGX_VK_DLSS_Eval_Params ev{}; ev.Feature.pInColor = &rc; ev.Feature.pInOutput = &ro; ev.pInDepth = &rd; ev.pInMotionVectors = &rm; ev.InJitterOffsetX = jx; ev.InJitterOffsetY = jy;
          ev.InRenderSubrectDimensions = { rw, rh }; ev.InReset = f == 0 ? 1 : 0; ev.InMVScaleX = 1.f; ev.InMVScaleY = 1.f; ev.InFrameTimeDeltaInMsec = 16.6f;
          if (qp) { vkCmdResetQueryPool(cb, qp, 0, 2); vkCmdWriteTimestamp(cb, VK_PIPELINE_STAGE_ALL_COMMANDS_BIT, qp, 0); }
          r = NGX_VULKAN_EVALUATE_DLSS_EXT(cb, feature, params, &ev);
          if (qp) vkCmdWriteTimestamp(cb, VK_PIPELINE_STAGE_ALL_COMMANDS_BIT, qp, 1);
          out.lay = VK_IMAGE_LAYOUT_GENERAL;   // NGX leaves it as asked
          if (!endCmd(cb)) { fail = true; break; }
          if (!NVSDK_NGX_SUCCEED(r)) { L("  evaluate failed -> 0x%x", (unsigned)r); fail = true; break; }
          if (qp && f >= 4) { uint64_t t[2]; if (vkGetQueryPoolResults(C.dev, qp, 0, 2, sizeof t, t, 8, VK_QUERY_RESULT_64_BIT | VK_QUERY_RESULT_WAIT_BIT) == VK_SUCCESS) { tot += (t[1] - t[0]) * C.tsPeriod * 1e-6; cnt++; } }
        }
        if (fail) { summaryDlss = "FAILED while upscaling (see the log)"; break; }
        std::vector<uint8_t> px; if (!readback(out, px)) break; double ps = psnr(px, gt); char nm[64]; snprintf(nm, sizeof nm, "test-dlss-sign%d.png", sv); writePng(P(nm), TW, TH, px.data());
        L("  jitter signs (x%+d, y%+d): PSNR %.2f dB   (DLSS time %.3f ms per frame)", sx, sy, ps, cnt ? tot / cnt : 0.0);
        if (ps > bestPsnr) { bestPsnr = ps; bestSign = sv; msPerFrame = cnt ? tot / cnt : 0; }
      }
      if (bestSign >= 0) {
        summaryDlss = "WORKS. Best result with jitter signs (x%+d, y%+d)";
        char b[160]; snprintf(b, sizeof b, "WORKS (%.2f dB vs %.2f dB for plain bilinear; DLSS %.2f ms per frame; the renderer should apply the jitter as (x%+d, y%+d))", bestPsnr, psnrBil, msPerFrame, jitterSigns[bestSign][0], jitterSigns[bestSign][1]); summaryDlss = b;
      }
      NVSDK_NGX_VULKAN_ReleaseFeature(feature);
    }
    if (params) NVSDK_NGX_VULKAN_DestroyParameters(params);
  }
  if (capParams && false) NVSDK_NGX_VULKAN_DestroyParameters(capParams);
  if (ngxUp) { vkDeviceWaitIdle(C.dev); NVSDK_NGX_VULKAN_Shutdown1(C.dev); }
#endif

  L("");
  L("================ SUMMARY ================");
  L("Graphics card : %s (driver 0x%x)", DV.pr.deviceName, DV.pr.driverVersion);
  L("Ray tracing   : %s", summaryRt.c_str());
  L("DLSS          : %s", summaryDlss.c_str());
  L("Picture test  : bilinear %.2f dB", psnrBil);
  L("Files written to: %s", gOut.c_str());
  if (qp) vkDestroyQueryPool(C.dev, qp, nullptr);
  freeBuf(stC); freeBuf(stD); freeImg(col); freeImg(dep); freeImg(mv); freeImg(out);
  vkDestroyCommandPool(C.dev, C.pool, nullptr); vkDestroyDevice(C.dev, nullptr); vkDestroyInstance(C.inst, nullptr);
  if (gLog) fclose(gLog);
  return 0;
}
