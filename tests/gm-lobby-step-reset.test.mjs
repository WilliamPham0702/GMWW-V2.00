import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const worker=fs.readFileSync('src/index.js','utf8');
const player=fs.readFileSync('src/gmww-members-live.js','utf8');

test('Sảnh chờ is a stage before Tạo phòng, not a separate action button',()=>{
  assert.match(app,/PLAY_STEPS=\['lobby','room','seats','game','roles','deal','battle'\]/);
  assert.match(app,/const base=\{step:'lobby'/);
  assert.match(html,/data-play-step="lobby"/);
  assert.match(html,/data-play-step="room"/);
  assert.doesNotMatch(html,/id="playReturnToLobby"/);
  assert.match(css,/\.play-shell\[data-step="lobby"\] \.play-setup-strip/);
});
test('Back from Tạo phòng resets all rooms only after user confirmation',()=>{
  assert.match(app,/if\(playSceneState\.step==='room'\)\{await playReturnToLobby\(\);return\}/);
  assert.match(app,/if\(step==='lobby'&&playSceneState\.step!=='lobby'\)\{void playReturnToLobby\(\);return\}/);
  assert.match(app,/confirm\('Trở về SẢNH CHỜ\?/);
  assert.match(app,/gmApi\('\/api\/gm\/lobby\/reset'/);
  assert.match(app,/playApplyLobbyStage\(data\.generation\)/);
});
test('Global lobby reset is authenticated and resets and disables every room, preserving accounts',()=>{
  assert.match(worker,/if\(url\.pathname==="\/api\/gm\/lobby\/reset"&&request\.method==="POST"\)/);
  assert.match(worker,/if\(bearer\(request\)!==GM_SYNC_TOKEN\)return j\(\{ok:false,error:"UNAUTHORIZED"\},401\)/);
  const block=worker.slice(worker.indexOf('async function gmLobbyResetAll('),worker.indexOf('async function gmRoomsPurge(',worker.indexOf('async function gmLobbyResetAll(')));
  assert.match(block,/includeEnded=1&includeDisabled=1/);
  assert.match(block,/gmRoomReset\(env,code,resetRequest\)/);
  assert.match(block,/gmRoomEnabled\(env,code,/);
  assert.doesNotMatch(block,/gmRoomDelete\(/);
  assert.doesNotMatch(block,/members\/purge/);
  assert.match(block,/global-settings\/lobby-reset/);
});
test('Existing devices receive forced reset or detect newer lobby generation',()=>{
  assert.match(worker,/this\.broadcast\(\{type:"room_hard_reset"/);
  assert.match(player,/d\.type==='room_hard_reset'/);
  assert.match(app,/generation>Number\(playSceneState\.lobbyGeneration\|\|0\)/);
  assert.match(app,/playApplyLobbyStage\(generation\)/);
});
