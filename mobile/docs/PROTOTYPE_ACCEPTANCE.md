# Mobile prototype acceptance checklist

Status: source committed; **not compiled or device-verified**.

## Source fidelity

Approved reference: `docs/design/barter-2026-10/screens/refined-v2/home.webp` (and `home-dark.webp`). Current reference source is web/mobile; the native prototype follows its content hierarchy, but does NOT claim pixel parity.

- [x] First native iOS screen source and standalone XcodeGen config
- [x] Separate Rust workspace with tests and stable C ABI signatures
- [x] Isolated existing API client; no fake catalogue or account data
- [x] Native OS safe-area/tab control with dynamic text and keyboard handling
- [ ] Replace placeholder brand/category/hero assets with exact approved art
- [ ] Verify actual /categories and /listings response shapes against live authorized API
- [ ] Link Rust library on iOS device/simulator and test Swift-to-Rust calls
- [ ] Build and run in Xcode iOS simulator
- [ ] Test 393/430/440 logical-width layouts; portrait and landscape
- [ ] Test physical iPhone keyboard, scrolling, VoiceOver, dark mode, memory/60Hz
- [ ] Add Android native view, share Rust core; compare performance/cost of other UI approaches
- [ ] Owner visual approval before claiming reference acceptance or merging

No production server, environment variable, app signing or existing pipeline was changed.
