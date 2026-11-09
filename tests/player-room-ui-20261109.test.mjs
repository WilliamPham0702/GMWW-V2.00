import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gmwwMembersLiveScript as script} from '../src/gmww-members-live.js';

const part=readFileSync(new URL('../src/player-web-src/37-player-rooms.part',import.meta.url),'utf8');

test('shipped Player Web script contains the player-room panel and it parses',()=>{
  assert.ok(script.includes('gmwwPlayerRooms'));
  assert.doesNotThrow(()=>new Function(script));
});
test('panel only talks to the player-room API and never to GM routes or tokens',()=>{
  const urls=[...part.matchAll(/'(\/api\/[^']*)'/g)].map(m=>m[1]);
  assert.ok(urls.length>=2);
  for(const u of urls)assert.match(u,/^\/api\/player-rooms/,u);
  assert.doesNotMatch(part,/gmToken|gm-observer|\/api\/gm\/|assignments|roleId\b.*assign/);
});
test('owner actions used by the panel are exactly the ones the Worker whitelists',()=>{
  const used=[...part.matchAll(/callOwner\('([a-z-]+)'/g)].map(m=>m[1]);
  const allowed=['template','seat-lock','seats-randomize','start','kick','end','stage','room-settings'];
  assert.ok(used.length>=7);for(const u of used)assert.ok(allowed.includes(u),u);
});
test('owner token is kept only under its own storage key and cleared when the room closes',()=>{
  assert.match(part,/KEY='gmwwOwnedRoom'/);assert.match(part,/save\(null\)/);
});
test('assembler lists the new part in order after the GM observer',()=>{
  const a=readFileSync(new URL('../.github/scripts/assemble-player-web.mjs',import.meta.url),'utf8');
  assert.ok(a.indexOf("'36-gm-observer.part'")<a.indexOf("'37-player-rooms.part'")&&a.indexOf("'37-player-rooms.part'")<a.indexOf("'40-cards-and-game.part'"));
});

test('server bottom bar is bundled from the GM app, the plus button and Top 3 are gone',()=>{
  assert.ok(script.includes('gmTopMenu')&&script.includes('playPhasePill'));
  assert.doesNotMatch(part,/gmww-pr-fab|'＋'/);
  assert.match(part,/#gmwwSetupTop3\{display:none!important\}/);
  assert.match(part,/GMWW_SERVER_MENU\.dock/);
  assert.match(part,/gmwwOpenCreateRoom/);
});
