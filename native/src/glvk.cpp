#include "glvk.h"
#include <algorithm>
#include <cmath>
#include <set>
#include <tuple>
#include <chrono>
#include <functional>
#include <memory>
#include <array>
#include "dlss.h"
#include "present.h"

// ---------------------------------------------------------------- GL constants we care about
enum : int {
  GL_ARRAY_BUFFER = 0x8892, GL_TEXTURE_2D = 0x0DE1, GL_TEXTURE_2D_ARRAY = 0x8C1A, GL_TEXTURE_3D = 0x806F,
  GL_FRAMEBUFFER = 0x8D40, GL_READ_FRAMEBUFFER = 0x8CA8, GL_DRAW_FRAMEBUFFER = 0x8CA9, GL_RENDERBUFFER = 0x8D41,
  GL_RGBA8 = 0x8058, GL_RGBA = 0x1908, GL_R8 = 0x8229, GL_RED = 0x1903, GL_DEPTH_COMPONENT24 = 0x81A6, GL_DEPTH_COMPONENT = 0x1902, GL_DEPTH_COMPONENT32F = 0x8CAC,
  GL_UNSIGNED_BYTE = 0x1401,
  GL_TEXTURE_MIN_FILTER = 0x2801, GL_TEXTURE_MAG_FILTER = 0x2800, GL_TEXTURE_WRAP_S = 0x2802, GL_TEXTURE_WRAP_T = 0x2803, GL_TEXTURE_WRAP_R = 0x8072, GL_TEXTURE_MAX_ANISOTROPY = 0x84FE,
  GL_NEAREST = 0x2600, GL_LINEAR = 0x2601, GL_NEAREST_MIPMAP_NEAREST = 0x2700, GL_LINEAR_MIPMAP_NEAREST = 0x2701, GL_NEAREST_MIPMAP_LINEAR = 0x2702, GL_LINEAR_MIPMAP_LINEAR = 0x2703,
  GL_REPEAT = 0x2901, GL_CLAMP_TO_EDGE = 0x812F, GL_MIRRORED_REPEAT = 0x8370,
  GL_BLEND = 0x0BE2, GL_DEPTH_TEST = 0x0B71, GL_CULL_FACE = 0x0B44, GL_POLYGON_OFFSET_FILL = 0x8037,
  GL_STREAM_DRAW = 0x88E0, GL_DYNAMIC_DRAW = 0x88E8,
  GL_COLOR_ATTACHMENT0 = 0x8CE0, GL_DEPTH_ATTACHMENT = 0x8D00, GL_COLOR_BUFFER_BIT = 0x4000, GL_DEPTH_BUFFER_BIT = 0x100,
  GL_TRIANGLES = 4, GL_TRIANGLE_STRIP = 5, GL_VERTEX_SHADER = 35633, GL_FRAGMENT_SHADER = 35632
};

static uint64_t fnv64(const std::string& s) { uint64_t h = 0xcbf29ce484222325ull; for (unsigned char c : s) { h ^= c; h *= 0x100000001b3ull; } return h; }

// ---------------------------------------------------------------- environment
bool vkEnvInit(VkEnv& e, int devIdx, std::string& err, const EnvOpts* o) {
  EnvOpts op; if (o) op = *o;
  if (!vkmLoadLoader(err)) return false;
  if (op.dlss) dlssPrepare(op.exeDir, op.dataDir);
  // instance extensions: window output + whatever NGX asks for (only those the loader really offers)
  uint32_t nie = 0; vkEnumerateInstanceExtensionProperties(nullptr, &nie, nullptr); std::vector<VkExtensionProperties> ie(nie); vkEnumerateInstanceExtensionProperties(nullptr, &nie, ie.data());
  std::set<std::string> iHave; for (auto& x : ie) iHave.insert(x.extensionName);
  std::vector<std::string> iWant; if (op.present) { iWant.push_back("VK_KHR_surface"); iWant.push_back("VK_KHR_win32_surface"); } if (op.dlss) dlssInstanceExtensions(iWant);
  std::vector<std::string> iUse; for (auto& s : iWant) if (iHave.count(s) && std::find(iUse.begin(), iUse.end(), s) == iUse.end()) iUse.push_back(s);
  std::vector<const char*> iPtr; for (auto& s : iUse) iPtr.push_back(s.c_str());
  e.canPresent = op.present && std::find(iUse.begin(), iUse.end(), "VK_KHR_win32_surface") != iUse.end();
  VkApplicationInfo app{ VK_STRUCTURE_TYPE_APPLICATION_INFO }; app.pApplicationName = "Arberia Deathmatch"; app.apiVersion = VK_API_VERSION_1_3;
  VkInstanceCreateInfo ici{ VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO }; ici.pApplicationInfo = &app; ici.enabledExtensionCount = (uint32_t)iPtr.size(); ici.ppEnabledExtensionNames = iPtr.data();
  VkResult r = vkCreateInstance(&ici, nullptr, &e.inst); if (r != VK_SUCCESS) { err = std::string("vkCreateInstance: ") + vkResultName(r); return false; }
  vkmLoadInstance(e.inst);
  uint32_t nd = 0; vkEnumeratePhysicalDevices(e.inst, &nd, nullptr); std::vector<VkPhysicalDevice> pds(nd); vkEnumeratePhysicalDevices(e.inst, &nd, pds.data());
  if (!nd) { err = "no Vulkan device"; return false; }
  int pick = devIdx, best = -1;
  if (pick < 0 || pick >= (int)nd) for (uint32_t i = 0; i < nd; i++) { VkPhysicalDeviceProperties p; vkGetPhysicalDeviceProperties(pds[i], &p); int s = (p.vendorID == 0x10de ? 10 : 0) + (p.deviceType == VK_PHYSICAL_DEVICE_TYPE_DISCRETE_GPU ? 5 : 0) + (p.apiVersion >= VK_API_VERSION_1_3 ? 20 : 0); if (s > best) { best = s; pick = (int)i; } }
  e.pd = pds[pick]; VkPhysicalDeviceProperties pr; vkGetPhysicalDeviceProperties(e.pd, &pr); e.name = pr.deviceName; e.lim = pr.limits; e.nvidia = pr.vendorID == 0x10de;
  if (pr.apiVersion < VK_API_VERSION_1_3) { err = std::string(pr.deviceName) + " does not support Vulkan 1.3"; return false; }
  vkGetPhysicalDeviceMemoryProperties(e.pd, &e.mp);
  uint32_t nq = 0; vkGetPhysicalDeviceQueueFamilyProperties(e.pd, &nq, nullptr); std::vector<VkQueueFamilyProperties> qf(nq); vkGetPhysicalDeviceQueueFamilyProperties(e.pd, &nq, qf.data());
  e.qf = UINT32_MAX; for (uint32_t i = 0; i < nq; i++) if ((qf[i].queueFlags & (VK_QUEUE_GRAPHICS_BIT | VK_QUEUE_COMPUTE_BIT | VK_QUEUE_TRANSFER_BIT)) == (VK_QUEUE_GRAPHICS_BIT | VK_QUEUE_COMPUTE_BIT | VK_QUEUE_TRANSFER_BIT)) { e.qf = i; break; }
  if (e.qf == UINT32_MAX) { err = "no graphics queue"; return false; }
  uint32_t nde = 0; vkEnumerateDeviceExtensionProperties(e.pd, nullptr, &nde, nullptr); std::vector<VkExtensionProperties> de(nde); vkEnumerateDeviceExtensionProperties(e.pd, nullptr, &nde, de.data());
  std::set<std::string> dHave; for (auto& x : de) dHave.insert(x.extensionName);
  // features offered by the card
  VkPhysicalDeviceAccelerationStructureFeaturesKHR asq{ VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_ACCELERATION_STRUCTURE_FEATURES_KHR }; VkPhysicalDeviceRayQueryFeaturesKHR rqq{ VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_RAY_QUERY_FEATURES_KHR };
  VkPhysicalDeviceVulkan12Features q12{ VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_VULKAN_1_2_FEATURES }; q12.pNext = &asq; asq.pNext = &rqq;
  VkPhysicalDeviceFeatures2 f2{ VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_FEATURES_2 }; f2.pNext = &q12; vkGetPhysicalDeviceFeatures2(e.pd, &f2); e.aniso = f2.features.samplerAnisotropy;
  e.rtOk = op.rt && dHave.count("VK_KHR_acceleration_structure") && dHave.count("VK_KHR_ray_query") && dHave.count("VK_KHR_deferred_host_operations") && asq.accelerationStructure && rqq.rayQuery && q12.bufferDeviceAddress;
  std::vector<std::string> dWant; if (e.canPresent) dWant.push_back("VK_KHR_swapchain"); if (op.dlss) dlssDeviceExtensions(e.inst, e.pd, dWant);
  if (e.rtOk) { dWant.push_back("VK_KHR_acceleration_structure"); dWant.push_back("VK_KHR_ray_query"); dWant.push_back("VK_KHR_deferred_host_operations"); }
  std::vector<std::string> dUse; for (auto& s : dWant) if (dHave.count(s) && std::find(dUse.begin(), dUse.end(), s) == dUse.end()) dUse.push_back(s);
  if (e.canPresent && std::find(dUse.begin(), dUse.end(), "VK_KHR_swapchain") == dUse.end()) e.canPresent = false;
  std::vector<const char*> dPtr; for (auto& s : dUse) dPtr.push_back(s.c_str());
  VkPhysicalDeviceAccelerationStructureFeaturesKHR asf{ VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_ACCELERATION_STRUCTURE_FEATURES_KHR }; asf.accelerationStructure = VK_TRUE;
  VkPhysicalDeviceRayQueryFeaturesKHR rqf{ VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_RAY_QUERY_FEATURES_KHR }; rqf.rayQuery = VK_TRUE; rqf.pNext = &asf;
  VkPhysicalDeviceVulkan12Features f12{ VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_VULKAN_1_2_FEATURES }; f12.bufferDeviceAddress = q12.bufferDeviceAddress ? VK_TRUE : VK_FALSE; f12.pNext = e.rtOk ? (void*)&rqf : nullptr;
  VkPhysicalDeviceVulkan13Features f13{ VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_VULKAN_1_3_FEATURES }; f13.dynamicRendering = VK_TRUE; f13.pNext = &f12;
  VkPhysicalDeviceFeatures2 en{ VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_FEATURES_2 }; en.pNext = &f13; en.features.samplerAnisotropy = e.aniso ? VK_TRUE : VK_FALSE;
  float prio = 1.f; VkDeviceQueueCreateInfo qci{ VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO }; qci.queueFamilyIndex = e.qf; qci.queueCount = 1; qci.pQueuePriorities = &prio;
  VkDeviceCreateInfo dci{ VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO }; dci.pNext = &en; dci.queueCreateInfoCount = 1; dci.pQueueCreateInfos = &qci; dci.enabledExtensionCount = (uint32_t)dPtr.size(); dci.ppEnabledExtensionNames = dPtr.data();
  r = vkCreateDevice(e.pd, &dci, nullptr, &e.dev); if (r != VK_SUCCESS) { err = std::string("vkCreateDevice: ") + vkResultName(r); return false; }
  vkmLoadDevice(e.inst, e.dev, e.rtOk); vkGetDeviceQueue(e.dev, e.qf, 0, &e.q);
  if (op.dlss) e.dlssOk = dlssInit(e, e.dlssNote); else e.dlssNote = "off";
  return true;
}
void vkEnvShutdown(VkEnv& e) { dlssShutdown(e); if (e.dev) { vkDeviceWaitIdle(e.dev); vkDestroyDevice(e.dev, nullptr); } if (e.inst) vkDestroyInstance(e.inst, nullptr); e = VkEnv(); }

// ---------------------------------------------------------------- objects
struct UMember { std::string name; int type; int arr; uint32_t off; };
struct USamp { std::string name; int stype; int binding; };
struct UAttr { std::string name; int loc; int comps; };
struct PackProg {
  uint64_t key = 0; uint32_t uboSize = 0; std::vector<UMember> mem; std::vector<USamp> samp; std::vector<UAttr> attr; std::vector<uint32_t> vs, fs;
  VkShaderModule vsm = nullptr, fsm = nullptr; VkDescriptorSetLayout dsl = nullptr; VkPipelineLayout pl = nullptr;
  std::vector<uint32_t> fsRT; int rtBind = -1; VkShaderModule fsmRT = nullptr; VkDescriptorSetLayout dslRT = nullptr; VkPipelineLayout plRT = nullptr;   // the same program with the shadow function done by ray queries
};
struct Tex {
  std::shared_ptr<Tex> mv;
  VkImage img = nullptr; VkDeviceMemory mem = nullptr; VkImageView view = nullptr, att = nullptr; VkFormat fmt = VK_FORMAT_UNDEFINED;
  uint32_t w = 0, h = 0, d = 1, levels = 1; int target = 0; bool depth = false, rb = false, inited = false, is3d = false; VkImageLayout lay = VK_IMAGE_LAYOUT_UNDEFINED;
  int minF = GL_NEAREST_MIPMAP_LINEAR, magF = GL_LINEAR, wS = GL_REPEAT, wT = GL_REPEAT, wR = GL_REPEAT; float aniso = 1;
};
struct GBuf { VkBuffer b = nullptr; VkDeviceMemory m = nullptr; void* map = nullptr; VkDeviceSize off = 0, size = 0; bool dedicated = false; uint64_t frame = 0; uint64_t gen = 0; };
struct VAttr { bool en = false; int size = 4; int stride = 0; uint32_t off = 0; uint32_t buf = 0; int div = 0; };
struct Vao { VAttr a[16]; };
struct Prog { std::vector<std::array<float, 8>> camNow, camOld; uint64_t camFrame = 0; uint32_t id = 0; PackProg* pk = nullptr; std::vector<uint8_t> ubo; std::map<std::string, int> unit; std::map<std::string, int> glLoc; std::vector<uint32_t> sh; };
struct Shader { int type = 0; std::string src; };
struct Fb { uint32_t color = 0, depth = 0; };
struct Arena { VkBuffer b = nullptr; VkDeviceMemory m = nullptr; uint8_t* p = nullptr; VkDeviceSize size = 0, used = 0; };
struct ArenaPtr { VkBuffer b; VkDeviceSize off; uint8_t* p; };

struct GlVk {
  VkEnv* E = nullptr; std::string err; bool failed = false;
  std::vector<std::string> names; std::vector<int> nameId;
  std::unordered_map<uint64_t, PackProg> pack;
  VkCommandPool pool = nullptr; VkCommandBuffer cb = nullptr; bool recording = false;
  std::vector<Arena> arenas; size_t arenaCur = 0;
  std::vector<VkDescriptorPool> dpools; size_t dpCur = 0; uint32_t dpSets = 0;
  std::vector<std::function<void()>> grave; uint64_t frameNo = 1;
  // gl state
  std::unordered_map<uint32_t, GBuf> bufs; std::unordered_map<uint32_t, Tex> texs; std::unordered_map<uint32_t, Fb> fbs; std::unordered_map<uint32_t, Vao> vaos;
  std::unordered_map<uint32_t, Shader> shaders; std::unordered_map<uint32_t, Prog> progs; std::unordered_map<uint32_t, std::pair<uint32_t, std::string>> locs;
  uint32_t boundArray = 0, curProg = 0, curVao = 0, readFb = 0, drawFb = 0; int activeUnit = 0; uint32_t unitTex[16][3] = {};
  bool blend = false, depthTest = false, polyOff = false, cull = false; int bSrc = 1, bDst = 0, dFunc = 0x201; bool dMask = true; float poF = 0, poU = 0;
  int vpX = 0, vpY = 0, vpW = 0, vpH = 0; float clr[4] = { 0, 0, 0, 0 }; double clrD = 1;
  Presenter* pres = nullptr; VkSemaphore semAcq = nullptr, semDone = nullptr; bool presClear = false;
  bool wantDlss = false, dlFailed = false, dlReset = true; int dlQ = 2, dlQc = -1; DlssCtx* dl = nullptr; uint32_t dlRw = 0, dlRh = 0, dlOw = 0, dlOh = 0; float jxPx = 0, jyPx = 0; std::string dlErr; double dtMs = 16.6; std::chrono::steady_clock::time_point lastEnd{};
  bool rgbOut = false; GBuf rbBuf; Tex screen; Tex dummy[3]; bool dummyInit = false; GBuf dummyVB; std::map<std::string, VkPipeline> pipes; std::map<uint64_t, VkSampler> samplers;
  // rendering
  bool rendering = false; Tex* rColor = nullptr; Tex* rDepth = nullptr; Tex* rMV = nullptr; bool wantMV = false, doJitter = false; std::string dumpMV;

  // ray tracing (shadows from the static world)
  struct RtBlas { uint64_t gen = 0; VkAccelerationStructureKHR as = nullptr; GBuf buf; VkDeviceAddress addr = 0; };
  struct RtPend { uint64_t gen; uint32_t first, count, off, stride; VkDeviceAddress va; };
  uint64_t bufGen = 0; std::vector<RtBlas> rtB; std::set<std::tuple<uint64_t, uint32_t, uint32_t, uint32_t>> rtKeys; std::vector<RtPend> rtPend; std::set<uint64_t> rtDead;
  VkAccelerationStructureKHR rtTlas = nullptr; GBuf rtTlasBuf, rtInst, rtScratch; VkDeviceSize rtScratchSz = 0; bool rtDirty = false, rtReady = false, wantRt = false, rtFailed = false; std::string rtErr; uint64_t rtTris = 0;
  // dynamic occluders: every frame the game draws the characters' (and props') triangles with a program that has a "uRtOcc" uniform. Nothing is drawn; the triangles are collected here and become a small bottom level structure that is rebuilt each frame and added to the top level one.
  std::vector<float> rtDynCpu; bool rtDynOn = false; uint64_t rtDynFrame = 0; RtBlas rtDynB; GBuf rtDynBuf;
  bool rtDynPending() { return (!rtDynCpu.empty() && rtDynFrame != frameNo) || (rtDynCpu.empty() && rtDynOn); }

  // ------------------------------------------------------------ helpers
  void fail(const std::string& m) { if (!failed) { failed = true; err = m; } fprintf(stderr, "arb-rt: %s\n", m.c_str()); }
  uint32_t memType(uint32_t bits, VkMemoryPropertyFlags want) {
    for (uint32_t i = 0; i < E->mp.memoryTypeCount; i++) if ((bits & (1u << i)) && (E->mp.memoryTypes[i].propertyFlags & want) == want) return i;
    return UINT32_MAX;
  }
  bool mkBuffer(GBuf& g, VkDeviceSize size, VkBufferUsageFlags use, bool cached = false) {
    VkBufferCreateInfo bi{ VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO }; bi.size = std::max<VkDeviceSize>(size, 16); bi.usage = use; bi.sharingMode = VK_SHARING_MODE_EXCLUSIVE;
    if (vkCreateBuffer(E->dev, &bi, nullptr, &g.b) != VK_SUCCESS) return false;
    VkMemoryRequirements mr; vkGetBufferMemoryRequirements(E->dev, g.b, &mr);
    uint32_t mt = cached ? memType(mr.memoryTypeBits, VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT | VK_MEMORY_PROPERTY_HOST_CACHED_BIT) : UINT32_MAX; // cached memory: reading back from write-combined memory is extremely slow
    if (mt == UINT32_MAX) mt = memType(mr.memoryTypeBits, VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT | VK_MEMORY_PROPERTY_HOST_COHERENT_BIT); if (mt == UINT32_MAX) return false;
    VkMemoryAllocateInfo ai{ VK_STRUCTURE_TYPE_MEMORY_ALLOCATE_INFO }; ai.allocationSize = mr.size; ai.memoryTypeIndex = mt;
    VkMemoryAllocateFlagsInfo fi{ VK_STRUCTURE_TYPE_MEMORY_ALLOCATE_FLAGS_INFO }; if (use & VK_BUFFER_USAGE_SHADER_DEVICE_ADDRESS_BIT) { fi.flags = VK_MEMORY_ALLOCATE_DEVICE_ADDRESS_BIT; ai.pNext = &fi; }
    if (vkAllocateMemory(E->dev, &ai, nullptr, &g.m) != VK_SUCCESS) return false;
    vkBindBufferMemory(E->dev, g.b, g.m, 0); if (vkMapMemory(E->dev, g.m, 0, VK_WHOLE_SIZE, 0, &g.map) != VK_SUCCESS) return false;
    g.size = size; g.dedicated = true; g.gen = ++bufGen; return true;
  }
  bool mkDevBuffer(GBuf& g, VkDeviceSize size, VkBufferUsageFlags use) {   // video memory, not mapped (acceleration structures, scratch)
    VkBufferCreateInfo bi{ VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO }; bi.size = std::max<VkDeviceSize>(size, 256); bi.usage = use | VK_BUFFER_USAGE_SHADER_DEVICE_ADDRESS_BIT; bi.sharingMode = VK_SHARING_MODE_EXCLUSIVE;
    if (vkCreateBuffer(E->dev, &bi, nullptr, &g.b) != VK_SUCCESS) return false;
    VkMemoryRequirements mr; vkGetBufferMemoryRequirements(E->dev, g.b, &mr); uint32_t mt = memType(mr.memoryTypeBits, VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT); if (mt == UINT32_MAX) return false;
    VkMemoryAllocateFlagsInfo fi{ VK_STRUCTURE_TYPE_MEMORY_ALLOCATE_FLAGS_INFO }; fi.flags = VK_MEMORY_ALLOCATE_DEVICE_ADDRESS_BIT;
    VkMemoryAllocateInfo ai{ VK_STRUCTURE_TYPE_MEMORY_ALLOCATE_INFO }; ai.pNext = &fi; ai.allocationSize = mr.size; ai.memoryTypeIndex = mt;
    if (vkAllocateMemory(E->dev, &ai, nullptr, &g.m) != VK_SUCCESS) return false; vkBindBufferMemory(E->dev, g.b, g.m, 0);
    g.size = size; g.dedicated = true; g.gen = ++bufGen; return true;
  }
  void killBuf(GBuf g) { if (!g.dedicated) return; if (g.gen && (!rtB.empty() || !rtPend.empty())) { bool hit = false; for (auto& b : rtB) if (b.gen == g.gen) { hit = true; break; } if (!hit) for (auto& p : rtPend) if (p.gen == g.gen) { hit = true; break; } if (hit) { rtDead.insert(g.gen); rtDirty = true; } } VkDevice d = E->dev; grave.push_back([=]() { if (g.map) vkUnmapMemory(d, g.m); vkDestroyBuffer(d, g.b, nullptr); vkFreeMemory(d, g.m, nullptr); }); }
  ArenaPtr arena(VkDeviceSize size, VkDeviceSize align = 16) {
    for (;;) {
      if (arenaCur < arenas.size()) {
        Arena& a = arenas[arenaCur]; VkDeviceSize o = (a.used + align - 1) & ~(align - 1);
        if (o + size <= a.size) { a.used = o + size; return { a.b, o, a.p + o }; }
        arenaCur++; continue;
      }
      Arena a; VkDeviceSize sz = std::max<VkDeviceSize>(64ull << 20, size + 4096); GBuf g;
      if (!mkBuffer(g, sz, VK_BUFFER_USAGE_VERTEX_BUFFER_BIT | VK_BUFFER_USAGE_UNIFORM_BUFFER_BIT | VK_BUFFER_USAGE_TRANSFER_SRC_BIT)) { fail("out of memory for the upload arena"); static uint8_t junk[16]; return { nullptr, 0, junk }; }
      a.b = g.b; a.m = g.m; a.p = (uint8_t*)g.map; a.size = sz; a.used = 0; arenas.push_back(a);
    }
  }
  VkCommandBuffer cmd() {
    if (!recording) {
      if (!cb) { VkCommandBufferAllocateInfo ai{ VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO }; ai.commandPool = pool; ai.level = VK_COMMAND_BUFFER_LEVEL_PRIMARY; ai.commandBufferCount = 1; vkAllocateCommandBuffers(E->dev, &ai, &cb); }
      vkResetCommandBuffer(cb, 0); VkCommandBufferBeginInfo bi{ VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO }; bi.flags = VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT; vkBeginCommandBuffer(cb, &bi); recording = true;
    }
    return cb;
  }
  // ------------------------------------------------------------ images
  void trans(Tex& t, VkImageLayout nl) {
    if (t.lay == nl) return; if (rendering) endRender();
    VkImageMemoryBarrier b{ VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER }; b.oldLayout = t.lay; b.newLayout = nl; b.srcQueueFamilyIndex = b.dstQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED; b.image = t.img;
    b.subresourceRange = { t.depth ? (VkImageAspectFlags)VK_IMAGE_ASPECT_DEPTH_BIT : (VkImageAspectFlags)VK_IMAGE_ASPECT_COLOR_BIT, 0, VK_REMAINING_MIP_LEVELS, 0, VK_REMAINING_ARRAY_LAYERS };
    b.srcAccessMask = VK_ACCESS_MEMORY_READ_BIT | VK_ACCESS_MEMORY_WRITE_BIT; b.dstAccessMask = VK_ACCESS_MEMORY_READ_BIT | VK_ACCESS_MEMORY_WRITE_BIT;
    vkCmdPipelineBarrier(cmd(), VK_PIPELINE_STAGE_ALL_COMMANDS_BIT, VK_PIPELINE_STAGE_ALL_COMMANDS_BIT, 0, 0, nullptr, 0, nullptr, 1, &b); t.lay = nl;
  }
  void killTex(Tex& t) {
    if (t.mv) { killTex(*t.mv); t.mv.reset(); }
    VkDevice d = E->dev; VkImage i = t.img; VkDeviceMemory m = t.mem; VkImageView v = t.view, a = t.att;
    if (i) grave.push_back([=]() { if (a && a != v) vkDestroyImageView(d, a, nullptr); if (v) vkDestroyImageView(d, v, nullptr); vkDestroyImage(d, i, nullptr); vkFreeMemory(d, m, nullptr); });
    t.img = nullptr; t.mem = nullptr; t.view = t.att = nullptr; t.lay = VK_IMAGE_LAYOUT_UNDEFINED; t.inited = false;
  }
  bool mkImage(Tex& t, VkFormat fmt, uint32_t w, uint32_t h, uint32_t d, uint32_t levels, int target, bool depth, bool attach, bool storage = false) {
    killTex(t); t.fmt = fmt; t.w = w; t.h = h; t.d = d; t.levels = levels; t.target = target; t.depth = depth; t.is3d = target == GL_TEXTURE_3D;
    VkImageCreateInfo ci{ VK_STRUCTURE_TYPE_IMAGE_CREATE_INFO }; ci.imageType = t.is3d ? VK_IMAGE_TYPE_3D : VK_IMAGE_TYPE_2D; ci.format = fmt; ci.extent = { w, h, t.is3d ? d : 1 };
    ci.mipLevels = levels; ci.arrayLayers = (target == GL_TEXTURE_2D_ARRAY) ? d : 1; ci.samples = VK_SAMPLE_COUNT_1_BIT; ci.tiling = VK_IMAGE_TILING_OPTIMAL;
    ci.usage = VK_IMAGE_USAGE_SAMPLED_BIT | VK_IMAGE_USAGE_TRANSFER_SRC_BIT | VK_IMAGE_USAGE_TRANSFER_DST_BIT; if (attach) ci.usage |= depth ? VK_IMAGE_USAGE_DEPTH_STENCIL_ATTACHMENT_BIT : VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT; if (storage) ci.usage |= VK_IMAGE_USAGE_STORAGE_BIT;
    ci.sharingMode = VK_SHARING_MODE_EXCLUSIVE; ci.initialLayout = VK_IMAGE_LAYOUT_UNDEFINED;
    if (vkCreateImage(E->dev, &ci, nullptr, &t.img) != VK_SUCCESS) { fail("vkCreateImage failed"); return false; }
    VkMemoryRequirements mr; vkGetImageMemoryRequirements(E->dev, t.img, &mr); uint32_t mt = memType(mr.memoryTypeBits, VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT); if (mt == UINT32_MAX) { fail("no image memory"); return false; }
    VkMemoryAllocateInfo ai{ VK_STRUCTURE_TYPE_MEMORY_ALLOCATE_INFO }; ai.allocationSize = mr.size; ai.memoryTypeIndex = mt;
    if (vkAllocateMemory(E->dev, &ai, nullptr, &t.mem) != VK_SUCCESS) { fail("out of video memory"); return false; } vkBindImageMemory(E->dev, t.img, t.mem, 0);
    VkImageViewCreateInfo vi{ VK_STRUCTURE_TYPE_IMAGE_VIEW_CREATE_INFO }; vi.image = t.img; vi.format = fmt;
    vi.viewType = t.is3d ? VK_IMAGE_VIEW_TYPE_3D : (target == GL_TEXTURE_2D_ARRAY ? VK_IMAGE_VIEW_TYPE_2D_ARRAY : VK_IMAGE_VIEW_TYPE_2D);
    vi.subresourceRange = { depth ? (VkImageAspectFlags)VK_IMAGE_ASPECT_DEPTH_BIT : (VkImageAspectFlags)VK_IMAGE_ASPECT_COLOR_BIT, 0, levels, 0, target == GL_TEXTURE_2D_ARRAY ? d : 1 };
    if (vkCreateImageView(E->dev, &vi, nullptr, &t.view) != VK_SUCCESS) { fail("vkCreateImageView failed"); return false; }
    if (attach && target != GL_TEXTURE_2D_ARRAY && !t.is3d) {
      VkImageViewCreateInfo av = vi; av.viewType = VK_IMAGE_VIEW_TYPE_2D; av.subresourceRange.levelCount = 1; av.subresourceRange.layerCount = 1;
      if (vkCreateImageView(E->dev, &av, nullptr, &t.att) != VK_SUCCESS) { fail("attachment view failed"); return false; }
    }
    return true;
  }
  static VkFormat fmtOf(int ifmt, bool& depth) {
    depth = false;
    switch (ifmt) { case GL_RGBA8: case GL_RGBA: return VK_FORMAT_R8G8B8A8_UNORM; case GL_R8: case GL_RED: return VK_FORMAT_R8_UNORM;
      case GL_DEPTH_COMPONENT24: case GL_DEPTH_COMPONENT: case GL_DEPTH_COMPONENT32F: depth = true; return VK_FORMAT_D32_SFLOAT; default: return VK_FORMAT_UNDEFINED; }
  }
  static uint32_t mipCount(uint32_t w, uint32_t h) { uint32_t n = 1; while ((w | h) > 1) { w = std::max(1u, w >> 1); h = std::max(1u, h >> 1); n++; } return n; }
  void upload(Tex& t, uint32_t level, int x, int y, int z, int w, int h, int d, int format, const uint8_t* data, size_t len) {
    int bpp = (format == GL_RED) ? 1 : 4; size_t need = (size_t)w * h * d * bpp;
    if (len < need) { fail("texture upload: pixel data is too small"); return; }
    ArenaPtr a = arena(need, 16); memcpy(a.p, data, need);
    trans(t, VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL);
    VkBufferImageCopy r{}; r.bufferOffset = a.off; r.imageSubresource = { VK_IMAGE_ASPECT_COLOR_BIT, level, 0, 1 };
    if (t.is3d) { r.imageOffset = { x, y, z }; r.imageExtent = { (uint32_t)w, (uint32_t)h, (uint32_t)d }; }
    else { r.imageOffset = { x, y, 0 }; r.imageExtent = { (uint32_t)w, (uint32_t)h, 1 }; if (t.target == GL_TEXTURE_2D_ARRAY) { r.imageSubresource.baseArrayLayer = z; r.imageSubresource.layerCount = d; } }
    vkCmdCopyBufferToImage(cmd(), a.b, t.img, VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL, 1, &r); t.inited = true;
  }
  void genMips(Tex& t) {
    if (t.levels < 2 || t.depth) return; if (rendering) endRender();
    trans(t, VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL);
    uint32_t layers = t.target == GL_TEXTURE_2D_ARRAY ? t.d : 1; int32_t mw = t.w, mh = t.h;
    for (uint32_t i = 1; i < t.levels; i++) {
      VkImageMemoryBarrier b{ VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER }; b.oldLayout = VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL; b.newLayout = VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL; b.srcQueueFamilyIndex = b.dstQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;
      b.image = t.img; b.subresourceRange = { VK_IMAGE_ASPECT_COLOR_BIT, i - 1, 1, 0, layers }; b.srcAccessMask = VK_ACCESS_TRANSFER_WRITE_BIT; b.dstAccessMask = VK_ACCESS_TRANSFER_READ_BIT;
      vkCmdPipelineBarrier(cmd(), VK_PIPELINE_STAGE_TRANSFER_BIT, VK_PIPELINE_STAGE_TRANSFER_BIT, 0, 0, nullptr, 0, nullptr, 1, &b);
      int32_t nw = std::max(1, mw / 2), nh = std::max(1, mh / 2);
      VkImageBlit bl{}; bl.srcSubresource = { VK_IMAGE_ASPECT_COLOR_BIT, i - 1, 0, layers }; bl.srcOffsets[1] = { mw, mh, 1 }; bl.dstSubresource = { VK_IMAGE_ASPECT_COLOR_BIT, i, 0, layers }; bl.dstOffsets[1] = { nw, nh, 1 };
      vkCmdBlitImage(cmd(), t.img, VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL, t.img, VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL, 1, &bl, VK_FILTER_LINEAR); mw = nw; mh = nh;
    }
    // levels 0..n-2 are SRC, level n-1 is DST: make everything SRC then let trans() do the final move
    VkImageMemoryBarrier b{ VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER }; b.oldLayout = VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL; b.newLayout = VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL; b.srcQueueFamilyIndex = b.dstQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED;
    b.image = t.img; b.subresourceRange = { VK_IMAGE_ASPECT_COLOR_BIT, t.levels - 1, 1, 0, layers }; b.srcAccessMask = VK_ACCESS_TRANSFER_WRITE_BIT; b.dstAccessMask = VK_ACCESS_TRANSFER_READ_BIT;
    vkCmdPipelineBarrier(cmd(), VK_PIPELINE_STAGE_TRANSFER_BIT, VK_PIPELINE_STAGE_TRANSFER_BIT, 0, 0, nullptr, 0, nullptr, 1, &b);
    t.lay = VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL; t.inited = true;
  }
  void initDummies() {
    if (dummyInit) return; dummyInit = true; const int tg[3] = { GL_TEXTURE_2D, GL_TEXTURE_2D_ARRAY, GL_TEXTURE_3D };
    for (int i = 0; i < 3; i++) { mkImage(dummy[i], VK_FORMAT_R8G8B8A8_UNORM, 1, 1, 1, 1, tg[i], false, false); const uint8_t px[4] = { 0, 0, 0, 255 }; upload(dummy[i], 0, 0, 0, 0, 1, 1, 1, GL_RGBA, px, 4); trans(dummy[i], VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL); }
    mkBuffer(dummyVB, 16, VK_BUFFER_USAGE_VERTEX_BUFFER_BIT); memset(dummyVB.map, 0, 16);
  }
  VkSampler samplerFor(const Tex& t) {
    auto filt = [](int f) { return (f == GL_NEAREST || f == GL_NEAREST_MIPMAP_NEAREST || f == GL_NEAREST_MIPMAP_LINEAR) ? VK_FILTER_NEAREST : VK_FILTER_LINEAR; };
    auto wrap = [](int w) { return w == GL_CLAMP_TO_EDGE ? VK_SAMPLER_ADDRESS_MODE_CLAMP_TO_EDGE : w == GL_MIRRORED_REPEAT ? VK_SAMPLER_ADDRESS_MODE_MIRRORED_REPEAT : VK_SAMPLER_ADDRESS_MODE_REPEAT; };
    bool mip = t.levels > 1 && (t.minF == GL_NEAREST_MIPMAP_NEAREST || t.minF == GL_LINEAR_MIPMAP_NEAREST || t.minF == GL_NEAREST_MIPMAP_LINEAR || t.minF == GL_LINEAR_MIPMAP_LINEAR);
    bool mlin = t.minF == GL_LINEAR_MIPMAP_LINEAR || t.minF == GL_NEAREST_MIPMAP_LINEAR; bool nearOnly = t.depth;
    int an = (E->aniso && mip) ? (int)std::min(8.f, std::max(1.f, t.aniso)) : 1;
    uint64_t key = (uint64_t)filt(t.minF) | (uint64_t)filt(t.magF) << 1 | (uint64_t)mip << 2 | (uint64_t)mlin << 3 | (uint64_t)wrap(t.wS) << 4 | (uint64_t)wrap(t.wT) << 8 | (uint64_t)wrap(t.wR) << 12 | (uint64_t)an << 16 | (uint64_t)nearOnly << 24;
    auto it = samplers.find(key); if (it != samplers.end()) return it->second;
    VkSamplerCreateInfo si{ VK_STRUCTURE_TYPE_SAMPLER_CREATE_INFO }; si.minFilter = nearOnly ? VK_FILTER_NEAREST : filt(t.minF); si.magFilter = nearOnly ? VK_FILTER_NEAREST : filt(t.magF);
    si.mipmapMode = mlin ? VK_SAMPLER_MIPMAP_MODE_LINEAR : VK_SAMPLER_MIPMAP_MODE_NEAREST; si.addressModeU = wrap(t.wS); si.addressModeV = wrap(t.wT); si.addressModeW = wrap(t.wR);
    si.anisotropyEnable = an > 1; si.maxAnisotropy = (float)an; si.maxLod = mip ? 16.f : 0.25f; si.borderColor = VK_BORDER_COLOR_FLOAT_TRANSPARENT_BLACK;
    VkSampler s = nullptr; vkCreateSampler(E->dev, &si, nullptr, &s); samplers[key] = s; return s;
  }
  // ------------------------------------------------------------ programs
  bool buildProg(PackProg& p) {
    if (p.pl) return true;
    VkShaderModuleCreateInfo mi{ VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO };
    mi.codeSize = p.vs.size() * 4; mi.pCode = p.vs.data(); if (vkCreateShaderModule(E->dev, &mi, nullptr, &p.vsm) != VK_SUCCESS) { fail("vertex shader module"); return false; }
    mi.codeSize = p.fs.size() * 4; mi.pCode = p.fs.data(); if (vkCreateShaderModule(E->dev, &mi, nullptr, &p.fsm) != VK_SUCCESS) { fail("fragment shader module"); return false; }
    std::vector<VkDescriptorSetLayoutBinding> bs; VkDescriptorSetLayoutBinding u{}; u.binding = 0; u.descriptorType = VK_DESCRIPTOR_TYPE_UNIFORM_BUFFER; u.descriptorCount = 1; u.stageFlags = VK_SHADER_STAGE_VERTEX_BIT | VK_SHADER_STAGE_FRAGMENT_BIT; bs.push_back(u);
    for (auto& s : p.samp) { VkDescriptorSetLayoutBinding b{}; b.binding = s.binding; b.descriptorType = VK_DESCRIPTOR_TYPE_COMBINED_IMAGE_SAMPLER; b.descriptorCount = 1; b.stageFlags = VK_SHADER_STAGE_VERTEX_BIT | VK_SHADER_STAGE_FRAGMENT_BIT; bs.push_back(b); }
    VkDescriptorSetLayoutCreateInfo di{ VK_STRUCTURE_TYPE_DESCRIPTOR_SET_LAYOUT_CREATE_INFO }; di.bindingCount = (uint32_t)bs.size(); di.pBindings = bs.data();
    if (vkCreateDescriptorSetLayout(E->dev, &di, nullptr, &p.dsl) != VK_SUCCESS) { fail("descriptor layout"); return false; }
    VkPipelineLayoutCreateInfo li{ VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO }; li.setLayoutCount = 1; li.pSetLayouts = &p.dsl;
    if (vkCreatePipelineLayout(E->dev, &li, nullptr, &p.pl) != VK_SUCCESS) { fail("pipeline layout"); return false; } return true;
  }
  // ------------------------------------------------------------ ray tracing
  bool buildProgRT(PackProg& p) {
    if (p.plRT) return true; if (!buildProg(p)) return false;
    VkShaderModuleCreateInfo mi{ VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO }; mi.codeSize = p.fsRT.size() * 4; mi.pCode = p.fsRT.data();
    if (vkCreateShaderModule(E->dev, &mi, nullptr, &p.fsmRT) != VK_SUCCESS) { rtFailed = true; rtErr = "ray tracing shader module"; return false; }
    std::vector<VkDescriptorSetLayoutBinding> bs; VkDescriptorSetLayoutBinding u{}; u.binding = 0; u.descriptorType = VK_DESCRIPTOR_TYPE_UNIFORM_BUFFER; u.descriptorCount = 1; u.stageFlags = VK_SHADER_STAGE_VERTEX_BIT | VK_SHADER_STAGE_FRAGMENT_BIT; bs.push_back(u);
    for (auto& s : p.samp) { VkDescriptorSetLayoutBinding b{}; b.binding = s.binding; b.descriptorType = VK_DESCRIPTOR_TYPE_COMBINED_IMAGE_SAMPLER; b.descriptorCount = 1; b.stageFlags = VK_SHADER_STAGE_VERTEX_BIT | VK_SHADER_STAGE_FRAGMENT_BIT; bs.push_back(b); }
    { VkDescriptorSetLayoutBinding b{}; b.binding = p.rtBind; b.descriptorType = VK_DESCRIPTOR_TYPE_ACCELERATION_STRUCTURE_KHR; b.descriptorCount = 1; b.stageFlags = VK_SHADER_STAGE_FRAGMENT_BIT; bs.push_back(b); }
    VkDescriptorSetLayoutCreateInfo di{ VK_STRUCTURE_TYPE_DESCRIPTOR_SET_LAYOUT_CREATE_INFO }; di.bindingCount = (uint32_t)bs.size(); di.pBindings = bs.data();
    if (vkCreateDescriptorSetLayout(E->dev, &di, nullptr, &p.dslRT) != VK_SUCCESS) { rtFailed = true; rtErr = "ray tracing descriptor layout"; return false; }
    VkPipelineLayoutCreateInfo li{ VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO }; li.setLayoutCount = 1; li.pSetLayouts = &p.dslRT;
    if (vkCreatePipelineLayout(E->dev, &li, nullptr, &p.plRT) != VK_SUCCESS) { rtFailed = true; rtErr = "ray tracing pipeline layout"; return false; } return true;
  }
  VkDeviceAddress addrOf(VkBuffer b) { VkBufferDeviceAddressInfo ba{ VK_STRUCTURE_TYPE_BUFFER_DEVICE_ADDRESS_INFO }; ba.buffer = b; return vkGetBufferDeviceAddress(E->dev, &ba); }
  void asBarrier(VkPipelineStageFlags dstStage, VkAccessFlags dstAcc) {
    VkMemoryBarrier mb{ VK_STRUCTURE_TYPE_MEMORY_BARRIER }; mb.srcAccessMask = VK_ACCESS_ACCELERATION_STRUCTURE_WRITE_BIT_KHR; mb.dstAccessMask = dstAcc;
    vkCmdPipelineBarrier(cmd(), VK_PIPELINE_STAGE_ACCELERATION_STRUCTURE_BUILD_BIT_KHR, dstStage, 0, 1, &mb, 0, nullptr, 0, nullptr);
  }
  bool rtScratchAddr(VkDeviceSize need, VkDeviceAddress& out) {
    if (!rtScratch.b || rtScratchSz < need + 256) { if (rtScratch.b) killBuf(rtScratch); rtScratch = GBuf(); VkDeviceSize sz = std::max<VkDeviceSize>(need * 2, 16ull << 20) + 256;
      if (!mkDevBuffer(rtScratch, sz, VK_BUFFER_USAGE_STORAGE_BUFFER_BIT)) { rtErr = "out of video memory for the ray tracing scratch"; return false; } rtScratchSz = sz; }
    out = (addrOf(rtScratch.b) + 255) & ~(VkDeviceAddress)255; return true;
  }
  void rtDrop(RtBlas& b) { VkDevice d = E->dev; VkAccelerationStructureKHR as = b.as; grave.push_back([=]() { vkDestroyAccelerationStructureKHR(d, as, nullptr); }); killBuf(b.buf); }
  bool rtBuildBlas(const RtPend& p, RtBlas& b) {
    VkAccelerationStructureGeometryKHR g{ VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_GEOMETRY_KHR }; g.geometryType = VK_GEOMETRY_TYPE_TRIANGLES_KHR; g.flags = VK_GEOMETRY_OPAQUE_BIT_KHR;
    auto& t = g.geometry.triangles; t.sType = VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_GEOMETRY_TRIANGLES_DATA_KHR; t.vertexFormat = VK_FORMAT_R32G32B32_SFLOAT; t.vertexData.deviceAddress = p.va; t.vertexStride = p.stride; t.maxVertex = p.count - 1; t.indexType = VK_INDEX_TYPE_NONE_KHR;
    VkAccelerationStructureBuildGeometryInfoKHR bg{ VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_BUILD_GEOMETRY_INFO_KHR }; bg.type = VK_ACCELERATION_STRUCTURE_TYPE_BOTTOM_LEVEL_KHR; bg.flags = VK_BUILD_ACCELERATION_STRUCTURE_PREFER_FAST_TRACE_BIT_KHR; bg.mode = VK_BUILD_ACCELERATION_STRUCTURE_MODE_BUILD_KHR; bg.geometryCount = 1; bg.pGeometries = &g;
    uint32_t np = p.count / 3; VkAccelerationStructureBuildSizesInfoKHR bs{ VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_BUILD_SIZES_INFO_KHR }; vkGetAccelerationStructureBuildSizesKHR(E->dev, VK_ACCELERATION_STRUCTURE_BUILD_TYPE_DEVICE_KHR, &bg, &np, &bs);
    if (!mkDevBuffer(b.buf, bs.accelerationStructureSize, VK_BUFFER_USAGE_ACCELERATION_STRUCTURE_STORAGE_BIT_KHR)) { rtErr = "out of video memory for ray tracing"; return false; }
    VkAccelerationStructureCreateInfoKHR ci{ VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_CREATE_INFO_KHR }; ci.buffer = b.buf.b; ci.size = bs.accelerationStructureSize; ci.type = VK_ACCELERATION_STRUCTURE_TYPE_BOTTOM_LEVEL_KHR;
    if (vkCreateAccelerationStructureKHR(E->dev, &ci, nullptr, &b.as) != VK_SUCCESS) { rtErr = "could not create a ray tracing structure"; return false; }
    VkDeviceAddress sa = 0; if (!rtScratchAddr(bs.buildScratchSize, sa)) return false;
    bg.dstAccelerationStructure = b.as; bg.scratchData.deviceAddress = sa; VkAccelerationStructureBuildRangeInfoKHR rg{ np, 0, 0, 0 }; const VkAccelerationStructureBuildRangeInfoKHR* pr = &rg;
    vkCmdBuildAccelerationStructuresKHR(cmd(), 1, &bg, &pr); asBarrier(VK_PIPELINE_STAGE_ACCELERATION_STRUCTURE_BUILD_BIT_KHR, VK_ACCESS_ACCELERATION_STRUCTURE_READ_BIT_KHR | VK_ACCESS_ACCELERATION_STRUCTURE_WRITE_BIT_KHR);
    VkAccelerationStructureDeviceAddressInfoKHR da{ VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_DEVICE_ADDRESS_INFO_KHR }; da.accelerationStructure = b.as; b.addr = vkGetAccelerationStructureDeviceAddressKHR(E->dev, &da); b.gen = p.gen; rtTris += np; return true;
  }
  void rtCollectDyn(Prog& P, int first, int count) {   // one draw of the dynamic occluder program: copy its triangles (world space, positions only)
    auto lg = P.glLoc.find("aPos"); if (lg == P.glLoc.end() || lg->second < 0 || lg->second >= 16) return;
    VAttr& A = vaos[curVao].a[lg->second]; if (!A.en || !A.buf || A.size != 3 || A.div) return;
    auto bi = bufs.find(A.buf); if (bi == bufs.end() || bi->second.dedicated || !bi->second.map) return;
    uint32_t stride = A.stride ? (uint32_t)A.stride : 12; if (stride < 12) return;
    if (first < 0) return; count -= count % 3; if (count < 3) return;
    if ((size_t)A.off + ((size_t)first + (size_t)count) * stride > (size_t)bi->second.size) return;
    if (rtDynCpu.size() + (size_t)count * 3 > 3u * 3u * 400000u) return;   // at most 400000 triangles
    const uint8_t* src = (const uint8_t*)bi->second.map + A.off + (size_t)first * stride; size_t o = rtDynCpu.size(); rtDynCpu.resize(o + (size_t)count * 3);
    for (int i = 0; i < count; i++) memcpy(&rtDynCpu[o + (size_t)i * 3], src + (size_t)i * stride, 12);
  }
  void rtRegister(Prog& P, PackProg& pk, int first, int count) {   // remembers a static batch of world triangles the shadow rays should hit
    for (auto& m : pk.mem) if (m.name == "uMOn") { float f = 0; memcpy(&f, &P.ubo[m.off], 4); if (f > .5f) return; }   // placed meshes carry their own transform: not world geometry
    auto lg = P.glLoc.find("aPos"); if (lg == P.glLoc.end() || lg->second < 0 || lg->second >= 16) return;
    VAttr& A = vaos[curVao].a[lg->second]; if (!A.en || !A.buf || A.size != 3 || A.div) return;
    auto bi = bufs.find(A.buf); if (bi == bufs.end() || !bi->second.dedicated || !bi->second.gen || !bi->second.b) return;
    uint32_t stride = A.stride ? (uint32_t)A.stride : 12; if (stride < 12) return;
    auto key = std::make_tuple(bi->second.gen, (uint32_t)first, (uint32_t)count, (uint32_t)A.off); if (rtKeys.count(key)) return; rtKeys.insert(key);
    VkDeviceAddress va = addrOf(bi->second.b); if (!va) return;
    rtPend.push_back({ bi->second.gen, (uint32_t)first, (uint32_t)count, (uint32_t)A.off, stride, va + A.off + (VkDeviceAddress)first * stride }); rtDirty = true;
  }
  void rtFlush() {   // builds what is new (outside a render pass) and, if the set of triangles changed, a new top level structure
    rtDirty = false; if (rtFailed) return; bool changed = false;
    if (!rtDead.empty()) {
      for (size_t i = 0; i < rtB.size();) { if (rtDead.count(rtB[i].gen)) { rtDrop(rtB[i]); rtB.erase(rtB.begin() + i); changed = true; } else i++; }
      for (auto it = rtKeys.begin(); it != rtKeys.end();) { if (rtDead.count(std::get<0>(*it))) it = rtKeys.erase(it); else ++it; }
      std::vector<RtPend> keep; for (auto& p : rtPend) if (!rtDead.count(p.gen)) keep.push_back(p); rtPend.swap(keep); rtDead.clear();
    }
    bool dynNow = !rtDynCpu.empty() && rtDynFrame != frameNo, dynGone = rtDynCpu.empty() && rtDynOn;
    if (rtPend.empty() && !changed && rtTlas && !dynNow && !dynGone) return;   // nothing new to build
    endRender();
    for (auto& p : rtPend) { RtBlas b; if (!rtBuildBlas(p, b)) { rtFailed = true; rtReady = false; rtPend.clear(); return; } rtB.push_back(std::move(b)); changed = true; }
    rtPend.clear();
    if (dynNow || dynGone) {   // this frame's characters: drop last frame's structure, build a new one from the triangles collected
      if (rtDynOn) { rtDrop(rtDynB); rtDynB = RtBlas(); killBuf(rtDynBuf); rtDynBuf = GBuf(); rtDynOn = false; }
      if (dynNow) {
        rtDynFrame = frameNo; uint64_t keepT = rtTris; size_t nv = rtDynCpu.size() / 3; nv -= nv % 3;
        if (nv >= 3 && mkBuffer(rtDynBuf, (VkDeviceSize)nv * 12, VK_BUFFER_USAGE_SHADER_DEVICE_ADDRESS_BIT | VK_BUFFER_USAGE_ACCELERATION_STRUCTURE_BUILD_INPUT_READ_ONLY_BIT_KHR)) {
          memcpy(rtDynBuf.map, rtDynCpu.data(), nv * 12); RtPend dp{ rtDynBuf.gen, 0, (uint32_t)nv, 0, 12, addrOf(rtDynBuf.b) };
          if (rtBuildBlas(dp, rtDynB)) rtDynOn = true; else { if (rtDynB.as) rtDrop(rtDynB); rtDynB = RtBlas(); killBuf(rtDynBuf); rtDynBuf = GBuf(); rtErr.clear(); }
        }
        rtTris = keepT;
      }
      changed = true;
    }
    if (!changed && rtTlas) return;
    if (rtTlas) { VkDevice d = E->dev; VkAccelerationStructureKHR o = rtTlas; grave.push_back([=]() { vkDestroyAccelerationStructureKHR(d, o, nullptr); }); killBuf(rtTlasBuf); rtTlasBuf = GBuf(); rtTlas = nullptr; }
    rtReady = false; if (rtB.empty()) return;
    uint32_t nS = (uint32_t)rtB.size(), n = nS + (rtDynOn ? 1u : 0u); if (rtInst.b) killBuf(rtInst); rtInst = GBuf();
    if (!mkBuffer(rtInst, (VkDeviceSize)n * sizeof(VkAccelerationStructureInstanceKHR), VK_BUFFER_USAGE_SHADER_DEVICE_ADDRESS_BIT | VK_BUFFER_USAGE_ACCELERATION_STRUCTURE_BUILD_INPUT_READ_ONLY_BIT_KHR)) { rtFailed = true; rtErr = "ray tracing instance buffer"; return; }
    VkAccelerationStructureInstanceKHR* ip = (VkAccelerationStructureInstanceKHR*)rtInst.map;
    for (uint32_t i = 0; i < n; i++) { VkAccelerationStructureInstanceKHR in{}; in.transform.matrix[0][0] = in.transform.matrix[1][1] = in.transform.matrix[2][2] = 1.f; in.mask = 0xFF; in.flags = VK_GEOMETRY_INSTANCE_TRIANGLE_FACING_CULL_DISABLE_BIT_KHR; in.accelerationStructureReference = i < nS ? rtB[i].addr : rtDynB.addr; ip[i] = in; }
    VkAccelerationStructureGeometryKHR tg{ VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_GEOMETRY_KHR }; tg.geometryType = VK_GEOMETRY_TYPE_INSTANCES_KHR; tg.flags = VK_GEOMETRY_OPAQUE_BIT_KHR; tg.geometry.instances.sType = VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_GEOMETRY_INSTANCES_DATA_KHR; tg.geometry.instances.data.deviceAddress = addrOf(rtInst.b);
    VkAccelerationStructureBuildGeometryInfoKHR tb{ VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_BUILD_GEOMETRY_INFO_KHR }; tb.type = VK_ACCELERATION_STRUCTURE_TYPE_TOP_LEVEL_KHR; tb.flags = VK_BUILD_ACCELERATION_STRUCTURE_PREFER_FAST_TRACE_BIT_KHR; tb.mode = VK_BUILD_ACCELERATION_STRUCTURE_MODE_BUILD_KHR; tb.geometryCount = 1; tb.pGeometries = &tg;
    VkAccelerationStructureBuildSizesInfoKHR ts{ VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_BUILD_SIZES_INFO_KHR }; vkGetAccelerationStructureBuildSizesKHR(E->dev, VK_ACCELERATION_STRUCTURE_BUILD_TYPE_DEVICE_KHR, &tb, &n, &ts);
    if (!mkDevBuffer(rtTlasBuf, ts.accelerationStructureSize, VK_BUFFER_USAGE_ACCELERATION_STRUCTURE_STORAGE_BIT_KHR)) { rtFailed = true; rtErr = "out of video memory for ray tracing"; return; }
    VkAccelerationStructureCreateInfoKHR ci{ VK_STRUCTURE_TYPE_ACCELERATION_STRUCTURE_CREATE_INFO_KHR }; ci.buffer = rtTlasBuf.b; ci.size = ts.accelerationStructureSize; ci.type = VK_ACCELERATION_STRUCTURE_TYPE_TOP_LEVEL_KHR;
    if (vkCreateAccelerationStructureKHR(E->dev, &ci, nullptr, &rtTlas) != VK_SUCCESS) { rtFailed = true; rtErr = "could not create the top level structure"; return; }
    VkDeviceAddress sa = 0; if (!rtScratchAddr(ts.buildScratchSize, sa)) { rtFailed = true; return; }
    tb.dstAccelerationStructure = rtTlas; tb.scratchData.deviceAddress = sa; VkAccelerationStructureBuildRangeInfoKHR rg{ n, 0, 0, 0 }; const VkAccelerationStructureBuildRangeInfoKHR* pr = &rg;
    vkCmdBuildAccelerationStructuresKHR(cmd(), 1, &tb, &pr); asBarrier(VK_PIPELINE_STAGE_FRAGMENT_SHADER_BIT | VK_PIPELINE_STAGE_ACCELERATION_STRUCTURE_BUILD_BIT_KHR, VK_ACCESS_ACCELERATION_STRUCTURE_READ_BIT_KHR);
    rtReady = true;
  }
  void setWantRt(bool on) { wantRt = on && E->rtOk; if (on) { rtFailed = false; rtErr.clear(); } }
  void rtShutdown() { if (!E->dev) return; for (auto& b : rtB) if (b.as) vkDestroyAccelerationStructureKHR(E->dev, b.as, nullptr); rtB.clear(); if (rtDynB.as) vkDestroyAccelerationStructureKHR(E->dev, rtDynB.as, nullptr); rtDynB = RtBlas(); rtDynOn = false; if (rtTlas) vkDestroyAccelerationStructureKHR(E->dev, rtTlas, nullptr); rtTlas = nullptr; }
  VkDescriptorSet allocSet(VkDescriptorSetLayout l) {
    for (;;) {
      if (dpCur < dpools.size()) {
        VkDescriptorSetAllocateInfo ai{ VK_STRUCTURE_TYPE_DESCRIPTOR_SET_ALLOCATE_INFO }; ai.descriptorPool = dpools[dpCur]; ai.descriptorSetCount = 1; ai.pSetLayouts = &l; VkDescriptorSet s = nullptr;
        if (vkAllocateDescriptorSets(E->dev, &ai, &s) == VK_SUCCESS) return s; dpCur++; continue;
      }
      VkDescriptorPoolSize ps[3] = { { VK_DESCRIPTOR_TYPE_UNIFORM_BUFFER, 4096 }, { VK_DESCRIPTOR_TYPE_COMBINED_IMAGE_SAMPLER, 4096 * 6 }, { VK_DESCRIPTOR_TYPE_ACCELERATION_STRUCTURE_KHR, 4096 } };
      VkDescriptorPoolCreateInfo pi{ VK_STRUCTURE_TYPE_DESCRIPTOR_POOL_CREATE_INFO }; pi.maxSets = 4096; pi.poolSizeCount = E->rtOk ? 3 : 2; pi.pPoolSizes = ps; VkDescriptorPool dp = nullptr;
      if (vkCreateDescriptorPool(E->dev, &pi, nullptr, &dp) != VK_SUCCESS) { fail("descriptor pool"); return nullptr; } dpools.push_back(dp);
    }
  }
  // ------------------------------------------------------------ rendering
  Tex* colorTarget() { if (!drawFb) return &screen; auto it = fbs.find(drawFb); if (it == fbs.end() || !it->second.color) return nullptr; auto t = texs.find(it->second.color); return t == texs.end() ? nullptr : &t->second; }
  Tex* depthTarget() { if (!drawFb) return nullptr; auto it = fbs.find(drawFb); if (it == fbs.end() || !it->second.depth) return nullptr; auto t = texs.find(it->second.depth); return t == texs.end() ? nullptr : &t->second; }
  void endRender() { if (!rendering) return; vkCmdEndRendering(cmd()); rendering = false; }
  Tex* mvFor(Tex* c, Tex* d) {
    if (!wantMV || !d || !c || c->fmt != VK_FORMAT_R8G8B8A8_UNORM || !c->att) return nullptr;
    if (c->mv && (c->mv->w != c->w || c->mv->h != c->h)) { killTex(*c->mv); c->mv.reset(); }
    if (!c->mv) { c->mv = std::make_shared<Tex>(); if (!mkImage(*c->mv, VK_FORMAT_R16G16_SFLOAT, c->w, c->h, 1, 1, GL_TEXTURE_2D, false, true)) { c->mv.reset(); return nullptr; } }
    return c->mv.get();
  }
  bool beginRender(Tex* c, Tex* d, Tex* mv) {
    if (rendering && rColor == c && rDepth == d && rMV == mv) return true;
    endRender(); if (!c || !c->img) return false;
    if (!c->att) { fail("render target has no attachment view"); return false; }
    trans(*c, VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL); if (d) trans(*d, VK_IMAGE_LAYOUT_DEPTH_ATTACHMENT_OPTIMAL); if (mv) trans(*mv, VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL);
    VkRenderingAttachmentInfo ca[2] = { { VK_STRUCTURE_TYPE_RENDERING_ATTACHMENT_INFO }, { VK_STRUCTURE_TYPE_RENDERING_ATTACHMENT_INFO } }; ca[0].imageView = c->att; ca[0].imageLayout = VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL;
    ca[0].loadOp = c->inited ? VK_ATTACHMENT_LOAD_OP_LOAD : VK_ATTACHMENT_LOAD_OP_CLEAR; ca[0].storeOp = VK_ATTACHMENT_STORE_OP_STORE; ca[0].clearValue.color = { { 0, 0, 0, 0 } };
    if (mv) { ca[1].imageView = mv->att; ca[1].imageLayout = VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL; ca[1].loadOp = mv->inited ? VK_ATTACHMENT_LOAD_OP_LOAD : VK_ATTACHMENT_LOAD_OP_CLEAR; ca[1].storeOp = VK_ATTACHMENT_STORE_OP_STORE; ca[1].clearValue.color = { { 0, 0, 0, 0 } }; }
    VkRenderingAttachmentInfo da{ VK_STRUCTURE_TYPE_RENDERING_ATTACHMENT_INFO };
    if (d) { da.imageView = d->att; da.imageLayout = VK_IMAGE_LAYOUT_DEPTH_ATTACHMENT_OPTIMAL; da.loadOp = d->inited ? VK_ATTACHMENT_LOAD_OP_LOAD : VK_ATTACHMENT_LOAD_OP_CLEAR; da.storeOp = VK_ATTACHMENT_STORE_OP_STORE; da.clearValue.depthStencil = { 1.f, 0 }; }
    VkRenderingInfo ri{ VK_STRUCTURE_TYPE_RENDERING_INFO }; ri.renderArea = { { 0, 0 }, { c->w, c->h } }; ri.layerCount = 1; ri.colorAttachmentCount = mv ? 2 : 1; ri.pColorAttachments = ca; ri.pDepthAttachment = d ? &da : nullptr;
    vkCmdBeginRendering(cmd(), &ri); rendering = true; rColor = c; rDepth = d; rMV = mv; c->inited = true; if (d) d->inited = true; if (mv) mv->inited = true; return true;
  }
  static VkBlendFactor bf(int f) {
    switch (f) { case 0: return VK_BLEND_FACTOR_ZERO; case 1: return VK_BLEND_FACTOR_ONE; case 0x300: return VK_BLEND_FACTOR_SRC_COLOR; case 0x301: return VK_BLEND_FACTOR_ONE_MINUS_SRC_COLOR;
      case 0x302: return VK_BLEND_FACTOR_SRC_ALPHA; case 0x303: return VK_BLEND_FACTOR_ONE_MINUS_SRC_ALPHA; case 0x304: return VK_BLEND_FACTOR_DST_ALPHA; case 0x305: return VK_BLEND_FACTOR_ONE_MINUS_DST_ALPHA;
      case 0x306: return VK_BLEND_FACTOR_DST_COLOR; case 0x307: return VK_BLEND_FACTOR_ONE_MINUS_DST_COLOR; default: return VK_BLEND_FACTOR_ONE; }
  }
  static VkCompareOp cf(int f) { return (VkCompareOp)std::min(7, std::max(0, f - 0x200)); }

  void doClear(int mask) {
    Tex* c = colorTarget(); Tex* d = depthTarget(); if (!c) return;
    Tex* mv = mvFor(c, d); if (!beginRender(c, d, mv)) return;
    VkClearAttachment ca[3]; int n = 0;
    if (mask & GL_COLOR_BUFFER_BIT) { ca[n] = {}; ca[n].aspectMask = VK_IMAGE_ASPECT_COLOR_BIT; ca[n].colorAttachment = 0; ca[n].clearValue.color = { { clr[0], clr[1], clr[2], clr[3] } }; n++; }
    if ((mask & GL_COLOR_BUFFER_BIT) && mv) { ca[n] = {}; ca[n].aspectMask = VK_IMAGE_ASPECT_COLOR_BIT; ca[n].colorAttachment = 1; ca[n].clearValue.color = { { 0, 0, 0, 0 } }; n++; }
    if ((mask & GL_DEPTH_BUFFER_BIT) && d) { ca[n] = {}; ca[n].aspectMask = VK_IMAGE_ASPECT_DEPTH_BIT; ca[n].clearValue.depthStencil = { (float)clrD, 0 }; n++; }
    if (!n) return; VkClearRect r{ { { 0, 0 }, { c->w, c->h } }, 0, 1 }; vkCmdClearAttachments(cmd(), n, ca, 1, &r);
  }
  void draw(int mode, int first, int count, int inst) {
    auto pit = progs.find(curProg); if (pit == progs.end() || !pit->second.pk) return; Prog& P = pit->second; PackProg& pk = *pit->second.pk;
    { bool occ = false; for (auto& m : pk.mem) if (m.name == "uRtOcc") { occ = true; break; }   // the dynamic occluder program: collects triangles for the shadow rays, draws nothing
      if (occ) { if (wantRt && E->rtOk && !rtFailed && mode == GL_TRIANGLES && inst <= 1) rtCollectDyn(P, first, count); return; } }
    Tex* c = colorTarget(); Tex* d = depthTarget(); if (!c) return; if (!buildProg(pk)) return; initDummies();
    bool useRT = false;   // hardware ray traced shadows for programs that have them
    if (wantRt && E->rtOk && !rtFailed && pk.rtBind >= 0 && !pk.fsRT.empty()) {
      if (mode == GL_TRIANGLES && count >= 3 && count % 3 == 0 && inst <= 1) rtRegister(P, pk, first, count);
      if (rtDirty || rtDynPending()) rtFlush();
      if (rtReady && !rtFailed && rtTlas && buildProgRT(pk)) useRT = true;
    }
    // textures the shader samples
    struct S { Tex* t; int binding; };
    std::vector<S> ss; bool needTrans = false;
    for (auto& s : pk.samp) {
      int unit = 0; auto u = P.unit.find(s.name); if (u != P.unit.end()) unit = u->second; unit = std::max(0, std::min(15, unit));
      uint32_t id = unitTex[unit][s.stype]; Tex* t = nullptr; if (id) { auto ti = texs.find(id); if (ti != texs.end() && ti->second.img) t = &ti->second; }
      if (!t) t = &dummy[s.stype];
      if (t == c || t == d) { t = &dummy[s.stype]; }      // feedback loop: not allowed in Vulkan
      VkImageLayout want = t->depth ? VK_IMAGE_LAYOUT_DEPTH_STENCIL_READ_ONLY_OPTIMAL : VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL;
      if (t->lay != want) needTrans = true; ss.push_back({ t, s.binding });
    }
    if (needTrans) { endRender(); for (auto& s : ss) s.t->lay == (s.t->depth ? VK_IMAGE_LAYOUT_DEPTH_STENCIL_READ_ONLY_OPTIMAL : VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL) ? void() : trans(*s.t, s.t->depth ? VK_IMAGE_LAYOUT_DEPTH_STENCIL_READ_ONLY_OPTIMAL : VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL); }
    if (const char* op = getenv("ARB_ONLYPROG")) { if (strtoull(op, nullptr, 16) != pk.key) return; }
    Tex* mvt = mvFor(c, d); if (!beginRender(c, d, mvt)) return;
    if (getenv("ARB_MVDBG2")) { bool hp = false; for (auto& m : pk.mem) if (m.name == "uPP") hp = true; fprintf(stderr, "DBG2 frame %llu prog %llx mode %d count %d hasProj %d mvt %d depthTest %d blend %d\n", (unsigned long long)frameNo, (unsigned long long)pk.key, mode, count, hp, mvt ? 1 : 0, (int)depthTest, (int)blend); }
    // vertex inputs
    Vao& V = vaos[curVao]; std::vector<VkVertexInputBindingDescription> vb; std::vector<VkVertexInputAttributeDescription> va; std::vector<VkBuffer> vbufs; std::vector<VkDeviceSize> voffs; std::string key;
    key.append((const char*)&pk.key, 8); key.push_back(useRT ? 'R' : 'N');
    for (auto& a : pk.attr) {
      auto lg = P.glLoc.find(a.name); VAttr* A = (lg != P.glLoc.end() && lg->second >= 0 && lg->second < 16) ? &V.a[lg->second] : nullptr;
      VkBuffer bb = dummyVB.b; VkDeviceSize bo = 0; uint32_t stride = 0; int sz = 4; bool inst_ = false;
      if (A && A->en && A->buf) {
        auto bi = bufs.find(A->buf);
        if (bi != bufs.end() && bi->second.b) { if (!bi->second.dedicated && bi->second.frame != frameNo) { fail("a streamed vertex buffer was used in a later frame without being refilled"); return; }
          bb = bi->second.b; bo = bi->second.off + A->off; sz = A->size; stride = A->stride ? A->stride : sz * 4; inst_ = A->div > 0; }
      }
      VkVertexInputBindingDescription b{}; b.binding = (uint32_t)vb.size(); b.stride = stride; b.inputRate = inst_ ? VK_VERTEX_INPUT_RATE_INSTANCE : VK_VERTEX_INPUT_RATE_VERTEX; vb.push_back(b);
      VkVertexInputAttributeDescription v{}; v.location = a.loc; v.binding = b.binding; v.offset = 0;
      v.format = sz == 1 ? VK_FORMAT_R32_SFLOAT : sz == 2 ? VK_FORMAT_R32G32_SFLOAT : sz == 3 ? VK_FORMAT_R32G32B32_SFLOAT : VK_FORMAT_R32G32B32A32_SFLOAT; va.push_back(v);
      vbufs.push_back(bb); voffs.push_back(bo); key.append((const char*)&v.format, 4); key.append((const char*)&stride, 4); key.push_back(inst_);
    }
    VkPrimitiveTopology topo = mode == GL_TRIANGLE_STRIP ? VK_PRIMITIVE_TOPOLOGY_TRIANGLE_STRIP : VK_PRIMITIVE_TOPOLOGY_TRIANGLE_LIST;
    bool dt = depthTest && d; bool bl = blend;
    key.push_back((char)topo); key.push_back(bl); key.append((const char*)&bSrc, 4); key.append((const char*)&bDst, 4); key.push_back(dt); key.push_back(dt && dMask); key.append((const char*)&dFunc, 4); key.push_back(polyOff);
    key.push_back(mvt ? 1 : 0); key.append((const char*)&c->fmt, 4); VkFormat dfm = d ? d->fmt : VK_FORMAT_UNDEFINED; key.append((const char*)&dfm, 4);
    VkPipeline pipe = nullptr; auto pi = pipes.find(key);
    if (pi != pipes.end()) pipe = pi->second;
    else {
      VkPipelineShaderStageCreateInfo st[2] = { { VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO }, { VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO } };
      st[0].stage = VK_SHADER_STAGE_VERTEX_BIT; st[0].module = pk.vsm; st[0].pName = "main"; st[1].stage = VK_SHADER_STAGE_FRAGMENT_BIT; st[1].module = useRT ? pk.fsmRT : pk.fsm; st[1].pName = "main";
      VkPipelineVertexInputStateCreateInfo vi{ VK_STRUCTURE_TYPE_PIPELINE_VERTEX_INPUT_STATE_CREATE_INFO }; vi.vertexBindingDescriptionCount = (uint32_t)vb.size(); vi.pVertexBindingDescriptions = vb.data(); vi.vertexAttributeDescriptionCount = (uint32_t)va.size(); vi.pVertexAttributeDescriptions = va.data();
      VkPipelineInputAssemblyStateCreateInfo ia{ VK_STRUCTURE_TYPE_PIPELINE_INPUT_ASSEMBLY_STATE_CREATE_INFO }; ia.topology = topo;
      VkPipelineViewportStateCreateInfo vp{ VK_STRUCTURE_TYPE_PIPELINE_VIEWPORT_STATE_CREATE_INFO }; vp.viewportCount = 1; vp.scissorCount = 1;
      VkPipelineRasterizationStateCreateInfo rs{ VK_STRUCTURE_TYPE_PIPELINE_RASTERIZATION_STATE_CREATE_INFO }; rs.polygonMode = VK_POLYGON_MODE_FILL; rs.cullMode = VK_CULL_MODE_NONE; rs.frontFace = VK_FRONT_FACE_CLOCKWISE; rs.lineWidth = 1.f; rs.depthBiasEnable = polyOff;
      VkPipelineMultisampleStateCreateInfo ms{ VK_STRUCTURE_TYPE_PIPELINE_MULTISAMPLE_STATE_CREATE_INFO }; ms.rasterizationSamples = VK_SAMPLE_COUNT_1_BIT;
      VkPipelineDepthStencilStateCreateInfo ds{ VK_STRUCTURE_TYPE_PIPELINE_DEPTH_STENCIL_STATE_CREATE_INFO }; ds.depthTestEnable = dt; ds.depthWriteEnable = dt && dMask; ds.depthCompareOp = cf(dFunc);
      VkPipelineColorBlendAttachmentState cba[2] = {}; cba[0].blendEnable = bl; cba[0].srcColorBlendFactor = cba[0].srcAlphaBlendFactor = bf(bSrc); cba[0].dstColorBlendFactor = cba[0].dstAlphaBlendFactor = bf(bDst); cba[0].colorBlendOp = cba[0].alphaBlendOp = VK_BLEND_OP_ADD; cba[0].colorWriteMask = 0xF;
      bool hasPP = false; for (auto& m : pk.mem) if (m.name == "uPP") hasPP = true;   // programs that know the camera write motion vectors, the others leave them alone
      cba[1].blendEnable = VK_FALSE; cba[1].colorWriteMask = (bl || !hasPP) ? 0 : 0x3;
      VkPipelineColorBlendStateCreateInfo cbs{ VK_STRUCTURE_TYPE_PIPELINE_COLOR_BLEND_STATE_CREATE_INFO }; cbs.attachmentCount = mvt ? 2 : 1; cbs.pAttachments = cba;
      VkDynamicState dyn[3] = { VK_DYNAMIC_STATE_VIEWPORT, VK_DYNAMIC_STATE_SCISSOR, VK_DYNAMIC_STATE_DEPTH_BIAS }; VkPipelineDynamicStateCreateInfo dy{ VK_STRUCTURE_TYPE_PIPELINE_DYNAMIC_STATE_CREATE_INFO }; dy.dynamicStateCount = 3; dy.pDynamicStates = dyn;
      VkFormat cfm[2] = { c->fmt, VK_FORMAT_R16G16_SFLOAT }; VkPipelineRenderingCreateInfo ri{ VK_STRUCTURE_TYPE_PIPELINE_RENDERING_CREATE_INFO }; ri.colorAttachmentCount = mvt ? 2 : 1; ri.pColorAttachmentFormats = cfm; ri.depthAttachmentFormat = dfm;
      VkGraphicsPipelineCreateInfo gi{ VK_STRUCTURE_TYPE_GRAPHICS_PIPELINE_CREATE_INFO }; gi.pNext = &ri; gi.stageCount = 2; gi.pStages = st; gi.pVertexInputState = &vi; gi.pInputAssemblyState = &ia; gi.pViewportState = &vp; gi.pRasterizationState = &rs;
      gi.pMultisampleState = &ms; gi.pDepthStencilState = &ds; gi.pColorBlendState = &cbs; gi.pDynamicState = &dy; gi.layout = useRT ? pk.plRT : pk.pl;
      if (vkCreateGraphicsPipelines(E->dev, nullptr, 1, &gi, nullptr, &pipe) != VK_SUCCESS) { if (useRT) { rtFailed = true; rtErr = "ray tracing pipeline"; return draw(mode, first, count, inst); } fail("pipeline creation failed"); return; } pipes[key] = pipe;
    }
    // uniforms: patch our own values, then copy the block for this draw
    auto setF = [&](const char* nm, const float* v, int n) { for (auto& m : pk.mem) if (m.name == nm) { memcpy(&P.ubo[m.off], v, n * 4); return; } };
    const float jit[2] = { mvt && doJitter && c->w ? 2.f * jxPx / (float)c->w : 0.f, mvt && doJitter && c->h ? 2.f * jyPx / (float)c->h : 0.f }; const float vpv[4] = { (float)vpW, (float)vpH, 0, 0 }; setF("uJit", jit, 2); setF("uVP", vpv, 4);
    { const UMember *mP = nullptr, *mD = nullptr, *mK = nullptr, *qP = nullptr, *qD = nullptr, *qK = nullptr;
      for (auto& m : pk.mem) { if (m.name == "uP") mP = &m; else if (m.name == "uD") mD = &m; else if (m.name == "uK") mK = &m; else if (m.name == "uPP") qP = &m; else if (m.name == "uPD") qD = &m; else if (m.name == "uPK") qK = &m; }
      if (mP && mD && mK && qP && qD && qK) {
        float cur[8]; memcpy(cur, &P.ubo[mP->off], 8); memcpy(cur + 2, &P.ubo[mD->off], 8); memcpy(cur + 4, &P.ubo[mK->off], 16);
        if (P.camFrame != frameNo) { P.camOld.swap(P.camNow); P.camNow.clear(); P.camFrame = frameNo; }   // the k-th draw of this frame is compared with the k-th draw of the previous frame
        std::array<float, 8> cr; memcpy(cr.data(), cur, sizeof cur); float prevc[8]; memcpy(prevc, P.camNow.size() < P.camOld.size() ? P.camOld[P.camNow.size()].data() : cur, sizeof prevc); P.camNow.push_back(cr);
        if (getenv("ARB_MVDBG")) fprintf(stderr, "DBG prog %llx k=%zu cur P(%.3f,%.3f) prev P(%.3f,%.3f) frame %llu mvt=%d\n", (unsigned long long)pk.key, P.camNow.size() - 1, cur[0], cur[1], prevc[0], prevc[1], (unsigned long long)frameNo, mvt ? 1 : 0);
        memcpy(&P.ubo[qP->off], prevc, 8); memcpy(&P.ubo[qD->off], prevc + 2, 8); memcpy(&P.ubo[qK->off], prevc + 4, 16);
      } }
    ArenaPtr ub = arena(std::max<uint32_t>(pk.uboSize, 16), std::max<VkDeviceSize>(16, E->lim.minUniformBufferOffsetAlignment)); memcpy(ub.p, P.ubo.data(), pk.uboSize);
    VkDescriptorSet ds_ = allocSet(useRT ? pk.dslRT : pk.dsl); if (!ds_) return;
    std::vector<VkWriteDescriptorSet> wr; VkDescriptorBufferInfo bi{ ub.b, ub.off, pk.uboSize }; std::vector<VkDescriptorImageInfo> ii(ss.size());
    VkWriteDescriptorSet w0{ VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET }; w0.dstSet = ds_; w0.dstBinding = 0; w0.descriptorCount = 1; w0.descriptorType = VK_DESCRIPTOR_TYPE_UNIFORM_BUFFER; w0.pBufferInfo = &bi; wr.push_back(w0);
    for (size_t k = 0; k < ss.size(); k++) { ii[k].sampler = samplerFor(*ss[k].t); ii[k].imageView = ss[k].t->view; ii[k].imageLayout = ss[k].t->lay;
      VkWriteDescriptorSet w{ VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET }; w.dstSet = ds_; w.dstBinding = ss[k].binding; w.descriptorCount = 1; w.descriptorType = VK_DESCRIPTOR_TYPE_COMBINED_IMAGE_SAMPLER; w.pImageInfo = &ii[k]; wr.push_back(w); }
    VkWriteDescriptorSetAccelerationStructureKHR wa{ VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET_ACCELERATION_STRUCTURE_KHR }; wa.accelerationStructureCount = 1; wa.pAccelerationStructures = &rtTlas;
    if (useRT) { VkWriteDescriptorSet w{ VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET }; w.pNext = &wa; w.dstSet = ds_; w.dstBinding = pk.rtBind; w.descriptorCount = 1; w.descriptorType = VK_DESCRIPTOR_TYPE_ACCELERATION_STRUCTURE_KHR; wr.push_back(w); }
    vkUpdateDescriptorSets(E->dev, (uint32_t)wr.size(), wr.data(), 0, nullptr);
    VkCommandBuffer k = cmd(); vkCmdBindPipeline(k, VK_PIPELINE_BIND_POINT_GRAPHICS, pipe); vkCmdBindDescriptorSets(k, VK_PIPELINE_BIND_POINT_GRAPHICS, useRT ? pk.plRT : pk.pl, 0, 1, &ds_, 0, nullptr);
    if (!vbufs.empty()) vkCmdBindVertexBuffers(k, 0, (uint32_t)vbufs.size(), vbufs.data(), voffs.data());
    VkViewport vp{ (float)vpX, (float)vpY, (float)vpW, (float)vpH, 0.f, 1.f }; vkCmdSetViewport(k, 0, 1, &vp); VkRect2D sc{ { 0, 0 }, { c->w, c->h } }; vkCmdSetScissor(k, 0, 1, &sc);
    vkCmdSetDepthBias(k, polyOff ? poU : 0.f, 0.f, polyOff ? poF : 0.f);
    vkCmdDraw(k, count, inst, first, 0);
  }

  bool dlssActive() { return wantDlss && E->dlssOk && !dlFailed; }
  bool runDlss(Tex& s, Tex& dp, Tex& mv) {
    uint32_t rw = s.w, rh = s.h, ow = screen.w, oh = screen.h; int q = (rw == ow && rh == oh) ? 5 : dlQ;
    if (!dl || dlRw != rw || dlRh != rh || dlOw != ow || dlOh != oh || dlQc != q) {
      if (dl) { dlssDestroy(*E, dl); dl = nullptr; }
      dl = dlssCreate(*E, cmd(), rw, rh, ow, oh, q, dlErr); if (!dl) { dlFailed = true; return false; }
      dlRw = rw; dlRh = rh; dlOw = ow; dlOh = oh; dlQc = q; dlReset = true;
    }
    trans(s, VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL); trans(dp, VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL); trans(mv, VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL); trans(screen, VK_IMAGE_LAYOUT_GENERAL);
    DlssIO io{ s.img, dp.img, mv.img, screen.img, s.view, dp.view, mv.view, screen.view, s.fmt, dp.fmt, mv.fmt, screen.fmt };
    if (!dlssEval(dl, cmd(), io, jxPx, jyPx, dlReset, (float)dtMs, dlErr)) { dlFailed = true; return false; }
    dlReset = false; screen.inited = true; return true;
  }
  void blit(const COp& o) {
    int sx0 = o.a[0].i(), sy0 = o.a[1].i(), sx1 = o.a[2].i(), sy1 = o.a[3].i(), dx0 = o.a[4].i(), dy0 = o.a[5].i(), dx1 = o.a[6].i(), dy1 = o.a[7].i(), mask = o.a[8].i();
    endRender();
    auto fbTex = [&](uint32_t fb, bool dep) -> Tex* { if (!fb) return dep ? nullptr : &screen; auto it = fbs.find(fb); if (it == fbs.end()) return nullptr; uint32_t id = dep ? it->second.depth : it->second.color; if (!id) return nullptr; auto t = texs.find(id); return t == texs.end() ? nullptr : &t->second; };
    if (!drawFb && (screen.w == 0 || (uint32_t)std::max(dx0, dx1) != screen.w || (uint32_t)std::max(dy0, dy1) != screen.h)) { // the screen buffer follows the size of the blit into it (also when the game changes resolution)
      if (screen.img) { killTex(screen); screen.w = screen.h = 0; }
      bool dd; mkImage(screen, VK_FORMAT_R8G8B8A8_UNORM, std::max(dx0, dx1), std::max(dy0, dy1), 1, 1, GL_TEXTURE_2D, false, true, E->dlssOk); (void)dd; }
    if (!drawFb && dlssActive() && (mask & GL_COLOR_BUFFER_BIT)) {
      Tex* s = fbTex(readFb, false); Tex* dp = fbTex(readFb, true);
      if (s && dp && s->img && dp->img && s->mv && s->mv->img && s->mv->inited && runDlss(*s, *dp, *s->mv)) return;
    }
    for (int pass = 0; pass < 2; pass++) {
      bool dep = pass == 1; if (!(mask & (dep ? GL_DEPTH_BUFFER_BIT : GL_COLOR_BUFFER_BIT))) continue;
      Tex* s = fbTex(readFb, dep); Tex* d = fbTex(drawFb, dep); if (!s || !d || !s->img || !d->img) continue;
      if (s == d) continue;
      trans(*s, VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL); trans(*d, VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL);
      VkImageBlit b{}; VkImageAspectFlags asp = dep ? VK_IMAGE_ASPECT_DEPTH_BIT : VK_IMAGE_ASPECT_COLOR_BIT;
      b.srcSubresource = { asp, 0, 0, 1 }; b.srcOffsets[0] = { sx0, sy0, 0 }; b.srcOffsets[1] = { sx1, sy1, 1 }; b.dstSubresource = { asp, 0, 0, 1 }; b.dstOffsets[0] = { dx0, dy0, 0 }; b.dstOffsets[1] = { dx1, dy1, 1 };
      vkCmdBlitImage(cmd(), s->img, VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL, d->img, VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL, 1, &b, VK_FILTER_NEAREST); d->inited = true;
    }
  }
  // ------------------------------------------------------------ uniforms
  static int elemFloats(int t) { static const int n[] = { 1, 1, 2, 3, 4, 2, 3, 4, 9, 16, 1 }; return n[t]; }
  void setUniform(uint32_t locId, const std::vector<double>& v, bool intArg, bool matrix) {
    auto li = locs.find(locId); if (li == locs.end()) return; auto pi = progs.find(li->second.first); if (pi == progs.end() || !pi->second.pk) return; Prog& P = pi->second; PackProg& pk = *P.pk;
    for (auto& s : pk.samp) if (s.name == li->second.second) { if (!v.empty()) P.unit[s.name] = (int)v[0]; return; }
    for (auto& m : pk.mem) {
      if (m.name != li->second.second) continue;
      int ef = elemFloats(m.type); bool isInt = m.type == 1 || (m.type >= 5 && m.type <= 7) || m.type == 10; int n = (int)v.size(); int ne = m.arr ? std::min<int>(m.arr, (n + ef - 1) / ef) : 1;
      for (int e = 0; e < ne; e++) {
        uint8_t* dst = &P.ubo[m.off + (m.arr ? e * (m.type == 8 ? 48 : m.type == 9 ? 64 : 16) : 0)];
        if (m.type == 8) { for (int c = 0; c < 3; c++) for (int r = 0; r < 3; r++) { int idx = e * 9 + c * 3 + r; float f = idx < n ? (float)v[idx] : 0.f; memcpy(dst + c * 16 + r * 4, &f, 4); } }
        else for (int k = 0; k < ef; k++) { int idx = e * ef + k; if (idx >= n) break; if (isInt) { int32_t iv = (int32_t)v[idx]; memcpy(dst + k * 4, &iv, 4); } else { float f = (float)v[idx]; memcpy(dst + k * 4, &f, 4); } }
      }
      return;
    }
    (void)intArg; (void)matrix;
  }
  static void toVec(const CArg& a, std::vector<double>& out) {
    if (a.tag == CArg::ARR) { out = a.arr; return; }
    if (a.tag == CArg::BYTES) { if (a.kind == 6) { size_t n = a.len / 4; out.resize(n); const float* f = (const float*)a.data; for (size_t i = 0; i < n; i++) out[i] = f[i]; } else if (a.kind == 5) { size_t n = a.len / 4; out.resize(n); const int32_t* f = (const int32_t*)a.data; for (size_t i = 0; i < n; i++) out[i] = f[i]; } else if (a.kind == 7) { size_t n = a.len / 8; out.resize(n); const double* f = (const double*)a.data; for (size_t i = 0; i < n; i++) out[i] = f[i]; } }
  }

  // ------------------------------------------------------------ dispatcher
  enum N { create_buffer, delete_buffer, bind_buffer, buffer_data, create_texture, delete_texture, bind_texture, active_texture, tex_image_2d, tex_image_3d, tex_sub_image_3d, tex_storage_3d, tex_parameter_i, tex_parameter_f, generate_mipmap, pixel_store_i,
    create_framebuffer, bind_framebuffer, framebuffer_texture_2d, framebuffer_renderbuffer, delete_framebuffer, create_renderbuffer, bind_renderbuffer, renderbuffer_storage_multisample, delete_renderbuffer, blit_framebuffer,
    create_vertex_array, bind_vertex_array, enable_vertex_attrib_array, disable_vertex_attrib_array, vertex_attrib_pointer, vertex_attrib_divisor, create_shader, shader_source, create_program, attach_shader, link_program, use_program,
    get_uniform_location, get_attrib_location, uniform1f, uniform1i, uniform2f, uniform3f, uniform4f, uniform3fv, uniform4fv, uniform_matrix3fv, enable, disable, blend_func, depth_mask, depth_func, polygon_offset, viewport_, clear, clear_color, clear_depth,
    draw_arrays, draw_arrays_instanced, frame, NCOUNT };
  void setNames(const std::vector<std::string>& nm) {
    static const char* tbl[] = { "createBuffer", "deleteBuffer", "bindBuffer", "bufferData", "createTexture", "deleteTexture", "bindTexture", "activeTexture", "texImage2D", "texImage3D", "texSubImage3D", "texStorage3D", "texParameteri", "texParameterf", "generateMipmap", "pixelStorei",
      "createFramebuffer", "bindFramebuffer", "framebufferTexture2D", "framebufferRenderbuffer", "deleteFramebuffer", "createRenderbuffer", "bindRenderbuffer", "renderbufferStorageMultisample", "deleteRenderbuffer", "blitFramebuffer",
      "createVertexArray", "bindVertexArray", "enableVertexAttribArray", "disableVertexAttribArray", "vertexAttribPointer", "vertexAttribDivisor", "createShader", "shaderSource", "createProgram", "attachShader", "linkProgram", "useProgram",
      "getUniformLocation", "getAttribLocation", "uniform1f", "uniform1i", "uniform2f", "uniform3f", "uniform4f", "uniform3fv", "uniform4fv", "uniformMatrix3fv", "enable", "disable", "blendFunc", "depthMask", "depthFunc", "polygonOffset", "viewport", "clear", "clearColor", "clearDepth",
      "drawArrays", "drawArraysInstanced", "frame" };
    names = nm; nameId.assign(nm.size(), -1);
    for (size_t i = 0; i < nm.size(); i++) for (int k = 0; k < NCOUNT; k++) if (nm[i] == tbl[k]) nameId[i] = k;
    for (size_t i = 0; i < nm.size(); i++) if (nameId[i] < 0) fprintf(stderr, "arb-rt: warning: unknown call '%s' in capture\n", nm[i].c_str());
  }
  bool exec(const COp& o) {
    if (failed) return false;
    int id = o.name < (int)nameId.size() ? nameId[o.name] : -1; if (id < 0) return true;
    const auto& a = o.a; auto A = [&](size_t i) -> const CArg& { static CArg none; return i < a.size() ? a[i] : none; };
    switch (id) {
      case create_buffer: bufs[o.ret] = GBuf(); break;
      case delete_buffer: { auto it = bufs.find(A(0).id); if (it != bufs.end()) { killBuf(it->second); bufs.erase(it); } break; }
      case bind_buffer: if (A(0).i() == GL_ARRAY_BUFFER) boundArray = A(1).id; break;
      case buffer_data: {
        if (A(0).i() != GL_ARRAY_BUFFER) break; auto it = bufs.find(boundArray); if (it == bufs.end()) break; GBuf& g = it->second; killBuf(g); g = GBuf();
        size_t len = A(1).tag == CArg::BYTES ? A(1).len : (size_t)A(1).n(); int usage = A(2).i(); bool streamy = usage == GL_STREAM_DRAW || usage == GL_DYNAMIC_DRAW;
        if (streamy) { ArenaPtr p = arena(len, 16); if (A(1).tag == CArg::BYTES) memcpy(p.p, A(1).data, len); else memset(p.p, 0, len); g.b = p.b; g.off = p.off; g.size = len; g.frame = frameNo; g.map = p.p; }
        else { if (!mkBuffer(g, len, VK_BUFFER_USAGE_VERTEX_BUFFER_BIT | (E->rtOk ? (VK_BUFFER_USAGE_SHADER_DEVICE_ADDRESS_BIT | VK_BUFFER_USAGE_ACCELERATION_STRUCTURE_BUILD_INPUT_READ_ONLY_BIT_KHR) : 0))) { fail("static buffer allocation failed"); break; } if (A(1).tag == CArg::BYTES) memcpy(g.map, A(1).data, len); else memset(g.map, 0, len); }
        break; }
      case create_texture: texs[o.ret] = Tex(); break;
      case create_renderbuffer: { Tex t; t.rb = true; texs[o.ret] = t; break; }
      case delete_texture: case delete_renderbuffer: { auto it = texs.find(A(0).id); if (it != texs.end()) { endRender(); killTex(it->second); texs.erase(it); for (auto& u : unitTex) for (auto& s : u) if (s == A(0).id) s = 0; for (auto& f : fbs) { if (f.second.color == A(0).id) f.second.color = 0; if (f.second.depth == A(0).id) f.second.depth = 0; } } break; }
      case bind_texture: { int t = A(0).i(); int slot = t == GL_TEXTURE_2D ? 0 : t == GL_TEXTURE_2D_ARRAY ? 1 : t == GL_TEXTURE_3D ? 2 : -1; if (slot < 0) break; unitTex[activeUnit][slot] = A(1).id; auto it = texs.find(A(1).id); if (it != texs.end() && !it->second.target) it->second.target = t; break; }
      case active_texture: activeUnit = std::max(0, std::min(15, A(0).i() - 0x84C0)); break;
      case tex_image_2d: {
        int tg = A(0).i(); if (tg != GL_TEXTURE_2D) break; auto it = texs.find(unitTex[activeUnit][0]); if (it == texs.end()) break; Tex& t = it->second;
        int lvl = A(1).i(), ifmt = A(2).i(), w = A(3).i(), h = A(4).i(), fmt = A(6).i(); if (lvl != 0) { fail("texImage2D with level > 0 is not supported"); break; }
        bool dep; VkFormat vf = fmtOf(ifmt, dep); if (vf == VK_FORMAT_UNDEFINED) { fail("unsupported texture format " + std::to_string(ifmt)); break; }
        if (!(t.img && t.w == (uint32_t)w && t.h == (uint32_t)h && t.fmt == vf && t.target == GL_TEXTURE_2D)) { endRender(); if (!mkImage(t, vf, w, h, 1, mipCount(w, h), GL_TEXTURE_2D, dep, true)) break; }
        if (A(8).tag == CArg::BYTES) upload(t, 0, 0, 0, 0, w, h, 1, fmt, A(8).data, A(8).len);
        break; }
      case tex_image_3d: case tex_storage_3d: {
        int tg = A(0).i(); int slot = tg == GL_TEXTURE_2D_ARRAY ? 1 : tg == GL_TEXTURE_3D ? 2 : -1; if (slot < 0) break; auto it = texs.find(unitTex[activeUnit][slot]); if (it == texs.end()) break; Tex& t = it->second;
        int ifmt, w, h, d, levels = 1; if (id == tex_image_3d) { ifmt = A(2).i(); w = A(3).i(); h = A(4).i(); d = A(5).i(); } else { levels = A(1).i(); ifmt = A(2).i(); w = A(3).i(); h = A(4).i(); d = A(5).i(); }
        bool dep; VkFormat vf = fmtOf(ifmt, dep); if (vf == VK_FORMAT_UNDEFINED) { fail("unsupported 3D texture format"); break; }
        if (id == tex_image_3d && tg == GL_TEXTURE_2D_ARRAY) levels = mipCount(w, h);
        if (!(t.img && t.w == (uint32_t)w && t.h == (uint32_t)h && t.d == (uint32_t)d && t.fmt == vf && t.target == tg && (id == tex_image_3d || t.levels == (uint32_t)levels))) { endRender(); if (!mkImage(t, vf, w, h, d, levels, tg, false, false)) break; }
        if (id == tex_image_3d && A(9).tag == CArg::BYTES) upload(t, 0, 0, 0, 0, w, h, d, A(7).i(), A(9).data, A(9).len);
        break; }
      case tex_sub_image_3d: {
        int tg = A(0).i(); int slot = tg == GL_TEXTURE_2D_ARRAY ? 1 : tg == GL_TEXTURE_3D ? 2 : -1; if (slot < 0) break; auto it = texs.find(unitTex[activeUnit][slot]); if (it == texs.end() || !it->second.img) break;
        if (A(10).tag == CArg::BYTES) upload(it->second, A(1).i(), A(2).i(), A(3).i(), A(4).i(), A(5).i(), A(6).i(), A(7).i(), A(8).i(), A(10).data, A(10).len); break; }
      case tex_parameter_i: case tex_parameter_f: {
        int tg = A(0).i(); int slot = tg == GL_TEXTURE_2D ? 0 : tg == GL_TEXTURE_2D_ARRAY ? 1 : tg == GL_TEXTURE_3D ? 2 : -1; if (slot < 0) break; auto it = texs.find(unitTex[activeUnit][slot]); if (it == texs.end()) break; Tex& t = it->second; int p = A(1).i(); double v = A(2).n();
        if (p == GL_TEXTURE_MIN_FILTER) t.minF = (int)v; else if (p == GL_TEXTURE_MAG_FILTER) t.magF = (int)v; else if (p == GL_TEXTURE_WRAP_S) t.wS = (int)v; else if (p == GL_TEXTURE_WRAP_T) t.wT = (int)v; else if (p == GL_TEXTURE_WRAP_R) t.wR = (int)v; else if (p == GL_TEXTURE_MAX_ANISOTROPY) t.aniso = (float)v; break; }
      case generate_mipmap: { int tg = A(0).i(); int slot = tg == GL_TEXTURE_2D ? 0 : tg == GL_TEXTURE_2D_ARRAY ? 1 : -1; if (slot < 0) break; auto it = texs.find(unitTex[activeUnit][slot]); if (it != texs.end() && it->second.img) genMips(it->second); break; }
      case pixel_store_i: break;
      case create_framebuffer: fbs[o.ret] = Fb(); break;
      case delete_framebuffer: fbs.erase(A(0).id); if (drawFb == A(0).id) drawFb = 0; if (readFb == A(0).id) readFb = 0; break;
      case bind_framebuffer: { int t = A(0).i(); uint32_t f = A(1).id; if (t == GL_FRAMEBUFFER || t == GL_DRAW_FRAMEBUFFER) drawFb = f; if (t == GL_FRAMEBUFFER || t == GL_READ_FRAMEBUFFER) readFb = f; break; }
      case framebuffer_texture_2d: case framebuffer_renderbuffer: {
        uint32_t fb = (A(0).i() == GL_READ_FRAMEBUFFER) ? readFb : drawFb; if (!fb) break; Fb& F = fbs[fb]; uint32_t tid = id == framebuffer_texture_2d ? A(3).id : A(3).id; if (A(1).i() == GL_COLOR_ATTACHMENT0) F.color = tid; else if (A(1).i() == GL_DEPTH_ATTACHMENT) F.depth = tid; break; }
      case bind_renderbuffer: break;
      case renderbuffer_storage_multisample: {
        // (target, samples, internalformat, w, h): drawn with one sample; the resolve blit becomes a copy
        uint32_t rb = 0; (void)rb; fail("multisampled renderbuffers are not supported yet (turn antialiasing off)"); break; }
      case blit_framebuffer: blit(o); break;
      case create_vertex_array: vaos[o.ret] = Vao(); break;
      case bind_vertex_array: curVao = A(0).id; break;
      case enable_vertex_attrib_array: { int i = A(0).i(); if (i >= 0 && i < 16) vaos[curVao].a[i].en = true; break; }
      case disable_vertex_attrib_array: { int i = A(0).i(); if (i >= 0 && i < 16) vaos[curVao].a[i].en = false; break; }
      case vertex_attrib_pointer: { int i = A(0).i(); if (i < 0 || i >= 16) break; VAttr& v = vaos[curVao].a[i]; v.size = A(1).i(); v.stride = A(4).i(); v.off = (uint32_t)A(5).n(); v.buf = boundArray; break; }
      case vertex_attrib_divisor: { int i = A(0).i(); if (i >= 0 && i < 16) vaos[curVao].a[i].div = A(1).i(); break; }
      case create_shader: { Shader s; s.type = A(0).i(); shaders[o.ret] = s; break; }
      case shader_source: shaders[A(0).id].src.assign(A(1).str, A(1).len); break;
      case create_program: { Prog p; p.id = o.ret; progs[o.ret] = p; break; }
      case attach_shader: progs[A(0).id].sh.push_back(A(1).id); break;
      case link_program: {
        Prog& P = progs[A(0).id]; std::string v, f; for (uint32_t s : P.sh) { auto& sh = shaders[s]; if (sh.type == GL_VERTEX_SHADER) v = sh.src; else f = sh.src; }
        auto it = pack.find(fnv64(v + std::string(1, '\0') + f)); if (it == pack.end()) { fail("this game's shaders are not in the native shader pack (run tools/gen-vk-shaders.js)"); break; }
        P.pk = &it->second; P.ubo.assign(P.pk->uboSize + 16, 0); break; }
      case use_program: curProg = A(0).id; break;
      case get_uniform_location: if (o.ret) { std::string nm(A(1).str, A(1).len); if (nm.size() > 3 && nm.compare(nm.size() - 3, 3, "[0]") == 0) nm.resize(nm.size() - 3); locs[o.ret] = { A(0).id, nm }; } break;
      case get_attrib_location: { Prog& P = progs[A(0).id]; P.glLoc[std::string(A(1).str, A(1).len)] = A(2).i(); break; }
      case uniform1f: case uniform1i: case uniform2f: case uniform3f: case uniform4f: { std::vector<double> v; for (size_t i = 1; i < a.size(); i++) v.push_back(a[i].n()); setUniform(A(0).id, v, id == uniform1i, false); break; }
      case uniform3fv: case uniform4fv: { std::vector<double> v; toVec(A(1), v); setUniform(A(0).id, v, false, false); break; }
      case uniform_matrix3fv: { std::vector<double> v; toVec(A(2), v); setUniform(A(0).id, v, false, true); break; }
      case enable: case disable: { bool on = id == enable; int c = A(0).i(); if (c == GL_BLEND) blend = on; else if (c == GL_DEPTH_TEST) depthTest = on; else if (c == GL_POLYGON_OFFSET_FILL) polyOff = on; else if (c == GL_CULL_FACE) cull = on; break; }
      case blend_func: bSrc = A(0).i(); bDst = A(1).i(); break;
      case depth_mask: dMask = A(0).tag == CArg::TRUE_ || (A(0).tag == CArg::NUM && A(0).num != 0); break;
      case depth_func: dFunc = A(0).i(); break;
      case polygon_offset: poF = (float)A(0).n(); poU = (float)A(1).n(); break;
      case viewport_: vpX = A(0).i(); vpY = A(1).i(); vpW = A(2).i(); vpH = A(3).i(); break;
      case clear_color: for (int i = 0; i < 4; i++) clr[i] = (float)A(i).n(); break;
      case clear_depth: clrD = A(0).n(); break;
      case clear: doClear(A(0).i()); break;
      case draw_arrays: draw(A(0).i(), A(1).i(), A(2).i(), 1); break;
      case draw_arrays_instanced: draw(A(0).i(), A(1).i(), A(2).i(), A(3).i()); break;
      case frame: break;
    }
    return !failed;
  }
  // ------------------------------------------------------------ end of frame
  static float halton(int i, int b) { float f = 1, r = 0; while (i > 0) { f /= (float)b; r += f * (float)(i % b); i /= b; } return r; }
  void newFrame() {
    for (auto& fn : grave) fn(); grave.clear(); rtDynCpu.clear(); for (auto& a : arenas) a.used = 0; arenaCur = 0; for (auto dp : dpools) vkResetDescriptorPool(E->dev, dp, 0); dpCur = 0; frameNo++;
    auto now = std::chrono::steady_clock::now(); if (lastEnd.time_since_epoch().count()) { double d = std::chrono::duration<double, std::milli>(now - lastEnd).count(); if (d > 1 && d < 200) dtMs = d; } lastEnd = now;
    int hi = (int)(frameNo % 16) + 1; jxPx = halton(hi, 2) - 0.5f; jyPx = halton(hi, 3) - 0.5f;
  }
  void setWantDlss(bool on, int q) { wantDlss = on; dlQ = q; if (!on) { dlFailed = false; } doJitter = dlssActive() || getenv("ARB_JIT") != nullptr; wantMV = doJitter || getenv("ARB_MV") != nullptr; }
  // ------------------------------------------------------------ window output
  bool presentFrame(int& w, int& h) {
    w = (int)screen.w; h = (int)screen.h;
    endRender(); trans(screen, VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL);
    if (!semAcq) { VkSemaphoreCreateInfo sc{ VK_STRUCTURE_TYPE_SEMAPHORE_CREATE_INFO }; vkCreateSemaphore(E->dev, &sc, nullptr, &semAcq); vkCreateSemaphore(E->dev, &sc, nullptr, &semDone); }
    uint32_t idx = 0, pw = 0, ph = 0; VkImage img = nullptr; std::string perr; bool got = presenterAcquire(pres, semAcq, idx, img, pw, ph, perr);
    if (!perr.empty()) { fail(perr); return false; }
    if (got) recordPresent(img, pw, ph, true);
    return submitPresent(got, idx);
  }
  void imgBarrier(VkImage img, VkImageLayout o, VkImageLayout n, VkAccessFlags sa, VkAccessFlags da, VkPipelineStageFlags ss, VkPipelineStageFlags ds) {
    VkImageMemoryBarrier b{ VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER }; b.oldLayout = o; b.newLayout = n; b.srcQueueFamilyIndex = b.dstQueueFamilyIndex = VK_QUEUE_FAMILY_IGNORED; b.image = img; b.subresourceRange = { VK_IMAGE_ASPECT_COLOR_BIT, 0, 1, 0, 1 }; b.srcAccessMask = sa; b.dstAccessMask = da;
    vkCmdPipelineBarrier(cmd(), ss, ds, 0, 0, nullptr, 0, nullptr, 1, &b);
  }
  void recordPresent(VkImage img, uint32_t pw, uint32_t ph, bool withFrame) {
    imgBarrier(img, VK_IMAGE_LAYOUT_UNDEFINED, VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL, 0, VK_ACCESS_TRANSFER_WRITE_BIT, VK_PIPELINE_STAGE_TRANSFER_BIT, VK_PIPELINE_STAGE_TRANSFER_BIT);
    uint32_t sw = withFrame ? screen.w : 0, sh = withFrame ? screen.h : 0; uint32_t dw = pw, dh = ph, ox = 0, oy = 0;
    if (sw && sh) { double sc = std::min((double)pw / sw, (double)ph / sh); dw = std::max(1u, (uint32_t)std::lround(sw * sc)); dh = std::max(1u, (uint32_t)std::lround(sh * sc)); dw = std::min(dw, pw); dh = std::min(dh, ph); ox = (pw - dw) / 2; oy = (ph - dh) / 2; }
    if (!sw || dw < pw || dh < ph) {   // black bars (or nothing to show yet)
      VkClearColorValue z{}; VkImageSubresourceRange rg{ VK_IMAGE_ASPECT_COLOR_BIT, 0, 1, 0, 1 }; vkCmdClearColorImage(cmd(), img, VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL, &z, 1, &rg);
      imgBarrier(img, VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL, VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL, VK_ACCESS_TRANSFER_WRITE_BIT, VK_ACCESS_TRANSFER_WRITE_BIT, VK_PIPELINE_STAGE_TRANSFER_BIT, VK_PIPELINE_STAGE_TRANSFER_BIT);
    }
    if (sw && sh) {   // the picture is stored bottom row first (like GL), so the copy flips it
      VkImageBlit b{}; b.srcSubresource = { VK_IMAGE_ASPECT_COLOR_BIT, 0, 0, 1 }; b.srcOffsets[0] = { 0, 0, 0 }; b.srcOffsets[1] = { (int32_t)sw, (int32_t)sh, 1 };
      b.dstSubresource = { VK_IMAGE_ASPECT_COLOR_BIT, 0, 0, 1 }; b.dstOffsets[0] = { (int32_t)ox, (int32_t)(oy + dh), 0 }; b.dstOffsets[1] = { (int32_t)(ox + dw), (int32_t)oy, 1 };
      vkCmdBlitImage(cmd(), screen.img, VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL, img, VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL, 1, &b, VK_FILTER_NEAREST);
    }
    imgBarrier(img, VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL, VK_IMAGE_LAYOUT_PRESENT_SRC_KHR, VK_ACCESS_TRANSFER_WRITE_BIT, 0, VK_PIPELINE_STAGE_TRANSFER_BIT, VK_PIPELINE_STAGE_BOTTOM_OF_PIPE_BIT);
  }
  bool submitPresent(bool got, uint32_t idx) {
    vkEndCommandBuffer(cb); recording = false;
    VkPipelineStageFlags ws = VK_PIPELINE_STAGE_TRANSFER_BIT; VkSubmitInfo si{ VK_STRUCTURE_TYPE_SUBMIT_INFO }; si.commandBufferCount = 1; si.pCommandBuffers = &cb;
    if (got) { si.waitSemaphoreCount = 1; si.pWaitSemaphores = &semAcq; si.pWaitDstStageMask = &ws; si.signalSemaphoreCount = 1; si.pSignalSemaphores = &semDone; }
    VkFenceCreateInfo fi{ VK_STRUCTURE_TYPE_FENCE_CREATE_INFO }; VkFence f = nullptr; vkCreateFence(E->dev, &fi, nullptr, &f);
    VkResult vr = vkQueueSubmit(E->q, 1, &si, f); if (vr == VK_SUCCESS) vr = vkWaitForFences(E->dev, 1, &f, VK_TRUE, 60ull * 1000000000ull); vkDestroyFence(E->dev, f, nullptr);
    if (vr != VK_SUCCESS) { fail(std::string("frame submit failed: ") + vkResultName(vr)); return false; }
    if (got) { std::string perr; if (!presenterPresent(pres, idx, semDone, perr)) { fail(perr); return false; } }
    newFrame(); return true;
  }
  bool presentBlack() {   // nothing to show (the game is on a menu): clear the view window
    if (!pres) return true; endRender();
    if (!semAcq) { VkSemaphoreCreateInfo sc{ VK_STRUCTURE_TYPE_SEMAPHORE_CREATE_INFO }; vkCreateSemaphore(E->dev, &sc, nullptr, &semAcq); vkCreateSemaphore(E->dev, &sc, nullptr, &semDone); }
    uint32_t idx = 0, pw = 0, ph = 0; VkImage img = nullptr; std::string perr; bool got = presenterAcquire(pres, semAcq, idx, img, pw, ph, perr); if (!perr.empty()) { fail(perr); return false; }
    if (got) recordPresent(img, pw, ph, false); return submitPresent(got, idx);
  }
  void mvStat() {   // debug: prints how large the motion vectors of the scene are
    for (auto& kv : texs) { Tex& t = kv.second; if (!t.mv || !t.mv->img || !t.mv->inited) continue; Tex& m = *t.mv;
      GBuf rb; if (!mkBuffer(rb, (VkDeviceSize)m.w * m.h * 4, VK_BUFFER_USAGE_TRANSFER_DST_BIT, true)) return;
      endRender(); trans(m, VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL); VkBufferImageCopy r{}; r.imageSubresource = { VK_IMAGE_ASPECT_COLOR_BIT, 0, 0, 1 }; r.imageExtent = { m.w, m.h, 1 }; vkCmdCopyImageToBuffer(cmd(), m.img, VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL, rb.b, 1, &r);
      vkEndCommandBuffer(cb); recording = false; VkSubmitInfo si{ VK_STRUCTURE_TYPE_SUBMIT_INFO }; si.commandBufferCount = 1; si.pCommandBuffers = &cb; vkQueueSubmit(E->q, 1, &si, nullptr); vkQueueWaitIdle(E->q);
      const uint16_t* hp = (const uint16_t*)rb.map; double sx = 0, sy = 0, mx = 0; size_t n = (size_t)m.w * m.h, nz = 0;
      auto h2f = [](uint16_t h) { int e = (h >> 10) & 31, f = h & 1023; float v = e == 0 ? f / 1024.f / 16384.f : e == 31 ? 65504.f : (1.f + f / 1024.f) * std::pow(2.f, (float)(e - 15)); return (h & 0x8000) ? -v : v; };
      for (size_t i = 0; i < n; i++) { float a = h2f(hp[i * 2]), b = h2f(hp[i * 2 + 1]); sx += a; sy += b; double m2 = std::max(std::fabs(a), std::fabs(b)); mx = std::max(mx, m2); if (m2 > 1e-4) nz++; }
      if (const char* dp = getenv("ARB_MVDUMP")) { FILE* f = fopen(dp, "wb"); if (f) { uint32_t hd[2] = { m.w, m.h }; fwrite(hd, 4, 2, f); fwrite(rb.map, 1, (size_t)m.w * m.h * 4, f); fclose(f); } }
      fprintf(stderr, "MV %ux%u: mean (%.4f, %.4f) px, max %.3f px, nonzero %.1f%%\n", m.w, m.h, sx / n, sy / n, mx, 100.0 * nz / n); killBuf(rb); }
  }
  bool endFrame(std::vector<uint8_t>& out, int& w, int& h) {
    if (!screen.img) { w = h = 0; return true; }
    if (pres) { out.clear(); return presentFrame(w, h); }
    if (getenv("ARB_MVSTAT")) mvStat();
    endRender(); trans(screen, VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL);
    VkDeviceSize need = (VkDeviceSize)screen.w * screen.h * 4; if (!rbBuf.b || rbBuf.size != need) { if (rbBuf.b) { vkDeviceWaitIdle(E->dev); killBuf(rbBuf); rbBuf = GBuf(); } if (!mkBuffer(rbBuf, need, VK_BUFFER_USAGE_TRANSFER_DST_BIT, true)) { fail("readback buffer"); return false; } }
    GBuf& rb = rbBuf;
    VkBufferImageCopy r{}; r.imageSubresource = { VK_IMAGE_ASPECT_COLOR_BIT, 0, 0, 1 }; r.imageExtent = { screen.w, screen.h, 1 }; vkCmdCopyImageToBuffer(cmd(), screen.img, VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL, rb.b, 1, &r);
    vkEndCommandBuffer(cb); recording = false;
    VkSubmitInfo si{ VK_STRUCTURE_TYPE_SUBMIT_INFO }; si.commandBufferCount = 1; si.pCommandBuffers = &cb; VkFenceCreateInfo fi{ VK_STRUCTURE_TYPE_FENCE_CREATE_INFO }; VkFence f = nullptr; vkCreateFence(E->dev, &fi, nullptr, &f);
    VkResult vr = vkQueueSubmit(E->q, 1, &si, f); if (vr == VK_SUCCESS) vr = vkWaitForFences(E->dev, 1, &f, VK_TRUE, 60ull * 1000000000ull); vkDestroyFence(E->dev, f, nullptr);
    if (vr != VK_SUCCESS) { fail(std::string("frame submit failed: ") + vkResultName(vr)); return false; }
    w = screen.w; h = screen.h;
    if (rgbOut) { out.resize((size_t)w * h * 3); for (int y = 0; y < h; y++) { const uint8_t* sp = (const uint8_t*)rb.map + (size_t)(h - 1 - y) * w * 4; uint8_t* dp = &out[(size_t)y * w * 3]; for (int x = 0; x < w; x++) { dp[0] = sp[0]; dp[1] = sp[1]; dp[2] = sp[2]; dp += 3; sp += 4; } } }
    else { out.resize((size_t)w * h * 4); for (int y = 0; y < h; y++) memcpy(&out[(size_t)y * w * 4], (uint8_t*)rb.map + (size_t)(h - 1 - y) * w * 4, (size_t)w * 4); }
    // new frame
    newFrame(); return true;
  }
};

// ---------------------------------------------------------------- C interface
GlVk* glvkCreate(VkEnv* env, std::string& err) {
  GlVk* g = new GlVk(); g->E = env; VkCommandPoolCreateInfo pi{ VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO }; pi.queueFamilyIndex = env->qf; pi.flags = VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT;
  if (vkCreateCommandPool(env->dev, &pi, nullptr, &g->pool) != VK_SUCCESS) { err = "command pool"; delete g; return nullptr; }
  if (getenv("ARB_MV")) g->wantMV = true; if (getenv("ARB_JIT")) { g->doJitter = true; g->wantMV = true; } return g;
}
bool glvkLoadPack(GlVk* g, const char* path, std::string& err) {
  FILE* f = fopen(path, "rb"); if (!f) { err = std::string("cannot open ") + path; return false; } fseek(f, 0, SEEK_END); long n = ftell(f); fseek(f, 0, SEEK_SET); std::vector<uint8_t> b(n); if (fread(b.data(), 1, n, f) != (size_t)n) { fclose(f); err = "read error"; return false; } fclose(f);
  if (n < 12 || memcmp(b.data(), "ARBSHD", 6) || (b[6] != '1' && b[6] != '2')) { err = "not a shader pack"; return false; } const bool v2 = b[6] == '2';
  size_t p = 8; auto u8 = [&]() { return b[p++]; }; auto u16 = [&]() { uint16_t v; memcpy(&v, &b[p], 2); p += 2; return v; }; auto u32 = [&]() { uint32_t v; memcpy(&v, &b[p], 4); p += 4; return v; }; auto u64 = [&]() { uint64_t v; memcpy(&v, &b[p], 8); p += 8; return v; };
  auto str = [&]() { uint8_t l = u8(); std::string s((const char*)&b[p], l); p += l; return s; };
  uint32_t np = u32();
  for (uint32_t i = 0; i < np; i++) {
    PackProg pk; pk.key = u64(); pk.uboSize = u32();
    uint32_t nm = u32(); for (uint32_t k = 0; k < nm; k++) { UMember m; m.name = str(); m.type = u8(); m.arr = u16(); m.off = u32(); pk.mem.push_back(m); }
    uint32_t ns = u32(); for (uint32_t k = 0; k < ns; k++) { USamp s; s.name = str(); s.stype = u8(); s.binding = u8(); pk.samp.push_back(s); }
    uint32_t na = u32(); for (uint32_t k = 0; k < na; k++) { UAttr a; a.name = str(); a.loc = u8(); a.comps = u8(); pk.attr.push_back(a); }
    uint32_t vl = u32(); pk.vs.resize(vl / 4); memcpy(pk.vs.data(), &b[p], vl); p += vl; uint32_t fl = u32(); pk.fs.resize(fl / 4); memcpy(pk.fs.data(), &b[p], fl); p += fl;
    if (v2) { uint32_t rl = u32(); if (rl) { pk.rtBind = u8(); pk.fsRT.resize(rl / 4); memcpy(pk.fsRT.data(), &b[p], rl); p += rl; } }
    g->pack[pk.key] = std::move(pk);
  }
  return true;
}
void glvkNames(GlVk* g, const std::vector<std::string>& names) { g->setNames(names); }
bool glvkExec(GlVk* g, const COp& op) { return g->exec(op); }
void glvkSetRgb(GlVk* g, bool on) { g->rgbOut = on; }
void glvkSetPresenter(GlVk* g, Presenter* p) { g->pres = p; }
void glvkSetDlss(GlVk* g, bool on, int quality) { g->setWantDlss(on, quality); }
bool glvkPresentBlack(GlVk* g) { return g->presentBlack(); }
void glvkSetRt(GlVk* g, bool on) { g->setWantRt(on); }
std::string glvkRtState(GlVk* g) { if (!g->wantRt) return g->E->rtOk ? "off" : "unavailable"; if (g->rtFailed) return "failed: " + g->rtErr; if (!g->rtReady) return "starting"; return "on"; }
std::string glvkRtInfo(GlVk* g) { return std::to_string(g->rtB.size()) + " batches, " + std::to_string(g->rtTris) + " triangles"; }
std::string glvkDlssState(GlVk* g) { if (!g->wantDlss) return "off"; if (!g->E->dlssOk) return "unavailable: " + g->E->dlssNote; if (g->dlFailed) return "failed: " + g->dlErr; return g->dl ? "on" : "starting"; }
bool glvkEndFrame(GlVk* g, std::vector<uint8_t>& px, int& w, int& h) { return g->endFrame(px, w, h); }
const std::string& glvkError(GlVk* g) { return g->err; }
void glvkDestroy(GlVk* g) { if (!g) return; if (g->E && g->E->dev) { vkDeviceWaitIdle(g->E->dev); if (g->dl) dlssDestroy(*g->E, g->dl); g->rtShutdown(); if (g->semAcq) vkDestroySemaphore(g->E->dev, g->semAcq, nullptr); if (g->semDone) vkDestroySemaphore(g->E->dev, g->semDone, nullptr); } delete g; }
