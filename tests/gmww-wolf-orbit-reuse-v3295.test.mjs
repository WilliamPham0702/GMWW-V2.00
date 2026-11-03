import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const gmPart=readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const gmCompiled=readFileSync('server-game/current/app.js','utf8');
const gmCss=readFileSync('server-game/current/style.css','utf8');
const statusCss=readFileSync('server-game/current/status-visuals.css','utf8');
const statusJs=readFileSync('assets/status-visuals.js','utf8');
const player=readFileSync('src/player-web-src/35-online-chat.part','utf8');
const bundled=readFileSync('src/gmww-members-live.js','utf8');
const start=statusCss.indexOf('@keyframes gmwwSvVerticalOrbit{');
const keyframe=start>=0?statusCss.slice(start).split('\n')[0]:null;

test('Do not change wolf bite orbit; same keyframe used for turn and target',()=>{
  assert.ok(keyframe?.includes('87.5%'),'Original 🐺 orbit missing');
  assert.ok(statusJs.includes("wolf_bitten:['🐺']"));
  assert.ok(statusJs.includes('gmww-sv-orbit-item'));
  assert.ok(statusCss.includes('animation:gmwwSvVerticalOrbit 6s linear infinite!important'));
  assert.ok(gmCss.includes('gmwwCharacterBodyOrbit'),'Legacy CSS untouched; new DOM spans do not use it');
  assert.ok(!gmPart.includes('gmwwCharacterBodyOrbit'),'New markup must not call legacy orbit');
});
test('GM uses six staggered 🫧 or 🐦‍🔥 nodes with wolf status classes',()=>{
  for(const source of [gmPart,gmCompiled]){
    assert.ok(source.includes("className='battle-orbit gmww-sv-orbit'"));
    assert.ok(source.includes("item.className='gmww-sv-orbit-item'"));
    assert.ok(source.includes("kind=actorOn?'actor':'target',count=6"));
    assert.ok(source.includes("(-6*k/count).toFixed(4)+'s'"));
    assert.ok(source.includes("kind==='actor'?'🫧':'🐦‍🔥'"));
  }
});
test('Player Web shares exact wolf keyframe, six icons and phase',()=>{
  assert.ok(player.includes(keyframe),'Player keyframes differ from 🐺 original');
  assert.ok(player.includes('animation:gmwwSvVerticalOrbit 6s linear infinite'));
  assert.ok(player.includes("className='gmww-online-orbit gmww-sv-orbit'"));
  assert.ok(player.includes("item.className='gmww-sv-orbit-item'"));
  assert.ok(player.includes("kind=actor?'actor':'target',count=6"));
  assert.ok(player.includes("kind==='actor'?'🫧':'🐦‍🔥'"));
  assert.ok(!player.includes('gmww-player-character-orbit'));
});
test('Player bundle contains exactly current authored source',()=>{
  const prefix='export const gmwwMembersLiveScript = ';
  assert.ok(bundled.startsWith(prefix));
  const full=JSON.parse(bundled.slice(prefix.length).trim().replace(/;$/,''));
  assert.ok(full.includes(player));
});
