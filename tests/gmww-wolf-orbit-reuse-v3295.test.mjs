import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const gmPart=readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const gmCss=readFileSync('server-game/current/style.css','utf8');
const statusCss=readFileSync('server-game/current/status-visuals.css','utf8');
const player=readFileSync('src/player-web-src/35-online-chat.part','utf8');
const bundled=readFileSync('src/gmww-members-live.js','utf8');
const statusJs=readFileSync('assets/status-visuals.js','utf8');
const keyframe=statusCss.match(/@keyframes gmwwSvVerticalOrbit\\{[^\\n]+\\}/)?.[0];
test('The original wolf-bite animation remains the single canonical GM keyframe',()=>{
  assert.ok(keyframe);
  assert.match(statusJs,/wolf_bitten:\\['🐺'\\]/);
  assert.match(statusJs,/class=\\\"gmww-sv-orbit-item\\\"/);
  assert.match(gmCss,/animation:gmwwSvVerticalOrbit 6s linear infinite!important/);
  assert.ok(!gmCss.includes('gmwwCharacterBodyOrbit'));
});
test('Turn and target reuse wolf DOM + six staggered icons on Server',()=>{
  assert.match(gmPart,/className='battle-orbit gmww-sv-orbit'/);
  assert.match(gmPart,/item\\.className='gmww-sv-orbit-item'/);
  assert.match(gmPart,/kind=actorOn\\?'actor':'target',count=6/);
  assert.match(gmPart,/\\(-6\\*k\\/count\\)\\.toFixed\\(4\\)/);
  assert.match(gmPart,/kind==='actor'\\?'🫧':'🐦‍🔥'/);
});
test('Player Web uses identical animation keyframe / speed / stagger',()=>{
  assert.ok(player.includes(keyframe),'Player copied keyframe must match original wolf keyframe bytes');
  assert.match(player,/animation:gmwwSvVerticalOrbit 6s linear infinite/);
  assert.match(player,/className='gmww-online-orbit gmww-sv-orbit'/);
  assert.match(player,/item\\.className='gmww-sv-orbit-item'/);
  assert.match(player,/kind=actor\\?'actor':'target',count=6/);
  assert.match(player,/kind==='actor'\\?'🫧':'🐦‍🔥'/);
  assert.ok(!player.includes('gmww-player-character-orbit'));
});
test('The compiled Player Web reflects exact authored part',()=>{
  const prefix='export const gmwwMembersLiveScript = ';
  assert.ok(bundled.startsWith(prefix));
  const full=JSON.parse(bundled.slice(prefix.length).trim().replace(/;$/,''));
  assert.ok(full.includes(player));
});
