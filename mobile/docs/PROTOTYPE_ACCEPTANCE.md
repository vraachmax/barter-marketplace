# Mobile prototype acceptance checklist

Status: source committed; **not compiled or device-verified**.

## Source fidelity

Approved reference: `docs/design/barter-2026-10/screens/refined-v2/home.webp` (and `home-dark.webp`). Current reference source is web/mobile; the native prototype follows its content hierarchy, but does NOT claim pixel parity.

- [x] First native iOS screen source and standalone XcodeGen config
- [x] Separate Rust workspace with tests and stable C ABI signatures
- [x] Isolated existing API client; no fake catalogue or account data
- [x] Native OS safe-area/tab control with dynamic text and keyboard handling
- [x] Reproduce the approved Bubble B vector silhouette in native SwiftUI
- [ ] Port approved category/hero imagery; current versions are still prototypes
- [ ] Verify actual /categories and /listings response shapes against live authorized API
- [x] Source-configure XcodeGen XCFramework linkage and Swift-to-Rust calls (not built or device tested)
- [ ] Build XCFramework on macOS, launch simulator and verify native Swift-to-Rust calls
- [ ] Build and run in Xcode iOS simulator
- [ ] Test 393/430/440 logical-width layouts; portrait and landscape
- [ ] Test physical iPhone keyboard, scrolling, VoiceOver, dark mode, memory/60Hz
- [ ] Add Android native view, share Rust core; compare performance/cost of other UI approaches
- [ ] Owner visual approval before claiming reference acceptance or merging

No production server, environment variable, app signing or existing pipeline was changed.
