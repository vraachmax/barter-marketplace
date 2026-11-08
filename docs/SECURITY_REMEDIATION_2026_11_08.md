# Dependency vulnerability remediation — 2026-11-08

## Proven outcomes (draft branch, not production)
- Previous full OSV lockfile scan: **23 findings** in 14 packages: 2 Critical, 8 High, 11 Medium, 2 Low.
- With regenerated and clean-install-validated lockfile (PR #107): **5 findings** in dev tooling: 0 Critical, 0 High, 5 Medium, 0 Low. Results: https://github.com/vraachmax/barter-marketplace/actions/runs/42495190966
- Web and API unit tests passed in the lockfile regeneration job; Next and Nest builds passed. Physical-device and production-deployment acceptance not claimed.
- Full OSV audit remains **red**; never suppress it or claim zero vulnerabilities.
- Production deployment has **not** been changed.

## Patches
- Next.js and matching eslint-config-next 16.4.1
- Multer 2.5.0, including NestJS nested copy
- Upgraded NestJS platform-express within major 11 (11.2.8)
- Vercel Blob 2.8.2
- body-parser >=2.4.0, qs >=6.16.1, undici >=6.29.1, zod >=4.6.6,
  follow-redirects >=1.16.2; full lock gate checks all nested copies.

Two **scoped npm overrides** are required where upstream dependencies have pinned older
versions within the same major interface:
- `@nestjs/platform-express > multer = 2.5.0`
- `@vercel/cli-config > zod = 4.6.7`

These are narrowly scoped dependency resolutions, not excluded security advisories.
Reassess and remove whenever the upstream Nest and Vercel packages declare patched versions
themselves. Do **not** add broad majors to make scan reports green without compatibility tests.
The lock gate remains active in normal web quality CI.

## Remaining OSV medium findings — development dependency toolchain
| Package | Version | Advisory | Fixed version | Chain / constraints |
|---|---|---|---|---|
| deepmerge | 4.3.1 | GHSA-gcqx-w48m-w2h4 | No upstream fix listed | Jest config and fork-ts-checker-webpack-plugin |
| glob | 10.5.0 | GHSA-3g3m-2fjr-6pw4 | 14.0.2 | test-exclude 7.x requires glob 10.x |
| glob | 13.0.6 | GHSA-3g3m-2fjr-6pw4 | 14.0.2 | Jest 30 and Nest CLI 11 require glob 13.x |
| minimatch | 10.2.6 | GHSA-g3hv-75wg-m249 | 11.0.1 | glob 13, test-exclude, TypeScript-eslint |
| minimatch | 9.0.9 | GHSA-g3hv-75wg-m249 | 11.0.1 | glob 10 / test-exclude |

Follow-up: staged modernization of Jest/Nest CLI/ESLint and coverage tooling using upstream
supported versions and full tests. Do **not** override glob 10/13 to 14 or minimatch 9/10
to 11 blindly: those are major API changes. For deepmerge, upstream presently lists no patched
release; remove affected dev tooling when an upstream safe alternative exists.

### Required release gates
1. Clean `npm ci`, secure lockfile gate, full API Jest, web unit tests, Next and Nest builds.
2. Browser acceptance: account, listings, chats, exchange and WebKit.
3. Full OSV audit findings acknowledged with a concrete follow-up; no bypasses of the full scan.
4. Separate review of runtime-only dependency exposure and approval before a production release.
5. Rollback and deployment plan, no migration or environment changes in this PR.

Do not represent a red full OSV audit as clean. No background monitoring is claimed.
