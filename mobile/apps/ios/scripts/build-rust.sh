#!/usr/bin/env bash
set -euo pipefail

# Run on macOS with Xcode command-line tools and rustup installed.
# Build all supported Apple architectures first. Never write to apps/web or apps/api.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IOS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MOBILE_DIR="$(cd "$IOS_DIR/../.." && pwd)"
OUTPUT_DIR="$IOS_DIR/Frameworks"
CARGO_TARGET_DIR="$MOBILE_DIR/target"
export CARGO_TARGET_DIR

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This step requires macOS and Xcode." >&2
  exit 1
fi
command -v cargo >/dev/null || { echo "Missing cargo" >&2; exit 1; }
command -v rustup >/dev/null || { echo "Missing rustup" >&2; exit 1; }
command -v xcodebuild >/dev/null || { echo "Missing Xcode" >&2; exit 1; }
command -v lipo >/dev/null || { echo "Missing lipo" >&2; exit 1; }

cd "$MOBILE_DIR"
cargo test --workspace

for target in aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios; do
  rustup target add "$target"
  cargo build -p barter-core --release --target "$target"
done

mkdir -p "$OUTPUT_DIR"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
lipo -create \
  "$CARGO_TARGET_DIR/aarch64-apple-ios-sim/release/libbarter_core.a" \
  "$CARGO_TARGET_DIR/x86_64-apple-ios/release/libbarter_core.a" \
  -output "$TMP_DIR/libbarter_core_sim.a"
rm -rf "$OUTPUT_DIR/BarterCore.xcframework"
xcodebuild -create-xcframework \
  -library "$CARGO_TARGET_DIR/aarch64-apple-ios/release/libbarter_core.a" \
  -headers "$MOBILE_DIR/crates/barter-core/include" \
  -library "$TMP_DIR/libbarter_core_sim.a" \
  -headers "$MOBILE_DIR/crates/barter-core/include" \
  -output "$OUTPUT_DIR/BarterCore.xcframework"
echo "Built $OUTPUT_DIR/BarterCore.xcframework"
