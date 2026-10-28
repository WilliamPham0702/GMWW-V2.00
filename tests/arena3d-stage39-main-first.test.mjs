// GĐ39 — validate a main-first, STAGING-only slice against the checked-out main.
// This is NOT an official GM bridge or production release approval.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');
const mainPortal=read('server-game/current/GMWW.html');
const settings=JSON.parse(read('wrangler.arena3d-stage14-staging.jsonc'));
const player=read('assets/village/arena-3d/player.mjs');
const room=read('assets/village/arena-3d/room-realtime.mjs');
const live=read('assets/village/arena-3d/live.mjs');

test('GĐ39: Core 2D current main retains explicitly isolated STAGING 3D portal',()=>{
 assert.match(mainPortal,/id="gmwwHomeEnterVillage"/);
 assert.match(mainPortal,/gmwwArena3dQaPortal/);
 assert.match(mainPortal,/THỬ NGHIỆM ARENA 3D/);
 assert.match(mainPortal,/gmww-arena3d-stage14-staging\.williampham0702\.workers\.dev/);
 assert.match(mainPortal,/frame\.src='about:blank'/);
 assert.doesNotMatch(mainPortal,/gmww-arena3d-adopt-room/);
});
test('GĐ39: Arena Worker has isolated DO namespace, not official production binding',()=>{
 assert.equal(settings.name,'gmww-arena3d-stage14-staging');
 assert.equal(settings.main,'src/arena3d-stage-worker.mjs');
 assert.equal(settings.workers_dev,true);
 assert.equal(settings.durable_objects.bindings[0].name,'ROOMS');
 assert.equal(settings.durable_objects.bindings[0].class_name,'RoomDurableObject');
 assert.equal(settings.assets.directory,'./assets');
 assert.equal(settings.services,undefined,'Must not bind official production Worker');
 assert.equal(settings.routes,undefined,'Must not attach Production route');
});
test('GĐ39: Player 3D remains public-only; private actions stay inside Core same-origin iframe',()=>{
 assert.match(player,/rendererCommands\(frame,'3d'\)\.players/);
 assert.match(player,/connectStagingRoom\(\{roomCode:code,loadPublicGallows:false/);
 assert.match(player,/\$\('player-core'\)\.src='\/join\/'\+encodeURIComponent\(code\)/);
 for(const forbidden of [/\/api\/gm\//,/gmToken/,/postMessage\(/,/localStorage/,/sessionStorage/]){
  assert.doesNotMatch(player,forbidden);
 }
 assert.match(room,/shouldAcceptRendererFrame/);
 assert.match(room,/packet\.room\.cycleKey/);
});
test('GĐ39: public Lên Giàn projection and GM-private revoke are still separate',()=>{
 assert.match(player,/gallowsCandidateActorId\(publicBallot/);
 assert.match(live,/createArenaGmRefreshGate/);
 assert.match(live,/field\.setGallowsCandidate\(gallowsId\)/);
 assert.match(live,/arenaAudio\.stop\(\);localVoice\.clear\(\)/);
});
