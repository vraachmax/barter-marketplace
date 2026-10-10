import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

test('security updates remove sprintf-js and retain patched proxy/source-map versions', () => {
  const { packages } = require('../../../package-lock.json');
  for (const [path, pkg] of Object.entries(packages)) {
    assert(!path.endsWith('/node_modules/sprintf-js') && path !== 'node_modules/sprintf-js');
    if (path.endsWith('node_modules/proxy-addr')) assert.equal(pkg.version, '2.0.8');
    if (path.endsWith('node_modules/source-map-js')) assert.equal(pkg.version, '1.2.2');
    if (path.endsWith('node_modules/handlebars')) assert.equal(pkg.version, '4.7.10');
    if (path.endsWith('node_modules/shell-quote')) assert.equal(pkg.version, '1.11.0');
    if (path.endsWith('node_modules/next')) assert.equal(pkg.version, '16.3.8');
    if (path.endsWith('node_modules/sharp')) assert.equal(pkg.version, '0.35.5');
  }
});

test('Istanbul config loader remains compatible with js-yaml 4 override', async () => {
  const { loadNycConfig } = require('@istanbuljs/load-nyc-config');
  const fixture = fileURLToPath(new URL('./fixtures/security-nyc.yaml', import.meta.url));
  const config = await loadNycConfig({ nycrcPath: fixture });
  assert.equal(config.all, true);
  assert.equal(config.checkCoverage, true);
  assert.equal(config.lines, 80);
  assert.deepEqual(config.include, ['src/**/*.ts']);
  assert.deepEqual(config.exclude, ['src/**/*.spec.ts']);
});
