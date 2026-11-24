import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LIVE_BANK,liveLine} from '../src/gmww-live-lines.js';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('LIVE lines are public-only and fill placeholders',()=>{
  const text=JSON.stringify(LIVE_BANK);
  assert.doesNotMatch(text,/Tiên Tri|Phù Thuỷ|Bảo Vệ|Thợ Săn/);
  for(const label of Object.keys(LIVE_BANK))for(const tone of LIVE_BANK[label])assert.ok(tone.length>0);
  assert.match(liveLine('accuse','a',{t:'ghế 5'}),/ghế 5/);
  assert.doesNotMatch(liveLine('agree','a',{s:'ghế 2'}),/\{/);
});
test('LIVE is a DEMO room flag exposed publicly and wired in worker/client',()=>{
  assert.match(read('src/gmww-public-room-contract.js'),/live:m\.live===true/);
  assert.match(read('src/worker/room/gm-room-control.js'),/meta\.live=desiredLive/);
  const runner=read('src/gmww-demo-runner.js');
  assert.match(runner,/liveSay/);assert.match(runner,/type:'live_line'/);
  const app=read('server-game/current/app.js');
  assert.match(app,/PLAY_ROOM_MODE_CYCLE=\['online','offline','demo','live'\]/);
  assert.match(app,/patch.live=target==='live'/);assert.match(app,/liveShowBubble/);
});
