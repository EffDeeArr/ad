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
};
bool vkEnvInit(VkEnv& e, int devIdx, std::string& err);
void vkEnvShutdown(VkEnv& e);

struct GlVk;
GlVk* glvkCreate(VkEnv* env, std::string& err);
bool glvkLoadPack(GlVk* g, const char* path, std::string& err);
void glvkNames(GlVk* g, const std::vector<std::string>& names);   // op name table of the capture
bool glvkExec(GlVk* g, const COp& op);                            // false = fatal problem (message in glvkError)
bool glvkEndFrame(GlVk* g, std::vector<uint8_t>& rgbaTopDown, int& w, int& h);
const std::string& glvkError(GlVk* g);
void glvkDestroy(GlVk* g);
