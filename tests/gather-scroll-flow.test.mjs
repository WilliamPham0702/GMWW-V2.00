import {gmSource} from '../.github/scripts/source-groups.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Gathering toolbar exposes exactly six swipeable actions in order',()=>{
  const html=read('server-game/current/GMWW.html');
  const region=html.match(/<div class="play-gather-toolbar-actions"[^>]*>([\s\S]*?)<\/div>/)?.[1]||'';
  const ids=[...region.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(ids,['playGatherCall','playGatherSeatPreset','playGatherDistribute','playGatherConfirm','playGatherDisband','playRoomModeToggle']);
  assert.match(region,/TẬP HỢP/);assert.match(region,/PHÂN BỐ/);
  assert.match(read('server-game/current/style.css'),/touch-action:pan-x!important/);
});
test('Mode clicks cycle Online, Offline, Demo',()=>{
  const source=gmSource('30-village-and-setup');
  const expr=source.match(/const PLAY_ROOM_MODE_CYCLE=[^\n]+;\nfunction nextPlayRoomMode\([^\n]+\{[\s\S]*?\n\}/)?.[0];
  assert.ok(expr,'mode cycle present');
  const next=Function(expr+'\nreturn nextPlayRoomMode')();
  assert.equal(next('offline',false),'online');
  assert.equal(next('online',true),'offline');
  assert.equal(next('offline',true),'demo');
  assert.equal(next('demo',true),'online');
});
test('Only explicit roster selection can add online members; seat progress gates next actions',()=>{
  const battle=gmSource('40-battle-and-timeline');
  const setup=gmSource('30-village-and-setup');
  const roles=gmSource('50-roles-and-artifacts');
  assert.match(battle,/await openPlayRosterSheet\(\); \/\/ GM chooses members/);
  assert.doesNotMatch(roles,/const online=\(memberAdminState\.members\|\|\[\]\)/);
  assert.match(setup,/if\(seat\)seat.disabled=blocked\|\|!hasMembers/);
  assert.match(setup,/distribute.disabled=blocked\|\|!hasSeat/);
  assert.match(setup,/confirm.disabled=!!playSceneRuntime.busy\|\|\(!locked&&!allPlaced\)/);
  assert.match(battle,/playGatherFlow.distributeMode==='random'/);
});
test('App bundle matches the seven ordered source parts',()=>{
  const parts=['00-core-and-library','10-library-and-settings','20-members-and-roster','30-village-and-setup','40-battle-and-timeline','45-online-chat','50-roles-and-artifacts'];
  assert.equal(read('server-game/current/app.js'),parts.map(n=>gmSource(n)).join(''));
});
