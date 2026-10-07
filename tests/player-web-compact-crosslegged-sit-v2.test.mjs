import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync(new URL('../assets/village/character-renderer.css',import.meta.url),'utf8');

test('cross-legged sitting pose stays compact instead of splayed',()=>{
  assert.match(css,/gmww-rig-sit-leg-back[\s\S]*translate\(-6%,17%\) rotate\(22deg\) scale\(\.92,\.93\)/);
  assert.match(css,/gmww-rig-sit-leg-front[\s\S]*translate\(6%,17%\) rotate\(-22deg\) scale\(\.92,\.93\)/);
  assert.doesNotMatch(css,/gmww-rig-sit-leg-back[^\n]*rotate\(34deg\)/);
  assert.doesNotMatch(css,/gmww-rig-sit-leg-front[^\n]*rotate\(-34deg\)/);
  assert.match(css,/gmww-rig-sit-body[^\n]*translateY\(9%\) scaleY\(\.97\)/);
});
