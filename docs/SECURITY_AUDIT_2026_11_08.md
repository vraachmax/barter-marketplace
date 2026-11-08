# Barter security audit — 2026-11-08

Scope: static review of the API/auth/media/chat initialization code, dependency lockfile, and GitHub Actions logs on `security/remediate-deps-2026-11-08`. No penetration test, production config inspection, user-data access, authenticated remote testing, or claims of actual exploitation.

## CI / dependency baseline
- GitHub Web quality run 42495707965: success; Messages PostgreSQL acceptance run 42495707934: success.
- Full OSV dependency audit 42495708395: failure (remaining known dev-tooling advisories).
- Earlier fully inspected OSV output: down from 23 findings (2 Critical, 8 High, 11 Medium, 2 Low) to 5 Medium (0 Critical/High) after lockfile patching.
- Remaining: deepmerge 4.3.1 (GHSA-gcqx-w48m-w2h4, no fixed version supplied), glob 10.5.0 and 13.0.6 (GHSA-3g3m-2fjr-6pw4), minimatch 10.2.6 and 9.0.9 (GHSA-g3hv-75wg-m249). All are marked dev dependency by scanner. Do not blanket major-override before Jest/CLI/toolchain compatibility evaluation.
- Remaining unresolved alerts do not establish runtime exploitability; passing dependency tests does not prove the whole application secure.

## P0 — before any new public release

### SEC-01: predictable demo credentials provisioned during API startup
Evidence: `apps/api/src/listings/listings.module.ts` invokes `ListingsService.ensureSeed()` on every module start. `apps/api/src/listings/listings.service.ts` calls this when listing count <24, creating two named demo users with a hard-coded, known password.
Risk: unauthorized access to these accounts and abuse of user features if conditions are reached in a production DB. Exposure is conditional on presence of those accounts and routability; no evidence of actual compromise.
Fix: remove startup seeding; put dev-only fixtures behind explicit non-production environment guard and safe one-shot seed command. Rotate/disable pre-existing fixture identities and invalidate their tokens if present. Preserve existing legitimate listings. Add CI test: startup in production does not create any users or listings.

### SEC-02: cookie-authenticated mutations lack an evident CSRF policy
Evidence: `apps/api/src/auth/extract-jwt-from-request.ts` accepts cookie tokens; `auth.controller.ts` sets `SameSite=None` on HTTPS; `main.ts` enables cross-origin credentials; controllers have mutating POST/PATCH/DELETE endpoints. No global CSRF token or verified Origin/Referer check identified in inspected paths.
Risk: cross-site request forgery on cookie-authenticated write endpoints, depending on browser and content-type request mechanics. CORS restrictions alone do not stop every cross-origin write.
Fix: trusted-origin validation for all cookie-authenticated mutations or synchronizer/double-submit CSRF protection; preserve Authorization Bearer support and existing necessary web origin. Add negative browser/HTTP tests.

### SEC-03: missing server-side brute-force / abuse rate limiting for login and public endpoints
Evidence: public `/auth/login` and `/auth/register` methods; no Nest Throttler/Helmet/rate limiter found in inspected root/main configuration or a repository search. Could be external WAF not visible to this review.
Risk: credential stuffing, registration spam and denial of service.
Fix: enforce shared-store per-IP and per-account rate limits, backoff and observability at edge/API. Validate effect of any existing gateway/WAF before duplicating.

## P1 — prioritize next

### SEC-04: file uploads trust client MIME; no detected content-signature validation
Evidence: `storage/media-storage.service.ts` accepts file.mimetype for image/video/audio classification; `listings.controller.ts` allows 8 MiB and `chats.controller.ts` allows 40 MiB. Stored media is publicly served via express.static or Vercel Blob.
Risk: malformed or disguised uploads, unsafe content presentation and resource consumption. Exploitability depends on served Content-Type, sniffing, storage headers and downstream consumers.
Fix: inspect file signatures with a maintained parser and decode/re-encode image raster where appropriate; strip metadata, set `X-Content-Type-Options: nosniff`, deny active file formats, and verify uploaded media tests including corrupt bytes.

### SEC-05: Yandex OAuth account auto-link on matching email
Evidence: `auth.service.ts::loginWithYandex` automatically associates a provider ID to any existing local user with the same email, using a profile `default_email`; no explicit local-owner confirmation or independently verified-email flag checked in this code path.
Risk: account takeover **if** the provider can return a matching, non-owner-controlled or unverified email; provider guarantees and user identity ownership are not validated in this review.
Fix: require proof of existing account ownership before OAuth linking, or establish and test a provider-verified-email contract. Cover preexisting password account, already-linked provider, email change and collision.

### SEC-06: long-lived JWTs have no identified revocation after password change
Evidence: `auth.module.ts` signs 30-day tokens; `auth.service.ts::changePassword` updates hash then signs new token, while `jwt.strategy.ts` checks that the user exists but no `tokenVersion`/revocation timestamp.
Risk: a previously issued stolen token remains valid until expiry, including after password reset.
Fix: session/token version or rotated refresh-token architecture, invalidate previous sessions on password/security changes; tests for old token rejection.

### SEC-07: security headers and proxy-origin trust require verification
Evidence: `main.ts` serves static uploads without a Helmet/nosniff policy; `auth.controller.ts` determines secure cookie behavior from raw `x-forwarded-proto` header or `req.protocol`.
Risk: inconsistent cookie protections behind reverse proxies and content sniffing depending on infra. Must test trusted proxy configuration; not established as directly exploitable.
Fix: explicit trusted proxy setup, enforce secure cookie mode in production, enforce HTTPS and security headers, and test real reverse proxy behavior.

## Protections already present
- JWT guards on most user mutations; chat service checks participation; Socket.IO connection verifies signed JWT and join-chat checks participation.
- Upload size limits and MIME allowlist; local uploads use randomized file names and guarded path.
- Production JWT_SECRET required; explicit CORS allowlist; input validation pipe with forbidNonWhitelisted.
- Yandex OAuth state + PKCE exchange and timing-safe state check.
- No claims that these alone make production secure.

## Release decision
**Hold release of security PR #107 pending remediation of SEC-01/02 and validation of SEC-03.** Do not merge simply because Critical/High OSV counts reached zero. Keep existing production untouched while adding focused regression tests. Review open Medium dev-only findings separately with explicit risk acceptance, not scanner bypasses. A staging API and browser review are required to confirm cross-origin cookie, media and OAuth behavior.

Evidence references:
- https://github.com/vraachmax/barter-marketplace/pull/107
- https://github.com/vraachmax/barter-marketplace/actions/runs/42495708395
- https://github.com/vraachmax/barter-marketplace/actions/runs/42495707965
- https://github.com/vraachmax/barter-marketplace/actions/runs/42495707934
