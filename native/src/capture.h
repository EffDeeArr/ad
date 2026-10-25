// Reader for .arbcap streams written by tools/glrec.js
#pragma once
#include <cstdint>
#include <cstring>
#include <string>
#include <vector>
#include <cstdio>

struct CArg {
  enum Tag : uint8_t { NIL = 0, NUM = 1, OBJ = 2, STR = 3, BYTES = 4, TRUE_ = 5, FALSE_ = 6, ARR = 7 } tag = NIL;
  double num = 0; uint32_t id = 0; const char* str = nullptr; uint32_t len = 0; uint8_t kind = 0; const uint8_t* data = nullptr; std::vector<double> arr;
  double n() const { return tag == NUM ? num : tag == TRUE_ ? 1 : 0; }
  int i() const { return (int)n(); }
};
struct COp { int name = 0; uint32_t ret = 0; std::vector<CArg> a; };
// Streaming reader: parses ops from memory; the name table survives across buffers (the live link sends one buffer per frame).
struct OpReader {
  const uint8_t* buf = nullptr; size_t size = 0, pos = 0; std::vector<std::string> names;
  void reset(const uint8_t* b, size_t n, size_t start = 0) { buf = b; size = n; pos = start; }
  bool next(COp& op) {
    for (;;) {
      if (pos + 2 > size) return false;
      uint16_t ni; memcpy(&ni, &buf[pos], 2); pos += 2;
      if (ni == 0xFFFF) { uint16_t idx; memcpy(&idx, &buf[pos], 2); pos += 2; uint8_t l = buf[pos++]; if (names.size() <= idx) names.resize(idx + 1); names[idx] = std::string((const char*)&buf[pos], l); pos += l; continue; }
      op.name = ni; uint8_t argc = buf[pos++]; memcpy(&op.ret, &buf[pos], 4); pos += 4; op.a.clear(); op.a.resize(argc);
      for (int k = 0; k < argc; k++) {
        CArg& A = op.a[k]; A.tag = (CArg::Tag)buf[pos++];
        switch (A.tag) {
          case CArg::NUM: memcpy(&A.num, &buf[pos], 8); pos += 8; break;
          case CArg::OBJ: memcpy(&A.id, &buf[pos], 4); pos += 4; break;
          case CArg::STR: memcpy(&A.len, &buf[pos], 4); pos += 4; A.str = (const char*)&buf[pos]; pos += A.len; break;
          case CArg::BYTES: A.kind = buf[pos++]; memcpy(&A.len, &buf[pos], 4); pos += 4; A.data = &buf[pos]; pos += A.len; break;
          case CArg::ARR: { uint32_t n; memcpy(&n, &buf[pos], 4); pos += 4; A.arr.resize(n); for (uint32_t j = 0; j < n; j++) { memcpy(&A.arr[j], &buf[pos], 8); pos += 8; } break; }
          default: break;
        }
      }
      return true;
    }
  }
};
struct Capture {
  std::vector<uint8_t> buf; OpReader rd; std::vector<std::string>& names = rd.names;
  bool load(const char* path) {
    FILE* f = fopen(path, "rb"); if (!f) return false; fseek(f, 0, SEEK_END); long n = ftell(f); fseek(f, 0, SEEK_SET); buf.resize(n); size_t r = fread(buf.data(), 1, n, f); fclose(f);
    if (!(r == (size_t)n && n > 8 && !memcmp(buf.data(), "ARBCAP1", 7))) return false; rd.reset(buf.data(), buf.size(), 8); return true;
  }
  bool next(COp& op) { return rd.next(op); }
};
