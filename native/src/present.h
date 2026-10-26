// Shows frames in a window of its own that sits directly behind the game window (Windows). The game window is transparent
// and draws the menus and HUD on top, so the picture never has to travel through the browser.
#pragma once
#include "vk_min.h"
#include "glvk.h"

struct Presenter;
Presenter* presenterCreate(VkEnv* env, uint64_t targetHwnd, std::string& err);   // nullptr + err when not possible
void presenterDestroy(Presenter* p);
// Size of the area to cover (client area of the game window). 0 x 0 while the game window is hidden or minimised.
void presenterTargetSize(Presenter* p, uint32_t& w, uint32_t& h);
bool presenterAlive(Presenter* p);
std::string presenterDiag(Presenter* p);                    // one line for the log: where the view window is, what covers it, how many frames were shown                          // false once the game window is gone
void presenterShow(Presenter* p, bool show);
// Swapchain handling, used by GlVk while it records the last step of a frame.
bool presenterAcquire(Presenter* p, VkSemaphore sem, uint32_t& index, VkImage& image, uint32_t& w, uint32_t& h, std::string& err);   // false + empty err = skip this frame (window hidden/resizing)
bool presenterPresent(Presenter* p, uint32_t index, VkSemaphore wait, std::string& err);
