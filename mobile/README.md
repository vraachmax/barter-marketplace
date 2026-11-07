# Barter Mobile — isolated Rust foundation

This directory is the home of future iOS and Android applications. It is intentionally outside `apps/*` and `packages/*` so the current npm workspace, Next.js web frontend, NestJS API, CI, and deployments are unaffected.

## Layout

- `crates/barter-core/` — pure Rust domain types and portable business rules, with no UI or network dependencies.
- `apps/ios/` — future iOS shell; implementation technology not yet selected.
- `apps/android/` — future Android shell; implementation technology not yet selected.
- `docs/` — architectural decisions, migration boundaries and development roadmap.

## Boundaries

The existing backend remains the server-side source of truth for accounts, listings, offers, messages, authentication, uploads and transactions. The mobile client must consume the existing, reviewed API contracts. Do not copy the backend/database or implement authoritative exchange state transitions on devices.

Rust is the intended portable client-side logic layer. UI framework selection (native SwiftUI/Compose plus Rust FFI, or a vetted cross-platform Rust-capable framework) is deliberately deferred until an isolated device-level spike measures startup, navigation, keyboard/safe-area handling, accessibility, build complexity and maintenance costs.

No changes in this foundation should be merged into `master` or deployed without explicit review and approval.
