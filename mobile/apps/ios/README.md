# Barter Mobile — iOS home prototype

An isolated SwiftUI source prototype. Existing web, NestJS API, CI and production deployments remain unchanged.

## Run

Requires macOS, Xcode (iOS 17+ SDK), and XcodeGen.

```sh
cd mobile/apps/ios
xcodegen generate
open BarterMobile.xcodeproj
```

Select a simulator and run the BarterMobile target. Tap the gear icon to configure the **HTTPS API base URL**; it is saved to the device preferences. No backend keys or credentials are included.

The app has a native safe-area-aware header, search, sale/exchange/both modes, server-provided categories and listing feed, loading/empty/error/retry states, native bottom tabs, and clear placeholders for unimplemented authenticated flows. The endpoint shapes were derived from `apps/web/src/lib/api.ts`; the real endpoint behavior has not yet been tested. No invented seller listings are displayed.

**Not done:** final pixel-identical approved images, profile/auth/chat/listing detail, filters, Android view, native Rust-Xcode linking, simulator/device validation, and App Store signing. The Rust crate and C ABI exist separately under `mobile/crates/barter-core` and will be wired into both platforms in a later controlled integration. Run `cargo test --workspace` from `mobile` when Rust is available.

See `mobile/docs/PROTOTYPE_ACCEPTANCE.md`. Do not merge or deploy without review and authorization.
