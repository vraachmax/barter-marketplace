import test from 'node:test';
import assert from 'node:assert/strict';
import { applyThemePreference, resolveTheme, getStoredThemePreference, reapplyCurrentTheme, subscribeTheme } from '../src/lib/theme.ts';

test('theme switches immediately, broadcasts, persists and honors system changes', () => {
  const attrs = new Map();
  const storage = new Map();
  const events = new EventTarget();
  let systemDark = true;
  globalThis.window = Object.assign(events, {
    matchMedia: () => ({ matches: systemDark }),
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
  });
  globalThis.document = { documentElement: { setAttribute: (key, value) => attrs.set(key, value), getAttribute: key => attrs.get(key), classList: { toggle: () => {} } } };
  try {
    let changes = 0;
    const unsubscribe = subscribeTheme(() => changes++);
    applyThemePreference('DARK');
    assert.equal(attrs.get('data-theme'), 'dark');
    assert.equal(getStoredThemePreference(), 'DARK');
    applyThemePreference('LIGHT');
    assert.equal(attrs.get('data-theme'), 'light');
    applyThemePreference('SYSTEM');
    systemDark = false;
    reapplyCurrentTheme();
    assert.equal(attrs.get('data-theme'), 'light');
    assert.equal(getStoredThemePreference(), 'SYSTEM');
    assert.equal(changes, 4);
    unsubscribe();
    window.localStorage.getItem = () => { throw new Error('blocked'); };
    window.localStorage.setItem = () => { throw new Error('blocked'); };
    assert.equal(getStoredThemePreference(), null);
    assert.doesNotThrow(() => applyThemePreference('DARK'));
    assert.equal(attrs.get('data-theme'), 'dark');
    assert.equal(resolveTheme('LIGHT'), 'light');
  } finally {
    delete globalThis.window;
    delete globalThis.document;
  }
});
