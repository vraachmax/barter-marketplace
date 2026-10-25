import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const nav = source('../src/app/liquid-navigation.css');
const globalCss = source('../src/app/globals.css');
const reference = source('../src/app/reference-fidelity.css');
const shell = source('../src/components/app-viewport.tsx');

test('mobile dock is anchored once inside the fixed app shell, not the body viewport', () => {
  assert.match(globalCss, /\.app-viewport\s*\{\s*position:\s*fixed;\s*inset:\s*0;/);
  assert.match(shell, /className="app-viewport"/);
  assert.match(shell, /<LiquidBottomNav \/>/);
  assert.match(nav, /\.magic-nav\s*\{\s*position:\s*absolute;\s*left:\s*0;\s*right:\s*0;\s*bottom:\s*0;/);
  const rule = [...reference.matchAll(/^\s*\.app-viewport\s*>\s*\.magic-nav\s*\{/gm)];
  assert.equal(rule.length, 1, 'one mobile dock geometry rule across Safari and PWA');
  assert.match(reference, /\.app-viewport\s*>\s*\.magic-nav\s*\{[^}]*position:\s*absolute;[^}]*bottom:\s*0;/s);
  assert.doesNotMatch(reference, /\.magic-nav\s*\{[^}]*bottom:\s*[^;}]+!important/s);
  assert.doesNotMatch(reference, /\.magic-nav::before/);
  assert.doesNotMatch(globalCss, /\.magic-nav\s*\{[^}]*bottom:/s);
});

test('dock safe-area is included exactly once as padding in shell geometry', () => {
  assert.match(globalCss, /--mobile-dock-inset:\s*clamp\(0px,\s*var\(--safe-area-bottom\),\s*34px\)/);
  const rule = reference.match(/\.app-viewport\s*>\s*\.magic-nav\s*\{([^}]+)\}/)?.[1];
  assert.ok(rule);
  assert.match(rule, /height:\s*calc\(55px \+ var\(--mobile-dock-inset\)\)/);
  assert.match(rule, /padding:\s*0 0 var\(--mobile-dock-inset\)/);
  assert.match(rule, /box-sizing:\s*border-box/);
  assert.doesNotMatch(reference, /position:\s*absolute\s*!important/);
});

test('Barter Dash route does not mount a second dock or reuse shell scroll position', () => {
  assert.match(shell, /if \(pathname\.startsWith\('\/games\/barter-dash'\)\) return children;/);
  assert.match(shell, /scrollRef\.current\?\.scrollTo\(0, 0\)/);
});
