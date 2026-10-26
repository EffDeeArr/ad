// "Mini GL on Vulkan": executes the recorded WebGL2 calls (see tools/glrec.js) with Vulkan.
#pragma once
#include "vk_min.h"
#include "capture.h"
#include <map>
#include <unordered_map>
#include <functional>

struct VkEnv {
  VkInstance inst = nullptr; VkPhysicalDevice pd = nullptr; VkDevice dev = nullptr; VkQueue q = nullptr; uint32_t qf = 0;
  VkPhysicalDeviceMemoryProperties mp{}; VkPhysicalDeviceLimits lim{}; bool aniso = false; std::string name; bool nvidia = false;
  bool canPresent = false, rtOk = false, dlssOk = false; std::string dlssNote;   // window output, ray query, DLSS
};
struct EnvOpts { bool present = false, dlss = false, rt = false; std::string exeDir, dataDir; };
bool vkEnvInit(VkEnv& e, int devIdx, std::string& err, const EnvOpts* o = nullptr);
void vkEnvShutdown(VkEnv& e);

struct GlVk;
GlVk* glvkCreate(VkEnv* env, std::string& err);
bool glvkLoadPack(GlVk* g, const char* path, std::string& err);
void glvkNames(GlVk* g, const std::vector<std::string>& names);   // op name table of the capture
bool glvkExec(GlVk* g, const COp& op);                            // false = fatal problem (message in glvkError)
void glvkSetRgb(GlVk* g, bool on);                                // frames come back as 3 bytes per pixel instead of 4
struct Presenter;
void glvkSetPresenter(GlVk* g, Presenter* p);                       // frames go to the window instead of being read back
void glvkSetDlss(GlVk* g, bool on, int quality);
bool glvkPresentBlack(GlVk* g);
void glvkSetRt(GlVk* g, bool on);                                   // hardware ray traced shadows (needs VkEnv::rtOk)
std::string glvkRtState(GlVk* g);                                   // off / unavailable / starting / on / failed: ...
std::string glvkRtInfo(GlVk* g);
std::string glvkDlssState(GlVk* g);
bool glvkEndFrame(GlVk* g, std::vector<uint8_t>& rgbaTopDown, int& w, int& h);
const std::string& glvkError(GlVk* g);
void glvkDestroy(GlVk* g);
