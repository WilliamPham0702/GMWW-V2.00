import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicRoomSnapshot} from '../assets/village/arena-3d/room-realtime.mjs';
import {rendererCommands} from '../assets/village/dual-renderer-core.mjs';
const html=readFileSync('assets/village/arena-3d/player.html','utf8');
const js=readFileSync('assets/village/arena-3d/player.mjs','utf8');
const gm=readFileSync('assets/village/arena-3d/live.mjs','utf8');
const gmHtml=readFileSync('assets/village/arena-3d/live.html','utf8');

test('Player 3D does not load or reveal a private GM overlay/role/action and has no GM authorization',()=>{
 assert.match(js,/connectStagingRoom\(\{roomCode:code/);
 assert.match(js,/rendererCommands\(frame,'3d'\)\.players/);
 assert.match(js,/createArenaCharacterField/);
 assert.match(js,/createCoastalVillage/);
 for(const disallowed of [/\/api\/gm\//,/gm-visuals/,/gmToken/,/localStorage/,/sessionStorage/,
   /postMessage\(/,/Authorization\s*:/,/roleId\s*:/,/faction\s*:/]){
   assert.doesNotMatch(js,disallowed,disallowed+' must never occur in Player render-only module');
 }
 assert.match(html,/id="player-core"/);
 assert.ok(js.includes("$('player-core').src='/join/'+encodeURIComponent(code)"));
 assert.doesNotMatch(html,/\bautoplay\b|\bcredential\b|\btoken\b/i);
});
test('Player 3D reuses Core Player Web to handle private cards and votes; GM offers public Player 3D URL',()=>{
 assert.ok(js.includes("$('player-core').src='/join/'+encodeURIComponent(code)"));
 assert.match(gmHtml,/id="join3d"/);
 assert.ok(gm.includes("$('join3d').href='./player.html?room='+encodeURIComponent(code)"));
});
test('Player 3D public projection supports 6–30 participants and strips private payloads',()=>{
 for(const n of [6,12,20,30]){
  const frame=publicRoomSnapshot({room:{code:'ROOM5',seatCount:n,phase:'running',cyclePhase:'night'},
   players:Array.from({length:n},(_,i)=>({participantId:'member:p'+i,seatId:i+1,
    positionX:50,positionY:50,displayName:'P'+i,roleName:'secret_role',faction:'secret_wolf',
    gmToken:'secret_gm',privateCard:{artifact:'secret_artifact'},
    gameCharacterId:'character-'+String(i+1).padStart(2,'0')}))});
  const players=rendererCommands(frame,'3d').players;
  assert.equal(players.length,n);
  assert.deepEqual(players.map(x=>x.seatId),Array.from({length:n},(_,i)=>i+1));
  const serialized=JSON.stringify(frame);
  for(const leak of ['secret_role','secret_wolf','secret_gm','secret_artifact','privateCard'])assert.equal(serialized.includes(leak),false,leak);
 }
});
