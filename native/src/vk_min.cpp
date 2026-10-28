#include "vk_min.h"
#define VK_DEF(n) PFN_##n n = nullptr;
VK_GLOBAL_FUNCS(VK_DEF) VK_INSTANCE_FUNCS(VK_DEF) VK_DEVICE_FUNCS(VK_DEF) VK_RT_FUNCS(VK_DEF)
PFN_vkGetInstanceProcAddr vkGetInstanceProcAddr_ = nullptr;

bool vkmLoadLoader(std::string& err) {
#ifdef _WIN32
  HMODULE m = LoadLibraryA("vulkan-1.dll");
  if (!m) { err = "vulkan-1.dll could not be loaded (the graphics driver has no Vulkan support)"; return false; }
  vkGetInstanceProcAddr_ = (PFN_vkGetInstanceProcAddr)GetProcAddress(m, "vkGetInstanceProcAddr");
#else
  void* m = dlopen("libvulkan.so.1", RTLD_NOW | RTLD_GLOBAL);
  if (!m) { err = "libvulkan.so.1 could not be loaded"; return false; }
  vkGetInstanceProcAddr_ = (PFN_vkGetInstanceProcAddr)dlsym(m, "vkGetInstanceProcAddr");
#endif
  if (!vkGetInstanceProcAddr_) { err = "vkGetInstanceProcAddr is missing from the Vulkan loader"; return false; }
#define LD(n) n = (PFN_##n)vkGetInstanceProcAddr_(nullptr, #n);
  VK_GLOBAL_FUNCS(LD)
#undef LD
  if (!vkCreateInstance) { err = "vkCreateInstance is missing"; return false; }
  return true;
}
void vkmLoadInstance(VkInstance i) {
#define LD(n) n = (PFN_##n)vkGetInstanceProcAddr_(i, #n);
  VK_INSTANCE_FUNCS(LD)
#undef LD
}
void vkmLoadDevice(VkInstance i, VkDevice d, bool rt) {
#define LD(n) n = (PFN_##n)vkGetDeviceProcAddr(d, #n);
  VK_DEVICE_FUNCS(LD)
  if (rt) { VK_RT_FUNCS(LD) }
#undef LD
  (void)i;
}
const char* vkResultName(VkResult r) {
  switch (r) {
    case VK_SUCCESS: return "VK_SUCCESS"; case VK_NOT_READY: return "VK_NOT_READY"; case VK_TIMEOUT: return "VK_TIMEOUT";
    case VK_ERROR_OUT_OF_HOST_MEMORY: return "OUT_OF_HOST_MEMORY"; case VK_ERROR_OUT_OF_DEVICE_MEMORY: return "OUT_OF_DEVICE_MEMORY";
    case VK_ERROR_INITIALIZATION_FAILED: return "INITIALIZATION_FAILED"; case VK_ERROR_DEVICE_LOST: return "DEVICE_LOST";
    case VK_ERROR_EXTENSION_NOT_PRESENT: return "EXTENSION_NOT_PRESENT"; case VK_ERROR_FEATURE_NOT_PRESENT: return "FEATURE_NOT_PRESENT";
    case VK_ERROR_INCOMPATIBLE_DRIVER: return "INCOMPATIBLE_DRIVER"; case VK_ERROR_LAYER_NOT_PRESENT: return "LAYER_NOT_PRESENT";
    default: return "VK_ERROR(other)";
  }
}
