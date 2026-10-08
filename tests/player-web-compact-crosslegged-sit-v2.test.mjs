import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const css=fs.readFileSync(new URL('../assets/village/character-renderer.css',import.meta.url),'utf8');
test('cross-legged sitting uses articulated thighs and shins instead of splayed standing legs',()=>{
  assert.match(css,/gmww-rig-sit-thigh-back[^\n]*rotate\(38deg\)/);
  assert.match(css,/gmww-rig-sit-thigh-front[^\n]*rotate\(-38deg\)/);
  assert.match(css,/gmww-rig-sit-shin-back[^\n]*rotate\(-58deg\)/);
  assert.match(css,/gmww-rig-sit-shin-front[^\n]*rotate\(58deg\)/);
  assert.match(css,/data-state="sitting"[^\n]*\.gmww-rig-leg-back,[\s\S]*\.gmww-rig-leg-front\{display:none!important\}/);
  assert.doesNotMatch(css,/gmww-rig-sit-leg-back/);
  assert.doesNotMatch(css,/gmww-rig-sit-leg-front/);
});
