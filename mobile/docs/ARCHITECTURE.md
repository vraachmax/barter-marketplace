# Barter Mobile architecture — initial decision

Status: foundation only; no chosen UI framework or full mobile application yet.

## Existing product preserved

- `apps/web/`: Next.js and React PWA remain the web client.
- `apps/api/`: NestJS/Prisma API remains authoritative for data and exchange workflow.
- No changes to the root npm workspaces, deployments, CI, web routing, backend or database.
- The `mobile/` directory is self-contained and is tracked only on the feature branch.

## Proposed shape

```text
barter-marketplace/
├── apps/
│   ├── web/                      # Existing web / PWA
│   └── api/                      # Existing NestJS server
├── packages/                     # Existing shared npm workspace, if present
└── mobile/
    ├── Cargo.toml                # Isolated Rust workspace
    ├── crates/
    │   └── barter-core/          # Pure portable Rust domain logic
    ├── apps/
    │   ├── ios/                  # Native iOS host (TBD)
    │   └── android/              # Native Android host (TBD)
    └── docs/
        └── ARCHITECTURE.md
```

## Architecture constraints

1. Rust code should implement only client-side functions justified by shared usage, testability, measurable performance or platform portability.
2. Do not put authentication secrets, authoritative transaction validation, exchange settlement or database ownership into the device.
3. Transport contracts must be derived and checked against the current NestJS API before implementation; avoid invented payloads.
4. Mobile visual design must follow the approved Barter references, with platform-specific accessibility and window-inset behavior.
5. Choose UI technology after a spike comparing at least native UI + Rust core and a mature cross-platform alternative. Rust alone does not guarantee smoother UI.
6. Keep mobile dependencies, toolchains and CI separate; no root workspace integration until deliberately approved.
7. Never merge, publish, deploy or request signing credentials as part of the foundation step.

## Next work

- Inventory real backend endpoints, auth/session and Socket.IO usage.
- Define typed API contracts and error shapes from the existing backend.
- Prototype one visually faithful home screen and chat/keyboard layout on actual iOS and Android.
- Measure startup time, memory, scrolling smoothness, development effort and native integration quality.
- Record UI/framework choice in an ADR before expanding app scaffolding.
