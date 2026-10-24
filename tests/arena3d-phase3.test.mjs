import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from '../assets/characters/v5/vendor/three.module.min.js';
import {createArenaCharacterField,atelierPalette,ARENA_ATELIER_VERSION} from '../assets/village/arena-3d/character-atelier.mjs';
import {projectGmOnlyVisuals,redactStagingPublicBroadcast} from '../src/arena3d-visual-effect-policy.mjs';

test('Phase3: 40 palette ids map to varied pastel anime sea chibi materials',()=>{
  const kinds=new Set(Array.from({length:40},(_,i)=>atelierPalette('character-'+String(i+1).padStart(2,'0')).cloth));
  assert.ok(kinds.size>=6);
  assert.ok(ARENA_ATELIER_VERSION.startsWith('arena-chibi'));
});
test('Phase3: 6/12/20/30 chibi actors share fixed draw-call budget, rotate 360 and respond to effects',()=>{
  for(const n of [6,12,20,30]){
    const scene=new THREE.Scene();
    const atelier=createArenaCharacterField(THREE,scene);
    const players=Array.from({length:n},(_,i)=>({id:'member:p'+i,characterId:'character-'+String(i+1).padStart(2,'0'),
      position:{x:Math.cos(2*Math.PI*i/n)*4,z:Math.sin(2*Math.PI*i/n)*4},
      movementStatus:i===0?'moving':'idle',statusTags:i===1?[{statusId:'protected'}]:[]}));
    atelier.setActors(players);
    assert.equal(atelier.actorCount,n);
    assert.ok(atelier.drawBudget<=37,'Instanced meshes should not increase draw calls with players');
    assert.ok(atelier.drawUpdates>0);
    assert.equal(atelier.turnActor('member:p0',Math.PI/2),true);
    assert.equal(atelier.turnActor('member:p0',Math.PI/2),true);
    assert.equal(atelier.turnActor('member:p0',Math.PI/2),true);
    assert.equal(atelier.turnActor('member:p0',Math.PI/2),true);
    for(const kind of ['shield','inspect','heal','attack','vote'])assert.equal(atelier.interact('member:p0',{effect:kind}),true);
    atelier.draw(performance.now()+200,true);
    atelier.setServerEffects([{targetId:'member:p1',kind:'shield',expiresAt:Date.now()+1000}]);
    atelier.draw(performance.now()+300,true);
    const serialized=JSON.stringify(atelier.actors);
    for(const word of ['roleName','faction','gmToken','privateCard','roleId'])assert.ok(!serialized.includes(word));
    assert.equal(atelier.actors[1].statusIds.includes('protected'),true);
    atelier.setActors(players);
    assert.equal(atelier.actorCount,n);
    atelier.setReducedMotion(true);atelier.draw(performance.now()+500,true);
    atelier.clearEffects();atelier.dispose();
  }
});
test('Phase3: unauthorized viewers never receive GM night visuals via the projection contract',()=>{
  const now=Date.now(),time=new Date(now-350).toISOString();
  const rows=[
    {id:'evt-protect',matchId:'m1',cycleKey:'night-1',actionId:'action_protect',loginId:'alice',
      actorId:'wolf-secret',roleName:'Thợ Săn',faction:'wolf',createdAt:time},
    {id:'evt-witch',matchId:'m1',cycleKey:'night-1',actionId:'action_witch_save',loginId:'bob',createdAt:time},
    {id:'evt-wolf',matchId:'m1',cycleKey:'night-1',actionId:'action_wolf_bite',loginId:'bob',createdAt:time},
    {id:'evt-old',matchId:'m0',cycleKey:'night-1',actionId:'action_protect',loginId:'carol',createdAt:time},
    {id:'evt-other-cycle',matchId:'m1',cycleKey:'night-2',actionId:'action_wolf_bite',loginId:'david',createdAt:time},
    {id:'evt-expired',matchId:'m1',cycleKey:'night-1',actionId:'action_protect',loginId:'eve',createdAt:new Date(now-100000).toISOString()},
    {id:'evt-undo',matchId:'m1',cycleKey:'night-1',type:'dead',loginId:'zoe',createdAt:time,undone:true}
  ];
  assert.deepEqual(projectGmOnlyVisuals(rows,{matchId:'m1',cycleKey:'night-1',now}).map(x=>x.kind),['shield','heal','attack']);
  const events=projectGmOnlyVisuals(rows,{matchId:'m1',cycleKey:'night-1',now});
  assert.deepEqual(events.map(x=>x.targetId),['member:alice','member:bob','member:bob']);
  assert.deepEqual(projectGmOnlyVisuals(rows,{matchId:'m0',cycleKey:'night-2',now}),[]);
  assert.deepEqual(projectGmOnlyVisuals(rows,{matchId:null,cycleKey:'night-1',now}),[]);
  const output=JSON.stringify(events);
  for(const privateText of ['wolf-secret','Thợ Săn','faction','roleName','actorId'])assert.ok(!output.includes(privateText));
});
test('Phase3: staging broadcast strips real night target IDs on public WebSockets',()=>{
  const raw={type:'battle_action_confirmed',matchId:'m1',turnId:'secret-turn',
    targets:['alice'],targetIds:['bob'],actorId:'wolf',roleId:'wolf',roleName:'wolf',
    serverTime:123};
  const safe=redactStagingPublicBroadcast(raw);
  assert.equal(safe.type,'battle_action_confirmed');
  assert.equal(safe.serverTime,123);
  assert.ok(!('targets' in safe));
  assert.ok(!('targetIds' in safe));
  assert.ok(!('actorId' in safe));
  assert.ok(!('roleId' in safe));
  assert.equal(JSON.stringify(raw).includes('alice'),true,'source remains unchanged');
  assert.deepEqual(redactStagingPublicBroadcast({type:'room_state',room:{code:'ROOM'}}),{type:'room_state',room:{code:'ROOM'}});
});
test('Phase3: stage file sends GM token only to a server-authorized endpoint, not URL or persistent storage',()=>{
  const live=readFileSync('assets/village/arena-3d/live.mjs','utf8');
  const wrapper=readFileSync('src/arena3d-stage-worker.mjs','utf8');
  assert.match(live,/createArenaCharacterField/);
  assert.match(live,/arena-staging\/rooms/);
  assert.match(live,/privateOverlayCount/);
  assert.match(live,/render\.setPixelRatio/);
  assert.match(live,/document\.hidden/);
  assert.doesNotMatch(live,/localStorage|sessionStorage/);
  assert.match(wrapper,/this\.gmAuthorized\(request\)/);
  assert.match(wrapper,/redactStagingPublicBroadcast/);
  assert.match(wrapper,/projectGmOnlyVisuals/);
  assert.doesNotMatch(wrapper,/GM_SYNC_TOKEN|gmww-v2-00\.williampham0702\.workers\.dev/);
});
