import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {immersiveWanted} from '../assets/village/arena-3d/immersive.mjs';
const W=(href,framed)=>{const w={};w.parent=framed?{}:w;return immersiveWanted({href},w)};
test('immersive: chỉ bật khi nhúng hoặc ?immersive=1',()=>{
  assert.equal(W('https://x/live.html',false),false);
  assert.equal(W('https://x/live.html',true),true);
  assert.equal(W('https://x/live.html?immersive=1',false),true);
  assert.equal(W('https://x/live.html?immersive=0',true),false);
});
test('immersive: live.mjs nối đúng và không đổi id điều khiển',()=>{
  const live=readFileSync('assets/village/arena-3d/live.mjs','utf8');
  assert.match(live,/if\(immersiveWanted\(\)\)installImmersive\(\)/);
  const src=readFileSync('assets/village/arena-3d/immersive.mjs','utf8');
  for(const id of ['gm-drawer','gm-dock-open','dock-ballot'])assert.ok(src.includes(id));
});
