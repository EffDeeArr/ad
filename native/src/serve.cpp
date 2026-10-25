// arb-rt --serve --shaders <pack> [--port N] [--device N]
// Local WebSocket server (127.0.0.1 only). The game sends one batch of recorded GL calls per frame; the reply is the rendered picture.
//   client -> server  text   "init key=value ..."   (w h)
//   client -> server  binary one frame of recorded calls (ends with the 'frame' call)
//   server -> client  binary "ARBF" u32 frameNo u32 w u32 h u32 gpuMicroseconds, then w*h*4 RGBA bytes, top row first
//   server -> client  text   "error ..." / "ready ..."
#include "glvk.h"
#include <cstdio>
#include <cstdlib>
#include <chrono>
#include <random>
#ifdef _WIN32
#include <winsock2.h>
#include <ws2tcpip.h>
typedef SOCKET sock_t; static void closeSock(sock_t s) { closesocket(s); }
#else
#include <sys/socket.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <arpa/inet.h>
#include <unistd.h>
typedef int sock_t; static const sock_t INVALID_SOCKET = -1; static void closeSock(sock_t s) { close(s); }
#endif

// ---- SHA-1 and base64 (for the WebSocket handshake)
static void sha1(const uint8_t* d, size_t n, uint8_t out[20]) {
  uint32_t h[5] = { 0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0 };
  std::vector<uint8_t> m(d, d + n); m.push_back(0x80); while (m.size() % 64 != 56) m.push_back(0); uint64_t bits = (uint64_t)n * 8; for (int i = 7; i >= 0; i--) m.push_back((uint8_t)(bits >> (i * 8)));
  auto rol = [](uint32_t v, int s) { return (v << s) | (v >> (32 - s)); };
  for (size_t o = 0; o < m.size(); o += 64) {
    uint32_t w[80]; for (int i = 0; i < 16; i++) w[i] = (uint32_t)m[o + i * 4] << 24 | (uint32_t)m[o + i * 4 + 1] << 16 | (uint32_t)m[o + i * 4 + 2] << 8 | m[o + i * 4 + 3];
    for (int i = 16; i < 80; i++) w[i] = rol(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    uint32_t a = h[0], b = h[1], c = h[2], dd = h[3], e = h[4];
    for (int i = 0; i < 80; i++) { uint32_t f, k; if (i < 20) { f = (b & c) | (~b & dd); k = 0x5A827999; } else if (i < 40) { f = b ^ c ^ dd; k = 0x6ED9EBA1; } else if (i < 60) { f = (b & c) | (b & dd) | (c & dd); k = 0x8F1BBCDC; } else { f = b ^ c ^ dd; k = 0xCA62C1D6; }
      uint32_t t = rol(a, 5) + f + e + k + w[i]; e = dd; dd = c; c = rol(b, 30); b = a; a = t; }
    h[0] += a; h[1] += b; h[2] += c; h[3] += dd; h[4] += e;
  }
  for (int i = 0; i < 5; i++) { out[i * 4] = h[i] >> 24; out[i * 4 + 1] = h[i] >> 16; out[i * 4 + 2] = h[i] >> 8; out[i * 4 + 3] = h[i]; }
}
static std::string b64(const uint8_t* d, size_t n) {
  static const char* T = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"; std::string o;
  for (size_t i = 0; i < n; i += 3) { uint32_t v = d[i] << 16 | (i + 1 < n ? d[i + 1] << 8 : 0) | (i + 2 < n ? d[i + 2] : 0); o += T[v >> 18 & 63]; o += T[v >> 12 & 63]; o += i + 1 < n ? T[v >> 6 & 63] : '='; o += i + 2 < n ? T[v & 63] : '='; }
  return o;
}
static bool sendAll(sock_t s, const uint8_t* p, size_t n) { while (n) { int r = send(s, (const char*)p, (int)std::min<size_t>(n, 1 << 20), 0); if (r <= 0) return false; p += r; n -= r; } return true; }
static bool recvAll(sock_t s, uint8_t* p, size_t n) { while (n) { int r = recv(s, (char*)p, (int)std::min<size_t>(n, 1 << 20), 0); if (r <= 0) return false; p += r; n -= r; } return true; }
static bool wsSend(sock_t s, int opcode, const uint8_t* d, size_t n, const uint8_t* d2 = nullptr, size_t n2 = 0) {
  uint8_t h[10]; int hl = 0; size_t tot = n + n2; h[hl++] = 0x80 | opcode;
  if (tot < 126) h[hl++] = (uint8_t)tot; else if (tot < 65536) { h[hl++] = 126; h[hl++] = tot >> 8; h[hl++] = tot & 255; } else { h[hl++] = 127; for (int i = 7; i >= 0; i--) h[hl++] = (uint8_t)((uint64_t)tot >> (i * 8)); }
  return sendAll(s, h, hl) && (!n || sendAll(s, d, n)) && (!n2 || sendAll(s, d2, n2));
}
static bool wsText(sock_t s, const std::string& t) { return wsSend(s, 1, (const uint8_t*)t.data(), t.size()); }
// reads one complete message; returns opcode (1 text, 2 binary, 8 close) or -1
static int wsRecv(sock_t s, std::vector<uint8_t>& msg) {
  msg.clear(); int firstOp = 0;
  for (;;) {
    uint8_t h[2]; if (!recvAll(s, h, 2)) return -1; bool fin = h[0] & 0x80; int op = h[0] & 15; bool mask = h[1] & 0x80; uint64_t len = h[1] & 127;
    if (len == 126) { uint8_t e[2]; if (!recvAll(s, e, 2)) return -1; len = e[0] << 8 | e[1]; } else if (len == 127) { uint8_t e[8]; if (!recvAll(s, e, 8)) return -1; len = 0; for (int i = 0; i < 8; i++) len = len << 8 | e[i]; }
    uint8_t mk[4] = { 0, 0, 0, 0 }; if (mask && !recvAll(s, mk, 4)) return -1; if (len > (1ull << 31)) return -1;
    std::vector<uint8_t> pl(len); if (len && !recvAll(s, pl.data(), len)) return -1; if (mask) for (size_t i = 0; i < len; i++) pl[i] ^= mk[i & 3];
    if (op == 9) { wsSend(s, 10, pl.data(), pl.size()); continue; } if (op == 10) continue; if (op == 8) return 8;
    if (op != 0) firstOp = op; msg.insert(msg.end(), pl.begin(), pl.end()); if (fin) return firstOp;
  }
}

int serveMain(int argc, char** argv) {
  std::string shd, dev; int port = 0, devIdx = -1; std::string fixedToken;
  for (int i = 1; i < argc; i++) { std::string a = argv[i]; if (a == "--shaders" && i + 1 < argc) shd = argv[++i]; else if (a == "--port" && i + 1 < argc) port = atoi(argv[++i]); else if (a == "--device" && i + 1 < argc) devIdx = atoi(argv[++i]); else if (a == "--token" && i + 1 < argc) fixedToken = argv[++i]; }
  if (shd.empty()) { fprintf(stderr, "usage: arb-rt --serve --shaders shaders.pack [--port N]\n"); return 1; }
#ifdef _WIN32
  WSADATA wd; WSAStartup(MAKEWORD(2, 2), &wd);
#endif
  VkEnv env; std::string err; if (!vkEnvInit(env, devIdx, err)) { printf("ARB-RT FAILED %s\n", err.c_str()); fflush(stdout); return 2; }
  GlVk* g = glvkCreate(&env, err); if (!g) { printf("ARB-RT FAILED %s\n", err.c_str()); fflush(stdout); return 2; }
  if (!glvkLoadPack(g, shd.c_str(), err)) { printf("ARB-RT FAILED %s\n", err.c_str()); fflush(stdout); return 2; }
  std::string token = fixedToken; if (token.empty()) { std::random_device rd; char b[32]; snprintf(b, sizeof b, "%08x%08x", rd(), rd()); token = b; }
  sock_t ls = socket(AF_INET, SOCK_STREAM, 0); int one = 1; setsockopt(ls, SOL_SOCKET, SO_REUSEADDR, (const char*)&one, sizeof one);
  sockaddr_in sa{}; sa.sin_family = AF_INET; sa.sin_port = htons((uint16_t)port); sa.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
  if (bind(ls, (sockaddr*)&sa, sizeof sa) != 0 || listen(ls, 1) != 0) { printf("ARB-RT FAILED cannot listen\n"); fflush(stdout); return 2; }
  socklen_t sl = sizeof sa; getsockname(ls, (sockaddr*)&sa, &sl); port = ntohs(sa.sin_port);
  printf("ARB-RT READY %d %s %s\n", port, token.c_str(), env.name.c_str()); fflush(stdout);
  for (;;) {
    sock_t cs = accept(ls, nullptr, nullptr); if (cs == INVALID_SOCKET) continue; setsockopt(cs, IPPROTO_TCP, TCP_NODELAY, (const char*)&one, sizeof one);
    // handshake
    std::string req; char ch; bool ok = true; while (req.size() < 16384) { int r = recv(cs, &ch, 1, 0); if (r <= 0) { ok = false; break; } req += ch; if (req.size() >= 4 && req.compare(req.size() - 4, 4, "\r\n\r\n") == 0) break; }
    auto hdr = [&](const char* k) { std::string low = req; for (auto& c : low) c = (char)tolower((unsigned char)c); std::string key = std::string("\r\n") + k + ":"; size_t p = low.find(key); if (p == std::string::npos) return std::string(); p += key.size(); while (p < req.size() && req[p] == ' ') p++; size_t e = req.find("\r\n", p); return req.substr(p, e - p); };
    std::string wk = hdr("sec-websocket-key"); bool tokOk = req.find("t=" + token) != std::string::npos;
    if (!ok || wk.empty() || !tokOk) { const char* bad = "HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n"; send(cs, bad, (int)strlen(bad), 0); closeSock(cs); continue; }
    uint8_t dg[20]; std::string cat = wk + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"; sha1((const uint8_t*)cat.data(), cat.size(), dg);
    std::string resp = "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + b64(dg, 20) + "\r\n\r\n"; sendAll(cs, (const uint8_t*)resp.data(), resp.size());
    wsText(cs, "ready " + env.name);
    // per-client renderer state: a fresh GlVk for every connection so a reload of the page starts clean
    glvkDestroy(g); g = glvkCreate(&env, err); glvkLoadPack(g, shd.c_str(), err); OpReader rd; size_t namesSeen = 0; std::vector<uint8_t> msg; uint32_t frameNo = 0; bool alive = true;
    while (alive) {
      int op = wsRecv(cs, msg); if (op < 0 || op == 8) break;
      if (op == 1) { /* init text: reserved for settings */ continue; }
      auto t0 = std::chrono::steady_clock::now(); rd.reset(msg.data(), msg.size(), 0); COp o; bool gotFrame = false; bool good = true;
      while (rd.next(o)) {
        if (rd.names.size() != namesSeen) { glvkNames(g, rd.names); namesSeen = rd.names.size(); }
        if (!glvkExec(g, o)) { good = false; break; }
        if (o.name < (int)rd.names.size() && rd.names[o.name] == "frame") {
          std::vector<uint8_t> px; int w = 0, h = 0; if (!glvkEndFrame(g, px, w, h)) { good = false; break; }
          auto us = (uint32_t)std::chrono::duration_cast<std::chrono::microseconds>(std::chrono::steady_clock::now() - t0).count();
          uint8_t hd[20]; memcpy(hd, "ARBF", 4); memcpy(hd + 4, &frameNo, 4); memcpy(hd + 8, &w, 4); memcpy(hd + 12, &h, 4); memcpy(hd + 16, &us, 4); frameNo++;
          if (!wsSend(cs, 2, hd, 20, px.data(), px.size())) alive = false; gotFrame = true; break;
        }
      }
      if (!good) { wsText(cs, "error " + glvkError(g)); alive = false; }
      (void)gotFrame;
    }
    closeSock(cs);
  }
}
