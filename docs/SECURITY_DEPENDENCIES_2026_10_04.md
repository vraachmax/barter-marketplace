# Dependency review, 2026-10-04

PR #49's OSV full scan found 14 advisories in the existing dependency graph.
The introduced-vulnerabilities check passed, but release work includes fixing
the available runtime/build updates rather than carrying the old versions.

- Next.js and eslint-config-next: 16.3.6, GHSA-vcvr-r3jv-pc5j patch.
- Multer: 2.4.0, including the Nest platform dependency override.
- Engine.IO: 6.6.11; final OSV full/new-vulnerability scans passed on 2026-10-05.
- brace-expansion and fast-uri: patched versions in their existing major lines.

## Temporary dev-only exception

The root dependency on @nestjs/platform-express 11.2.3 anchors the same version
already used by the API so npm 10/11 applies the Multer override across workspace
links (https://github.com/npm/cli/issues/9659). The lockfile must contain only
Multer 2.4.0. Remove this workaround after upgrading to a verified fixed npm.

GHSA-vfj7-8cjw-p6xm / CVE-2026-93687 affects recursive pattern processing in
braces <=3.0.3. The advisory and npm registry provide no patched release today.
The installed chain is eslint-config-next → @next/eslint-plugin-next →
fast-glob → micromatch → braces. All lockfile entries for braces are dev-only.
Application source has no braces/micromatch import or user-supplied glob path;
the affected code processes repository-owned build/lint patterns. This is an
exposure assessment, not a claim that braces itself is patched.

The OSV exception expires 2026-11-04. A separate CI check fails if braces enters
the production graph, changes version, or is removed without removing the
exception. Reassess if build tooling starts processing untrusted patterns.
Remove the exception once an upstream fix is available. Full and newly
introduced vulnerability scans remain enabled; the earlier Prisma exception
is unchanged.

Sources checked:
- https://github.com/advisories/GHSA-vcvr-r3jv-pc5j
- https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- npm registry and the actual package-lock.json / npm ls dependency chain.

CI and deployment outcomes are recorded separately in HANDOFF.md.
