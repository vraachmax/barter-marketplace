# Barter Mobile — Android-first prototype

Isolated Kotlin + Jetpack Compose frontend with the **same Rust barter-core** planned for SwiftUI/iOS. No changes to the existing web, NestJS server, production environment, or root npm workspace.

## Requirements

- Android Studio with Android SDK 36, Android NDK and JDK 17
- Gradle 8.13 installed (no binary Gradle Wrapper JAR is committed; run via your local Gradle installation)
- Rust with rustup, cargo, and cargo-ndk (`cargo install cargo-ndk`)
- A public HTTPS URL for your existing NestJS API

## Build on Linux, macOS or Windows WSL

```sh
cd mobile/apps/android
export ANDROID_NDK_HOME="/path/to/Android/Sdk/ndk/<installed-version>"
bash scripts/build-rust.sh
gradle :app:assembleDebug
```

Debug APK will appear at `app/build/outputs/apk/debug/app-debug.apk` **after a successful local build**. No APK has been built or verified in this repository change. To develop in Android Studio, open the `mobile/apps/android` directory after building Rust JNI libraries.

## Architecture

- `app/src/main/java/app/barter/mobile/BarterApp.kt`: native Compose home, correct logo silhouette, search, three modes, categories, cards, tabs, loading/error/empty states
- `CatalogApi.kt`: HTTP read-only client for the existing public `GET /categories` and `GET /listings` routes; real seller photos only
- `HomeViewModel.kt`: cancellation-aware loading and error states
- `RustBridge.kt`: JNI to portable Rust `barter_mode_allows_sale` and `barter_mode_allows_exchange`
- `scripts/build-rust.sh`: builds Rust `.so` for arm64-v8a and x86_64 emulator with cargo-ndk; artifacts are gitignored
- Existing backend is the authoritative source of truth; no device database or local fabrication of listings

## First run

Tap the Settings gear to enter a public HTTPS API URL. A valid URL is needed to display real catalog data. No tokens, secrets or signed-in credentials should be supplied; this build contains public catalog read operations only.

## Status and limitations

**Source-level prototype, not a tested APK.** No Gradle/Android SDK/NDK/Rust toolchain is available in the current authoring environment, so compilation and device verification are pending. Actual native screen screenshots have not been compared pixel-for-pixel against the approved `home.webp` reference. Category art and four approved hero images still need faithful transfer. Full text filters, details, sign-in, chats, publishing, favorite actions and transaction completion are not implemented. Secondary tabs clearly show placeholders, rather than pretending to work.

Android work is prioritized; iOS code stays untouched in this phase. No merge to master or deployment is approved.
