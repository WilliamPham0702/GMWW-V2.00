// Reproduces the iOS Safari first-open misplacement: Player Web must re-lay the
// village whenever the stage is measured again, not only on window resize.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../assets/village/village.mjs', import.meta.url), 'utf8');

test('village re-layouts when the stage size settles (Safari first open)', () => {
  assert.match(src, /new ResizeObserver\(\(\)=>\{render\(\);placeFire\(\);renderPortal\(\)\}\)\.observe\(stageElement\)/);
});

test('village still re-layouts on window resize', () => {
  assert.ok(src.includes("window.addEventListener('resize',()=>{render();placeFire();renderPortal()});"));
});
