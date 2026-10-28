#include "dlss.h"
#include "glvk.h"

#ifdef ARB_DLSS
#include "nvsdk_ngx_vk.h"
#include "nvsdk_ngx_helpers.h"
#include "nvsdk_ngx_helpers_vk.h"

static std::wstring widen(const std::string& s) { std::wstring w; for (unsigned char c : s) w.push_back(c); return w; }
static std::wstring gWData, gWExe; static wchar_t* gPathPtr = nullptr;
static NVSDK_NGX_FeatureCommonInfo gCommon; static NVSDK_NGX_FeatureDiscoveryInfo gDisc;
static NVSDK_NGX_Parameter* gCaps = nullptr; static bool gUp = false;
static const char* kProject = "a4d3e1c8-7f2b-4b8e-9c55-2d6a0e7b31f4";
static void NVSDK_CONV ngxLog(const char*, NVSDK_NGX_Logging_Level, NVSDK_NGX_Feature) {}

struct DlssCtx { NVSDK_NGX_Handle* feature = nullptr; NVSDK_NGX_Parameter* params = nullptr; uint32_t rw = 0, rh = 0, ow = 0, oh = 0; };

bool dlssBuiltIn() { return true; }
void dlssPrepare(const std::string& exeDir, const std::string& dataDir) {
  gWData = widen(dataDir); gWExe = widen(exeDir); gPathPtr = (wchar_t*)gWExe.c_str();
  memset(&gCommon, 0, sizeof gCommon); gCommon.PathListInfo.Path = &gPathPtr; gCommon.PathListInfo.Length = 1;
  gCommon.LoggingInfo.LoggingCallback = ngxLog; gCommon.LoggingInfo.MinimumLoggingLevel = NVSDK_NGX_LOGGING_LEVEL_OFF; gCommon.LoggingInfo.DisableOtherLoggingSinks = false;
  memset(&gDisc, 0, sizeof gDisc); gDisc.SDKVersion = NVSDK_NGX_Version_API; gDisc.FeatureID = NVSDK_NGX_Feature_SuperSampling;
  gDisc.Identifier.IdentifierType = NVSDK_NGX_Application_Identifier_Type_Project_Id; gDisc.Identifier.v.ProjectDesc.ProjectId = kProject;
  gDisc.Identifier.v.ProjectDesc.EngineType = NVSDK_NGX_ENGINE_TYPE_CUSTOM; gDisc.Identifier.v.ProjectDesc.EngineVersion = "0.9"; gDisc.ApplicationDataPath = gWData.c_str(); gDisc.FeatureInfo = &gCommon;
}
void dlssInstanceExtensions(std::vector<std::string>& out) {
  uint32_t n = 0; if (!NVSDK_NGX_SUCCEED(NVSDK_NGX_VULKAN_GetFeatureInstanceExtensionRequirements(&gDisc, &n, nullptr)) || !n) return;
  VkExtensionProperties* props = nullptr; if (NVSDK_NGX_SUCCEED(NVSDK_NGX_VULKAN_GetFeatureInstanceExtensionRequirements(&gDisc, &n, &props))) for (uint32_t i = 0; i < n; i++) out.push_back(props[i].extensionName);
}
void dlssDeviceExtensions(VkInstance inst, VkPhysicalDevice pd, std::vector<std::string>& out) {
  uint32_t n = 0; if (!NVSDK_NGX_SUCCEED(NVSDK_NGX_VULKAN_GetFeatureDeviceExtensionRequirements(inst, pd, &gDisc, &n, nullptr)) || !n) return;
  VkExtensionProperties* props = nullptr; if (NVSDK_NGX_SUCCEED(NVSDK_NGX_VULKAN_GetFeatureDeviceExtensionRequirements(inst, pd, &gDisc, &n, &props))) for (uint32_t i = 0; i < n; i++) out.push_back(props[i].extensionName);
}
bool dlssInit(VkEnv& e, std::string& note) {
  if (!e.nvidia) { note = "needs an NVIDIA RTX graphics card"; return false; }
  NVSDK_NGX_Result r = NVSDK_NGX_VULKAN_Init_with_ProjectID(kProject, NVSDK_NGX_ENGINE_TYPE_CUSTOM, "0.9", gWData.c_str(), e.inst, e.pd, e.dev, vkGetInstanceProcAddr_, vkGetDeviceProcAddr, &gCommon, NVSDK_NGX_Version_API);
  if (!NVSDK_NGX_SUCCEED(r)) { char b[96]; snprintf(b, sizeof b, "DLSS could not start (NGX error 0x%x; is nvngx_dlss.dll next to arb-rt.exe?)", (unsigned)r); note = b; return false; }
  gUp = true; r = NVSDK_NGX_VULKAN_GetCapabilityParameters(&gCaps); if (!NVSDK_NGX_SUCCEED(r) || !gCaps) { note = "DLSS capability query failed"; return false; }
  int avail = 0, needDrv = 0; NVSDK_NGX_Parameter_GetI(gCaps, NVSDK_NGX_Parameter_SuperSampling_Available, &avail); NVSDK_NGX_Parameter_GetI(gCaps, NVSDK_NGX_Parameter_SuperSampling_NeedsUpdatedDriver, &needDrv);
  if (!avail) { note = needDrv ? "DLSS needs a newer NVIDIA driver" : "DLSS is not available on this graphics card"; return false; }
  note = "available"; return true;
}
void dlssShutdown(VkEnv& e) { if (gUp) { vkDeviceWaitIdle(e.dev); NVSDK_NGX_VULKAN_Shutdown1(e.dev); gUp = false; gCaps = nullptr; } }
bool dlssOptimal(int quality, uint32_t ow, uint32_t oh, uint32_t& rw, uint32_t& rh) {
  if (!gCaps) return false; unsigned a = 0, b = 0, c = 0, d = 0, f = 0, g = 0; float sh = 0;
  NVSDK_NGX_Result r = NGX_DLSS_GET_OPTIMAL_SETTINGS(gCaps, ow, oh, (NVSDK_NGX_PerfQuality_Value)quality, &a, &b, &c, &d, &f, &g, &sh);
  if (!NVSDK_NGX_SUCCEED(r) || !a || !b) return false; rw = a; rh = b; return true;
}
DlssCtx* dlssCreate(VkEnv& e, VkCommandBuffer cb, uint32_t rw, uint32_t rh, uint32_t ow, uint32_t oh, int quality, std::string& err) {
  (void)e; DlssCtx* c = new DlssCtx(); c->rw = rw; c->rh = rh; c->ow = ow; c->oh = oh;
  NVSDK_NGX_Result r = NVSDK_NGX_VULKAN_AllocateParameters(&c->params); if (!NVSDK_NGX_SUCCEED(r)) { err = "DLSS: AllocateParameters failed"; delete c; return nullptr; }
  NVSDK_NGX_DLSS_Create_Params cp{}; cp.Feature.InWidth = rw; cp.Feature.InHeight = rh; cp.Feature.InTargetWidth = ow; cp.Feature.InTargetHeight = oh; cp.Feature.InPerfQualityValue = (NVSDK_NGX_PerfQuality_Value)quality;
  cp.InFeatureCreateFlags = NVSDK_NGX_DLSS_Feature_Flags_MVLowRes | NVSDK_NGX_DLSS_Feature_Flags_AutoExposure;
  r = NGX_VULKAN_CREATE_DLSS_EXT1(e.dev, cb, 1, 1, &c->feature, c->params, &cp);
  if (!NVSDK_NGX_SUCCEED(r) || !c->feature) { char b[64]; snprintf(b, sizeof b, "DLSS: creating the feature failed (0x%x)", (unsigned)r); err = b; NVSDK_NGX_VULKAN_DestroyParameters(c->params); delete c; return nullptr; }
  return c;
}
bool dlssEval(DlssCtx* c, VkCommandBuffer cb, const DlssIO& io, float jx, float jy, bool reset, float dtMs, std::string& err) {
  auto rng = [](VkImageAspectFlags a) { VkImageSubresourceRange s{}; s.aspectMask = a; s.levelCount = 1; s.layerCount = 1; return s; };
  NVSDK_NGX_Resource_VK rc = NVSDK_NGX_Create_ImageView_Resource_VK(io.cView, io.cImg, rng(VK_IMAGE_ASPECT_COLOR_BIT), io.cFmt, c->rw, c->rh, false);
  NVSDK_NGX_Resource_VK rd = NVSDK_NGX_Create_ImageView_Resource_VK(io.dView, io.dImg, rng(VK_IMAGE_ASPECT_DEPTH_BIT), io.dFmt, c->rw, c->rh, false);
  NVSDK_NGX_Resource_VK rm = NVSDK_NGX_Create_ImageView_Resource_VK(io.mView, io.mImg, rng(VK_IMAGE_ASPECT_COLOR_BIT), io.mFmt, c->rw, c->rh, false);
  NVSDK_NGX_Resource_VK ro = NVSDK_NGX_Create_ImageView_Resource_VK(io.oView, io.oImg, rng(VK_IMAGE_ASPECT_COLOR_BIT), io.oFmt, c->ow, c->oh, true);
  NVSDK_NGX_VK_DLSS_Eval_Params ev{}; ev.Feature.pInColor = &rc; ev.Feature.pInOutput = &ro; ev.pInDepth = &rd; ev.pInMotionVectors = &rm; ev.InJitterOffsetX = jx; ev.InJitterOffsetY = jy;
  ev.InRenderSubrectDimensions = { c->rw, c->rh }; ev.InReset = reset ? 1 : 0; ev.InMVScaleX = 1.f; ev.InMVScaleY = 1.f; ev.InFrameTimeDeltaInMsec = dtMs;
  NVSDK_NGX_Result r = NGX_VULKAN_EVALUATE_DLSS_EXT(cb, c->feature, c->params, &ev);
  if (!NVSDK_NGX_SUCCEED(r)) { char b[64]; snprintf(b, sizeof b, "DLSS: evaluate failed (0x%x)", (unsigned)r); err = b; return false; }
  return true;
}
void dlssDestroy(VkEnv& e, DlssCtx* c) {
  if (!c) return; vkDeviceWaitIdle(e.dev); if (c->feature) NVSDK_NGX_VULKAN_ReleaseFeature(c->feature); if (c->params) NVSDK_NGX_VULKAN_DestroyParameters(c->params); delete c;
}
#else
struct DlssCtx {};
bool dlssBuiltIn() { return false; }
void dlssPrepare(const std::string&, const std::string&) {}
void dlssInstanceExtensions(std::vector<std::string>&) {}
void dlssDeviceExtensions(VkInstance, VkPhysicalDevice, std::vector<std::string>&) {}
bool dlssInit(VkEnv&, std::string& note) { note = "this build has no DLSS (the DLSS SDK was not found when building)"; return false; }
void dlssShutdown(VkEnv&) {}
bool dlssOptimal(int, uint32_t, uint32_t, uint32_t&, uint32_t&) { return false; }
DlssCtx* dlssCreate(VkEnv&, VkCommandBuffer, uint32_t, uint32_t, uint32_t, uint32_t, int, std::string& err) { err = "no DLSS in this build"; return nullptr; }
bool dlssEval(DlssCtx*, VkCommandBuffer, const DlssIO&, float, float, bool, float, std::string& err) { err = "no DLSS in this build"; return false; }
void dlssDestroy(VkEnv&, DlssCtx*) {}
#endif
