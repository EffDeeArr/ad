#include "present.h"
#include <atomic>
#include <thread>
#include <mutex>
#include <chrono>
#include <vector>
#include <algorithm>

#ifdef _WIN32
struct Presenter {
  VkEnv* E = nullptr; HWND self = nullptr, target = nullptr; std::thread th; std::atomic<bool> run{ true }, ready{ false }, hidden{ true };
  std::atomic<uint32_t> tw{ 0 }, th_{ 0 }; std::string wndErr;
  VkSurfaceKHR surf = nullptr; VkSwapchainKHR sc = nullptr; std::vector<VkImage> imgs; VkFormat fmt = VK_FORMAT_B8G8R8A8_UNORM; uint32_t w = 0, h = 0;
};
static LRESULT CALLBACK arbWndProc(HWND h, UINT m, WPARAM wp, LPARAM lp) {
  switch (m) {
    case WM_NCHITTEST: return HTTRANSPARENT;
    case WM_MOUSEACTIVATE: return MA_NOACTIVATE;
    case WM_ERASEBKGND: return 1;
    case WM_SETCURSOR: SetCursor(nullptr); return TRUE;
  }
  return DefWindowProcW(h, m, wp, lp);
}
static void wndThread(Presenter* p) {
  WNDCLASSEXW wc{}; wc.cbSize = sizeof wc; wc.lpfnWndProc = arbWndProc; wc.hInstance = GetModuleHandleW(nullptr); wc.lpszClassName = L"ArberiaNativeView"; wc.hCursor = nullptr; wc.hbrBackground = (HBRUSH)GetStockObject(BLACK_BRUSH);
  RegisterClassExW(&wc);
  RECT r{}; GetWindowRect(p->target, &r);
  p->self = CreateWindowExW(WS_EX_NOACTIVATE | WS_EX_TOOLWINDOW | WS_EX_TRANSPARENT, L"ArberiaNativeView", L"Arberia native view", WS_POPUP, r.left, r.top, std::max<LONG>(r.right - r.left, 16), std::max<LONG>(r.bottom - r.top, 16), nullptr, nullptr, wc.hInstance, nullptr);
  if (!p->self) { p->wndErr = "could not create the view window"; p->ready = true; return; }
  p->ready = true;
  RECT last{ -1, -1, -1, -1 }; bool shown = false;
  while (p->run) {
    MSG m; while (PeekMessageW(&m, nullptr, 0, 0, PM_REMOVE)) { TranslateMessage(&m); DispatchMessageW(&m); }
    if (!IsWindow(p->target)) { p->run = false; break; }
    bool vis = IsWindowVisible(p->target) && !IsIconic(p->target);
    if (vis) {
      RECT cr{}; GetClientRect(p->target, &cr); POINT tl{ 0, 0 }; ClientToScreen(p->target, &tl);
      RECT now{ tl.x, tl.y, tl.x + cr.right, tl.y + cr.bottom };
      bool zOk = GetWindow(p->target, GW_HWNDNEXT) == p->self;
      if (!shown || now.left != last.left || now.top != last.top || now.right != last.right || now.bottom != last.bottom || !zOk) {
        SetWindowPos(p->self, p->target, now.left, now.top, now.right - now.left, now.bottom - now.top, SWP_NOACTIVATE | (shown ? 0 : SWP_SHOWWINDOW));
        if (!shown) ShowWindow(p->self, SW_SHOWNOACTIVATE);
        last = now; shown = true;
      }
      p->tw = (uint32_t)(now.right - now.left); p->th_ = (uint32_t)(now.bottom - now.top); p->hidden = false;
    } else {
      if (shown) { ShowWindow(p->self, SW_HIDE); shown = false; }
      p->tw = 0; p->th_ = 0; p->hidden = true;
    }
    Sleep(4);
  }
  if (p->self) DestroyWindow(p->self);
  p->self = nullptr;
}
Presenter* presenterCreate(VkEnv* env, uint64_t hwnd, std::string& err) {
  if (!env->canPresent || !vkCreateWin32SurfaceKHR) { err = "this graphics driver cannot show Vulkan frames in a window"; return nullptr; }
  typedef BOOL(WINAPI * SetCtx)(HANDLE); HMODULE u = GetModuleHandleW(L"user32.dll"); if (u) { SetCtx f = (SetCtx)GetProcAddress(u, "SetProcessDpiAwarenessContext"); if (f) f((HANDLE)-4); else SetProcessDPIAware(); }
  Presenter* p = new Presenter(); p->E = env; p->target = (HWND)(uintptr_t)hwnd;
  if (!IsWindow(p->target)) { err = "the game window handle is not valid"; delete p; return nullptr; }
  p->th = std::thread(wndThread, p); while (!p->ready) Sleep(1);
  if (!p->self) { err = p->wndErr; p->run = false; p->th.join(); delete p; return nullptr; }
  VkWin32SurfaceCreateInfoKHR si{ VK_STRUCTURE_TYPE_WIN32_SURFACE_CREATE_INFO_KHR }; si.hinstance = GetModuleHandleW(nullptr); si.hwnd = p->self;
  VkResult r = vkCreateWin32SurfaceKHR(env->inst, &si, nullptr, &p->surf); if (r != VK_SUCCESS) { err = std::string("vkCreateWin32SurfaceKHR: ") + vkResultName(r); presenterDestroy(p); return nullptr; }
  VkBool32 sup = VK_FALSE; vkGetPhysicalDeviceSurfaceSupportKHR(env->pd, env->qf, p->surf, &sup); if (!sup) { err = "the graphics queue cannot present to a window"; presenterDestroy(p); return nullptr; }
  return p;
}
void presenterDestroy(Presenter* p) {
  if (!p) return; p->run = false; if (p->th.joinable()) p->th.join();
  if (p->E && p->E->dev) { vkDeviceWaitIdle(p->E->dev); if (p->sc) vkDestroySwapchainKHR(p->E->dev, p->sc, nullptr); }
  if (p->surf) vkDestroySurfaceKHR(p->E->inst, p->surf, nullptr); delete p;
}
void presenterTargetSize(Presenter* p, uint32_t& w, uint32_t& h) { w = p->tw; h = p->th_; }
bool presenterAlive(Presenter* p) { return p->run; }
void presenterShow(Presenter* p, bool show) { (void)p; (void)show; }
static bool makeSwapchain(Presenter* p, uint32_t cw, uint32_t ch, std::string& err) {
  VkEnv* E = p->E; vkDeviceWaitIdle(E->dev);
  VkSurfaceCapabilitiesKHR caps{}; VkResult r = vkGetPhysicalDeviceSurfaceCapabilitiesKHR(E->pd, p->surf, &caps); if (r != VK_SUCCESS) { err = std::string("surface capabilities: ") + vkResultName(r); return false; }
  uint32_t n = 0; vkGetPhysicalDeviceSurfaceFormatsKHR(E->pd, p->surf, &n, nullptr); std::vector<VkSurfaceFormatKHR> fm(n); vkGetPhysicalDeviceSurfaceFormatsKHR(E->pd, p->surf, &n, fm.data());
  VkSurfaceFormatKHR pick{}; bool got = false; for (auto& f : fm) if (f.format == VK_FORMAT_B8G8R8A8_UNORM && f.colorSpace == VK_COLOR_SPACE_SRGB_NONLINEAR_KHR) { pick = f; got = true; break; }
  if (!got) for (auto& f : fm) if (f.format == VK_FORMAT_R8G8B8A8_UNORM && f.colorSpace == VK_COLOR_SPACE_SRGB_NONLINEAR_KHR) { pick = f; got = true; break; }
  if (!got) { err = "no usable window format"; return false; }
  uint32_t pm = 0; vkGetPhysicalDeviceSurfacePresentModesKHR(E->pd, p->surf, &pm, nullptr); std::vector<VkPresentModeKHR> pms(pm); vkGetPhysicalDeviceSurfacePresentModesKHR(E->pd, p->surf, &pm, pms.data());
  VkPresentModeKHR mode = VK_PRESENT_MODE_FIFO_KHR; for (auto m : pms) if (m == VK_PRESENT_MODE_MAILBOX_KHR) mode = m;
  VkExtent2D ex = caps.currentExtent; if (ex.width == 0xFFFFFFFFu) { ex.width = std::min(std::max(cw, caps.minImageExtent.width), caps.maxImageExtent.width); ex.height = std::min(std::max(ch, caps.minImageExtent.height), caps.maxImageExtent.height); }
  if (!ex.width || !ex.height) { err.clear(); return false; }
  VkSwapchainCreateInfoKHR sci{ VK_STRUCTURE_TYPE_SWAPCHAIN_CREATE_INFO_KHR }; sci.surface = p->surf; sci.minImageCount = std::max(caps.minImageCount, 3u); if (caps.maxImageCount && sci.minImageCount > caps.maxImageCount) sci.minImageCount = caps.maxImageCount;
  sci.imageFormat = pick.format; sci.imageColorSpace = pick.colorSpace; sci.imageExtent = ex; sci.imageArrayLayers = 1; sci.imageUsage = VK_IMAGE_USAGE_TRANSFER_DST_BIT | VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT;
  sci.preTransform = caps.currentTransform; sci.compositeAlpha = VK_COMPOSITE_ALPHA_OPAQUE_BIT_KHR; sci.presentMode = mode; sci.clipped = VK_TRUE; sci.oldSwapchain = p->sc;
  VkSwapchainKHR nsc = nullptr; r = vkCreateSwapchainKHR(E->dev, &sci, nullptr, &nsc); if (r != VK_SUCCESS) { err = std::string("vkCreateSwapchainKHR: ") + vkResultName(r); return false; }
  if (p->sc) vkDestroySwapchainKHR(E->dev, p->sc, nullptr); p->sc = nsc; p->fmt = pick.format; p->w = ex.width; p->h = ex.height;
  uint32_t ni = 0; vkGetSwapchainImagesKHR(E->dev, p->sc, &ni, nullptr); p->imgs.resize(ni); vkGetSwapchainImagesKHR(E->dev, p->sc, &ni, p->imgs.data()); return true;
}
bool presenterAcquire(Presenter* p, VkSemaphore sem, uint32_t& index, VkImage& image, uint32_t& w, uint32_t& h, std::string& err) {
  err.clear(); uint32_t cw = p->tw, ch = p->th_; if (!cw || !ch || p->hidden) return false;
  if (!p->sc || p->w != cw || p->h != ch) { if (!makeSwapchain(p, cw, ch, err)) return false; }
  for (int tries = 0; tries < 2; tries++) {
    VkResult r = vkAcquireNextImageKHR(p->E->dev, p->sc, 1000000000ull, sem, nullptr, &index);
    if (r == VK_SUCCESS || r == VK_SUBOPTIMAL_KHR) { image = p->imgs[index]; w = p->w; h = p->h; return true; }
    if (r == VK_ERROR_OUT_OF_DATE_KHR) { if (!makeSwapchain(p, cw, ch, err)) return false; continue; }
    if (r == VK_TIMEOUT || r == VK_NOT_READY) return false;
    err = std::string("vkAcquireNextImageKHR: ") + vkResultName(r); return false;
  }
  return false;
}
bool presenterPresent(Presenter* p, uint32_t index, VkSemaphore wait, std::string& err) {
  VkPresentInfoKHR pi{ VK_STRUCTURE_TYPE_PRESENT_INFO_KHR }; pi.waitSemaphoreCount = 1; pi.pWaitSemaphores = &wait; pi.swapchainCount = 1; pi.pSwapchains = &p->sc; pi.pImageIndices = &index;
  VkResult r = vkQueuePresentKHR(p->E->q, &pi); if (r == VK_SUCCESS || r == VK_SUBOPTIMAL_KHR || r == VK_ERROR_OUT_OF_DATE_KHR) return true;
  err = std::string("vkQueuePresentKHR: ") + vkResultName(r); return false;
}
#else
// Other systems: only the Windows build shows frames in a window; everything else uses the picture-sending mode.
Presenter* presenterCreate(VkEnv*, uint64_t, std::string& err) { err = "direct window output is only available on Windows"; return nullptr; }
void presenterDestroy(Presenter*) {}
void presenterTargetSize(Presenter*, uint32_t& w, uint32_t& h) { w = h = 0; }
bool presenterAlive(Presenter*) { return false; }
void presenterShow(Presenter*, bool) {}
bool presenterAcquire(Presenter*, VkSemaphore, uint32_t&, VkImage&, uint32_t&, uint32_t&, std::string&) { return false; }
bool presenterPresent(Presenter*, uint32_t, VkSemaphore, std::string&) { return false; }
#endif
