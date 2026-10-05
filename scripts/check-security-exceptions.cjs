const assert = require('node:assert/strict');
const { packages } = require('../package-lock.json');

// The unpatched braces advisory is accepted only for build/lint/test tooling.
// Fail if npm ever resolves it into the production dependency graph.
const braces = Object.entries(packages).filter(([path]) => /(^|\/)node_modules\/braces$/.test(path));
assert(braces.length > 0, 'braces removed: remove its OSV exception as well');
for (const [path, dependency] of braces) {
  assert.equal(dependency.dev, true, `${path}: braces must not become a production dependency`);
  assert.equal(dependency.version, '3.0.3', `${path}: review the exception after any version change`);
}
console.log('PASS braces exception remains limited to dev-only 3.0.3');
