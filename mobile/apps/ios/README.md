# Barter Mobile — native iOS + Rust prototype

This isolated SwiftUI source prototype is developed only on `feat/mobile-rust-foundation`.
The existing web app, NestJS backend, root npm workspace and production deployments remain unchanged.

## Build on macOS

Requires Xcode with iOS 17+ SDK, XcodeGen, Rust and rustup. Xcode Command Line Tools alone are not enough for device/simulator XCFramework creation.

```sh
cd mobile/apps/ios
bash scripts/build-rust.sh       # cargo test + iOS ARM64 / simulator ARM64+x86_64 static libraries
xcodegen generate                # requires Frameworks/BarterCore.xcframework
open BarterMobile.xcodeproj
```

Select an iPhone simulator, build and run the BarterMobile target. Set the public HTTPS NestJS API origin in Settings using the gear icon. Do not put passwords, keys or auth tokens in this field.

## Native Rust integration

The Rust static library exports `barter_mode_allows_sale` and `barter_mode_allows_exchange` with a stable C ABI. `scripts/build-rust.sh` produces a signed-independent `XCFramework` from the same Rust source for physical iOS devices and ARM64/Intel iOS simulators. XcodeGen links the framework. SwiftUI invokes both functions in `RustCapabilities.explanation`, which provides the description immediately under the real mode switch.

The visual logo uses a SwiftUI vector shape transcribed from the existing `apps/web/public/brand/bubble-b-v3.svg`. It is not a new generated logo.

The public home screen consumes `GET /categories` and `GET /listings` from the existing API. It has search, sale/exchange/both mode filters, categories, images, empty/loading/error states, retry, and native tabs. Other screens are explicit placeholders. No fabricated listings are shown.

## Limitations

**Not yet compiled, run in Xcode or visually verified.** The build script and integration are source-configured, not independently proven to work on a physical device. No changes have been made to signing, deployment or production. Other approved hero/category imagery has not yet been ported, so the native home view is not pixel-perfect. Android remains a reserved directory.

See `mobile/docs/PROTOTYPE_ACCEPTANCE.md` for the device verification gates. Do not merge or deploy without explicit review and permission.
