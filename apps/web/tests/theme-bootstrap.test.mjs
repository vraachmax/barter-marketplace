import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { THEME_BOOTSTRAP } from '../src/lib/theme-bootstrap.ts';

test('before hydration chrome follows the app theme, not a conflicting system theme', () => {
  for (const [preference, systemDark, expected] of [
    ['LIGHT', true, 'light'], ['DARK', false, 'dark'],
    ['SYSTEM', true, 'dark'], ['SYSTEM', false, 'light'],
    [null, true, 'light'], ['invalid', true, 'light'],
  ]) {
    const attrs = new Map();
    const root = { style: {}, setAttribute: (k, v) => attrs.set(k, v), classList: { toggle() {} } };
    let meta;
    const context = {
      localStorage: { getItem: () => preference },
      window: { matchMedia: () => ({ matches: systemDark }) },
      location: { pathname: '/' },
      document: { documentElement: root, querySelector: () => meta, createElement: () => ({}), head: { appendChild: value => { meta = value; } } },
    };
    runInNewContext(THEME_BOOTSTRAP, context);
    assert.equal(attrs.get('data-theme'), expected);
    assert.equal(root.style.colorScheme, expected);
    assert.equal(meta.content, expected === 'dark' ? '#141519' : '#FFFFFF');
    const existing = meta;
    context.localStorage.getItem = () => expected === 'dark' ? 'LIGHT' : 'DARK';
    runInNewContext(THEME_BOOTSTRAP, context);
    assert.equal(meta, existing);
    assert.equal(meta.content, expected === 'dark' ? '#FFFFFF' : '#141519');
    context.location.pathname = '/games/barter-dash';
    runInNewContext(THEME_BOOTSTRAP, context);
    assert.equal(meta.content, '#060914');
    context.location.pathname = '/';
    context.localStorage.getItem = () => { throw new Error('storage denied'); };
    runInNewContext(THEME_BOOTSTRAP, context);
    assert.equal(meta.content, '#FFFFFF');
  }
});
