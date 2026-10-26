#include <string>
int probeMain(int, char**);
int replayMain(int, char**);
int serveMain(int, char**);
int main(int argc, char** argv) {
  for (int i = 1; i < argc; i++) { if (std::string(argv[i]) == "--replay") return replayMain(argc, argv); if (std::string(argv[i]) == "--serve") return serveMain(argc, argv); }
  return probeMain(argc, argv);
}
