// Minimal dynamic Vulkan loader: no import library is needed, the loader (vulkan-1.dll / libvulkan.so.1) is opened at run time,
// so the program starts (and reports why it cannot go on) even on a PC without Vulkan.
#pragma once
#ifdef _WIN32
#define NOMINMAX
#define WIN32_LEAN_AND_MEAN
#define _CRT_SECURE_NO_WARNINGS
#endif
#define VK_NO_PROTOTYPES
#include <vulkan/vulkan.h>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <cstdarg>
#include <string>
#include <vector>
#include <cstdint>
#ifdef _WIN32
#include <windows.h>
#else
#include <dlfcn.h>
#endif

#define VK_GLOBAL_FUNCS(X) X(vkCreateInstance) X(vkEnumerateInstanceExtensionProperties) X(vkEnumerateInstanceLayerProperties)
#define VK_INSTANCE_FUNCS(X) X(vkDestroyInstance) X(vkEnumeratePhysicalDevices) X(vkGetPhysicalDeviceProperties) X(vkGetPhysicalDeviceProperties2) \
  X(vkGetPhysicalDeviceFeatures2) X(vkGetPhysicalDeviceMemoryProperties) X(vkGetPhysicalDeviceQueueFamilyProperties) X(vkEnumerateDeviceExtensionProperties) \
  X(vkCreateDevice) X(vkGetDeviceProcAddr) X(vkGetPhysicalDeviceFormatProperties)
#define VK_DEVICE_FUNCS(X) X(vkDestroyDevice) X(vkGetDeviceQueue) X(vkCreateCommandPool) X(vkDestroyCommandPool) X(vkAllocateCommandBuffers) X(vkFreeCommandBuffers) \
  X(vkBeginCommandBuffer) X(vkEndCommandBuffer) X(vkResetCommandBuffer) X(vkQueueSubmit) X(vkQueueWaitIdle) X(vkDeviceWaitIdle) X(vkCreateFence) X(vkDestroyFence) \
  X(vkWaitForFences) X(vkResetFences) X(vkCreateBuffer) X(vkDestroyBuffer) X(vkGetBufferMemoryRequirements) X(vkAllocateMemory) X(vkFreeMemory) X(vkBindBufferMemory) \
  X(vkMapMemory) X(vkUnmapMemory) X(vkCreateImage) X(vkDestroyImage) X(vkGetImageMemoryRequirements) X(vkBindImageMemory) X(vkCreateImageView) X(vkDestroyImageView) \
  X(vkCmdPipelineBarrier) X(vkCmdCopyBufferToImage) X(vkCmdCopyImageToBuffer) X(vkCmdBlitImage) X(vkCmdClearColorImage) X(vkCmdFillBuffer) \
  X(vkCreateQueryPool) X(vkDestroyQueryPool) X(vkCmdResetQueryPool) X(vkCmdWriteTimestamp) X(vkGetQueryPoolResults) X(vkFlushMappedMemoryRanges) X(vkInvalidateMappedMemoryRanges) \
  X(vkCreateShaderModule) X(vkDestroyShaderModule) X(vkCreateDescriptorSetLayout) X(vkDestroyDescriptorSetLayout) X(vkCreatePipelineLayout) X(vkDestroyPipelineLayout) \
  X(vkCreateDescriptorPool) X(vkDestroyDescriptorPool) X(vkAllocateDescriptorSets) X(vkUpdateDescriptorSets) X(vkResetDescriptorPool) X(vkCreateGraphicsPipelines) \
  X(vkDestroyPipeline) X(vkCmdBindPipeline) X(vkCmdBindDescriptorSets) X(vkCmdBindVertexBuffers) X(vkCmdDraw) X(vkCmdSetViewport) X(vkCmdSetScissor) X(vkCmdSetDepthBias) \
  X(vkCmdBeginRendering) X(vkCmdEndRendering) X(vkCmdClearAttachments) X(vkCreateSampler) X(vkDestroySampler) X(vkCmdCopyImage) X(vkCmdCopyBuffer) X(vkCmdClearDepthStencilImage) \
  X(vkCreateComputePipelines) X(vkCmdDispatch) X(vkCmdPushConstants)
#define VK_RT_FUNCS(X) X(vkCreateAccelerationStructureKHR) X(vkDestroyAccelerationStructureKHR) X(vkGetAccelerationStructureBuildSizesKHR) \
  X(vkCmdBuildAccelerationStructuresKHR) X(vkGetBufferDeviceAddress) X(vkGetAccelerationStructureDeviceAddressKHR)

#define VK_DECL(n) extern PFN_##n n;
VK_GLOBAL_FUNCS(VK_DECL) VK_INSTANCE_FUNCS(VK_DECL) VK_DEVICE_FUNCS(VK_DECL) VK_RT_FUNCS(VK_DECL)
extern PFN_vkGetInstanceProcAddr vkGetInstanceProcAddr_;
bool vkmLoadLoader(std::string& err);
void vkmLoadInstance(VkInstance i);
void vkmLoadDevice(VkInstance i, VkDevice d, bool rt);
const char* vkResultName(VkResult r);
