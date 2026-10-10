# Dependency acceptance, 2026-10-10

PR #56 full OSV run 37431985166 blocked on three advisories in the previous
lockfile. No new suppression was added and the existing audit gates remain.

- proxy-addr 2.0.7 → 2.0.8: GHSA-jqcg-44mw-7w3h, incorrect trust for
  IPv4-mapped IPv6 subnets. Upstream patch:
  https://github.com/jshttp/proxy-addr/security/advisories/GHSA-jqcg-44mw-7w3h
- source-map-js 1.2.1 → 1.2.2: GHSA-68fv-2mgg-jv7q, indexed map offset DoS.
  https://github.com/advisories/GHSA-68fv-2mgg-jv7q
- sprintf-js 1.0.3: GHSA-hp3w-g68c-fv3c, unbounded formatting precision.
  No patched version reported. Removed rather than suppressed:
  https://github.com/advisories/GHSA-hp3w-g68c-fv3c

The only sprintf-js path was dev tooling: ts-jest → Jest transform →
babel-plugin-istanbul → @istanbuljs/load-nyc-config → js-yaml 3 → argparse 1.
The loader uses `js-yaml.load`, supported in v4. Override js-yaml to the
already-resolved 4.3.2; no application YAML interface changed. A root dev-only
anchor for @istanbuljs/load-nyc-config ensures npm applies the workspace override
consistently (without it npm retained stale nested entries/invalid resolution).
Obsolete nested lock entries were removed and npm regenerated the lock, then
clean npm ci succeeded. npm ls js-yaml reports the override without errors.

Regression tests assert sprintf-js absence and exercise a real YAML fixture
through loadNycConfig: booleans, numbers, arrays and kebab-case config names.
85 web tests, 248 API tests and both production builds passed locally.
This does not establish a clean full OSV scan: remote repeat remains required.
Existing braces/effect exceptions are unchanged, not broadened.
