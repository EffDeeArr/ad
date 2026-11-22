# Sourced by BUILD.sh / RUN-WITHOUT-BUILDING.sh.
# Uses the system Node.js if it actually works; otherwise downloads the official
# standalone Node.js build into ./.node (it carries its own libraries, so a broken or
# mismatched system Node, e.g. a partially updated Arch install, doesn't matter).
node_ok() { command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1 && node -v >/dev/null 2>&1 && npm -v >/dev/null 2>&1; }

if ! node_ok; then
  echo "System Node.js/npm is missing or broken. Using a private copy instead (one-time ~30 MB download)."
  case "$(uname -m)" in x86_64) A=x64;; aarch64) A=arm64;; *) echo "Unsupported CPU: $(uname -m)"; exit 1;; esac
  if [ ! -x .node/bin/node ]; then
    for c in curl tar xz sha256sum; do command -v $c >/dev/null 2>&1 || { echo "Need '$c' installed to download Node.js (Arch: sudo pacman -S curl tar xz coreutils)."; exit 1; }; done
    BASE=https://nodejs.org/dist/latest-v22.x
    FILE=$(curl -fsSL $BASE/SHASUMS256.txt | grep "linux-$A.tar.xz" | head -1 | awk '{print $2}')
    SUM=$(curl -fsSL $BASE/SHASUMS256.txt | grep "linux-$A.tar.xz" | head -1 | awk '{print $1}')
    [ -n "$FILE" ] || { echo "Could not find a Node.js download. Check your internet connection."; exit 1; }
    echo "Downloading $FILE ..."
    curl -fL "$BASE/$FILE" -o /tmp/ld-node.tar.xz
    echo "$SUM  /tmp/ld-node.tar.xz" | sha256sum -c - >/dev/null || { echo "Checksum mismatch, aborting."; rm -f /tmp/ld-node.tar.xz; exit 1; }
    mkdir -p .node && tar -xJf /tmp/ld-node.tar.xz -C .node --strip-components=1 && rm -f /tmp/ld-node.tar.xz
  fi
  export PATH="$PWD/.node/bin:$PATH"
  node_ok || { echo "The downloaded Node.js still doesn't run. Please send me the output of: uname -a; ldd --version"; exit 1; }
fi
echo "Using node $(node -v), npm $(npm -v)"
