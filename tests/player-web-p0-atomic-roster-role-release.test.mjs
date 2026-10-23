import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';
import {patchPrivatePlayerCards} from '../src/gmww-player-private-card-patch.js';
const compiled=patchPrivatePlayerCards(gmwwMembersLiveScript);
const worker=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
const village=readFileSync(new URL('../src/player-web-src/20-village-and-profile.part',import.meta.url),'utf8');

test('P0 Player Web JS compiles after roster and role recovery patch',()=>{
 assert.doesNotThrow(()=>new vm.Script(compiled));
});
test('P0 room join returns the complete privacy-safe public roster atomically',()=>{
 const start=worker.indexOf('async join(body){');
 const end=worker.indexOf('async ready(body){',start);
 const join=worker.slice(start,end);
 assert.match(join,/const publicRoster=Object\.values\(players\)\.map\(publicPlayer\)/);
 assert.match(join,/return j\(\{ok:true,player:publicPlayer\(player\),players:publicRoster,room:/);
 assert.match(compiled,/state\.players=Array\.isArray\(d\.players\)&&d\.players\.some\(p=>p\.participantId===state\.participantId\)\?d\.players:\[d\.player\]/);
});
test('P0 role release advances even if WS movement and HTTP response interleave',()=>{
 assert.match(compiled,/gmwwLastRoomBroadcastAt<=startedAt\|\|gmwwShouldAdvancePrivatePhase\(d\.room\)/);
 assert.match(compiled,/if\(\(state\.players\|\|\[\]\)\.length<=1\)void gmwwRefreshPublicRoster\(state\.roomCode,state\.participantId\)/);
 assert.match(compiled,/if\(!state\.role\|\|!playerScenePolicy\(state\.room\)\.rolesReleased\)void refreshPrivateRole\(true\)/);
});
test('P0 no roaming move storm after GM starts delivering cards',()=>{
 assert.match(compiled,/return \['lobby','waiting'\]\.includes\(phase\)/);
 const p=worker.slice(worker.indexOf('async playerMove(body){'),worker.indexOf('async playerMoveComplete(body){'));
 assert.match(p,/if\(!\["lobby","waiting"\]\.includes\(phase\)\)/);
});
