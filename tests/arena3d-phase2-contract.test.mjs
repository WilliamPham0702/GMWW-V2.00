import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publicRoomSnapshot,publicGallowsScene} from '../assets/village/arena-3d/room-realtime.mjs';
import {rendererCommands,shouldAcceptRendererFrame} from '../assets/village/dual-renderer-core.mjs';

test('Stage 3D consumes the same real-room public DTO as existing 2D, preserves 30 seat identities',()=>{
  for(const n of [6,12,20,30]){
    const payload={ok:true,room:{code:'STAGE1',matchId:'round-1',matchRevision:2,seatCount:n,deliveryVersion:3,
      phase:'running',cyclePhase:'night',cycleNight:2},
      players:Array.from({length:n},(_,i)=>({participantId:'member:test'+i,seatId:i+1,displayName:'Người '+(i+1),
        gameCharacterId:'character-'+String(i+1).padStart(2,'0'),positionX:50+i/10,positionY:50+i/10}))};
    const frame=publicRoomSnapshot(payload);
    const twoD=rendererCommands(frame,'2d'),threeD=rendererCommands(frame,'3d');
    assert.equal(frame.players.length,n);
    assert.deepEqual(twoD.players.map(x=>x.seatId),threeD.players.map(x=>x.seatId));
    assert.deepEqual(twoD.room,threeD.room);
  }
});
test('Stage 3D fails closed on secret Role/Artifact payload mixed into public player state',()=>{
  const frame=publicRoomSnapshot({room:{code:'STAGE1'},players:[{
    participantId:'member:a',displayName:'A',seatId:1,positionX:22,positionY:41,
    roleName:'TIÊN TRI',faction:'SÓI',privateCard:{role:'WOLF'},gmToken:'must-never-escape',
    statusTags:[{statusId:'dead',label:'Đã chết',icon:'💀'}]
  }]});
  const value=JSON.stringify(frame);
  for(const key of ['TIÊN TRI','SÓI','WOLF','privateCard','gmToken','must-never-escape'])assert.equal(value.includes(key),false,key);
  assert.equal(frame.players[0].statusTags[0].statusId,'dead');
});
test('Stage 3D public Gallows projection outputs aggregate votes only, not voter identity',()=>{
  const ballot=publicGallowsScene({stage:'voting',mode:'auto',candidateId:'member:a',
    nominationTotals:[{loginId:'a',votes:4}],voteTotals:{save:3,kill:5},
    nominations:{secretVoter:'a'},votes:{secretVoter:'👎'},eligible:['v1','v2']},{cyclePhase:'morning'});
  assert.equal(ballot.save,3);assert.equal(ballot.kill,5);assert.equal(ballot.stage,'voting');
  assert.equal(JSON.stringify(ballot).includes('secretVoter'),false);
  assert.equal(publicGallowsScene({stage:'voting'},{cyclePhase:'night'}),null);
});
test('Stage 3D rejects stale server frames and requires valid public room roster',()=>{
  assert.throws(()=>publicRoomSnapshot({room:{code:'STAGE1'}}),/INVALID_PUBLIC_ROOM/);
  const latest=publicRoomSnapshot({room:{code:'STAGE1',matchRevision:4,gmStageRevision:8,deliveryVersion:4},players:[]});
  const stale=publicRoomSnapshot({room:{code:'STAGE1',matchRevision:4,gmStageRevision:6,deliveryVersion:3},players:[]});
  assert.equal(shouldAcceptRendererFrame(latest,stale),false);
});
test('Stage uses real Core export with a separate DO namespace and does not touch live production code',()=>{
  const wrapper=readFileSync('src/arena3d-stage-worker.mjs','utf8');
  const config=JSON.parse(readFileSync('wrangler.arena3d-core-stage.jsonc','utf8'));
  assert.match(wrapper,/from '.\/index\.js'/);
  assert.match(wrapper,/export class RoomDurableObject extends GameRoomDurableObject/);
  assert.match(wrapper,/gallowsSnapshot/);
  assert.match(wrapper,/aggregateGallowsOnly/);
  assert.doesNotMatch(wrapper,/nominations:raw\.nominations|votes:raw\.votes|eligible:raw\.eligible/);
  assert.equal(config.name,'gmww-arena3d-core-staging');
  assert.equal(config.main,'src/arena3d-stage-worker.mjs');
  assert.equal(config.durable_objects.bindings[0].name,'ROOMS');
  assert.equal(config.durable_objects.bindings[0].class_name,'RoomDurableObject');
  assert.equal(config.exports.RoomDurableObject.storage,'sqlite');
  assert.equal(config.assets.directory,'./assets');
  assert.equal(config.routes,undefined);
  assert.equal(config.services,undefined);
  assert.equal(config.vars,undefined);
  assert.doesNotMatch(wrapper,/gmww-v2-00\.williampham|new WebSocketPair/);
  assert.match(wrapper,/arena:lastCast:/,'staging-only ephemeral spell cues are allowed');
});
test('Stage live page uses real state adapter, room endpoints and no client authorization bypass',()=>{
  const live=readFileSync('assets/village/arena-3d/live.mjs','utf8');
  const adapter=readFileSync('assets/village/arena-3d/room-realtime.mjs','utf8');
  assert.match(live,/connectStagingRoom/);
  assert.match(live,/api\/rooms/);
  assert.match(live,/api\/gm\/rooms/);
  assert.match(adapter,/new WebSocketImpl/);
  assert.match(adapter,/shouldAcceptRendererFrame/);
  assert.match(adapter,/reloadPublicBallot/);
  assert.doesNotMatch(adapter,/localStorage|sessionStorage|privateRole|privateArtifact/);
  assert.doesNotMatch(live,/localStorage|sessionStorage|gmSyncToken|GM_SYNC_TOKEN/);
});
