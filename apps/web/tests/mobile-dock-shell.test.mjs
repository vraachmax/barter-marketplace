import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const shell = read('../src/components/app-viewport.tsx');
const globals = read('../src/app/globals.css');
const fidelity = read('../src/app/reference-fidelity.css');

test('mobile PWA uses one fixed flex-column shell', () => {
  assert.match(globals, /\.app-viewport\s*\{[^}]*position:\s*fixed;[^}]*inset:\s*0;[^}]*display:\s*flex;[^}]*flex-direction:\s*column/s);
  assert.match(globals, /\.app-scroll-root\s*\{[^}]*flex:\s*1 1 auto;[^}]*min-height:\s*0;/s);
  assert.match(shell, /<LiquidBottomNav \/>/);
  assert.ok(shell.indexOf('className="app-scroll-root"') < shell.indexOf('<LiquidBottomNav />'));
});

test('dock is in flow and cannot shrink or be offset upwards', () => {
  const rule = fidelity.match(/\.app-viewport\s*>\s*\.magic-nav\s*\{([^}]+)\}/)?.[1];
  assert.ok(rule);
  assert.match(rule, /position:\s*relative/);
  assert.match(rule, /flex:\s*0 0 auto/);
  assert.match(rule, /inset:\s*auto/);
  assert.match(rule, /height:\s*calc\(55px \+ var\(--mobile-dock-inset\)\)/);
  assert.match(rule, /padding:\s*0 0 var\(--mobile-dock-inset\)/);
  assert.doesNotMatch(fidelity, /--barter-pwa-shell-height|data-keyboard-open|position:\s*absolute\s*!important/);
  assert.doesNotMatch(shell, /screen\.height|visualViewport|--barter-pwa-shell-height/);
  assert.doesNotMatch(globals, /\.magic-nav\s*\{[^}]*bottom:\s*calc\(/s);
});

test('standalone top safe area stays separate from opaque header without its own height', () => {
  assert.match(fidelity, /@media \(display-mode: standalone\)[\s\S]*\.app-viewport\s*\{[^}]*padding-top:\s*max\(54px, var\(--safe-area-top\)\)/);
  assert.match(fidelity, /\.app-viewport \.catalog-mobile-header\s*\{[^}]*backdrop-filter:\s*none;[^}]*isolation:\s*auto;[^}]*filter:\s*none;[^}]*transform:\s*none/s);
  assert.doesNotMatch(fidelity, /height:\s*var\(--barter-pwa-shell-height/);
});
