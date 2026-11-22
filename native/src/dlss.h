// NVIDIA DLSS (through NGX). Compiled in only when the DLSS SDK was found by the build (ARB_DLSS); otherwise every call says "no".
#pragma once
#include "vk_min.h"

struct VkEnv;
struct DlssCtx;
struct DlssIO { VkImage cImg, dImg, mImg, oImg; VkImageView cView, dView, mView, oView; VkFormat cFmt, dFmt, mFmt, oFmt; };

bool dlssBuiltIn();
void dlssPrepare(const std::string& exeDir, const std::string& dataDir);                // before the Vulkan instance exists
void dlssInstanceExtensions(std::vector<std::string>& out);
void dlssDeviceExtensions(VkInstance inst, VkPhysicalDevice pd, std::vector<std::string>& out);
bool dlssInit(VkEnv& e, std::string& note);                                               // after the device exists; true = DLSS can be used
void dlssShutdown(VkEnv& e);
bool dlssOptimal(int quality, uint32_t outW, uint32_t outH, uint32_t& rw, uint32_t& rh);  // render size DLSS wants for this output size and mode
DlssCtx* dlssCreate(VkEnv& e, VkCommandBuffer cb, uint32_t rw, uint32_t rh, uint32_t ow, uint32_t oh, int quality, std::string& err);
bool dlssEval(DlssCtx* c, VkCommandBuffer cb, const DlssIO& io, float jx, float jy, bool reset, float dtMs, std::string& err);
void dlssDestroy(VkEnv& e, DlssCtx* c);
