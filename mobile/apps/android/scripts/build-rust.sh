#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ANDROID_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MOBILE_DIR="$(cd "$ANDROID_DIR/../.." && pwd)"
JNI_DIR="$ANDROID_DIR/app/src/main/jniLibs"

command -v cargo >/dev/null || { echo "Rust cargo missing" >&2; exit 1; }
command -v rustup >/dev/null || { echo "Rust rustup missing" >&2; exit 1; }
command -v cargo-ndk >/dev/null || { echo "cargo-ndk missing; install using cargo install cargo-ndk" >&2; exit 1; }
[[ -n "${ANDROID_NDK_HOME:-}" ]] || { echo "Set ANDROID_NDK_HOME to Android NDK directory" >&2; exit 1; }
[[ -d "$ANDROID_NDK_HOME" ]] || { echo "ANDROID_NDK_HOME does not exist" >&2; exit 1; }

cd "$MOBILE_DIR"
cargo test --workspace
rustup target add aarch64-linux-android x86_64-linux-android

# cargo-ndk maps target names to Android jniLibs ABI directory names.
cargo ndk -t arm64-v8a -t x86_64 -p 26 -o "$JNI_DIR" build -p barter-core --release
for abi in arm64-v8a x86_64; do
  test -s "$JNI_DIR/$abi/libbarter_core.so" || { echo "Missing $abi native Rust library" >&2; exit 1; }
done
echo "Built Android Rust libraries into $JNI_DIR"
