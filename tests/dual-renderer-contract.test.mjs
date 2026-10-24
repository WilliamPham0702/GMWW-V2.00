import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPublicRendererFrame,rendererCommands,shouldAcceptRendererFrame,projectAuthorizedVisualEvents,DUAL_RENDERER_SCHEMA} from '../assets/village/dual-renderer-core.mjs';
import {fromAuthoritativePublicRoom,pairedRendererCommands} from '../src/gmww-dual-renderer-projection.js';

const meta={code:'ABC123',phase:'role_delivery',gmStage:'room',matchId:'m-1',matchRevision:2,gmStageRevision:7,deliveryVersion:3,resetVersion:1,seatCount:12,cycleNight:1,privateToken:'TOP-SECRET'};
const publicPlayers=[
  {participantId:'p1',displayName:'An',seatId:1,gameCharacterId:'character-01',positionX:24,positionY:55,
    online:true,statusTags:[{statusId:'protected',label:'Bảo Vệ',icon:'🛡️'}],
    roleName:'Sói',faction:'wolf',token:'secret',privateCards:[{role:'Sói'}]},
  {participantId:'p2',displayName:'Bình',seatId:2,gameCharacterId:'character-02',positionX:75,positionY:52,online:false},
  {participantId:'gm',displayName:'GM',kind:'gm',positionX:50,positionY:64}
];

test('Dual Renderer: real authoritative Room DTO feeds 2D and 3D with identical game/seat/status facts',()=>{
  const before=structuredClone({meta,publicPlayers});
  const {frame,twoD,threeD}=pairedRendererCommands(meta,publicPlayers);
  assert.equal(frame.schema,DUAL_RENDERER_SCHEMA);
  assert.equal(frame.room.gmStage,'deal');
  assert.equal(frame.room.deliveryVersion,3);
  assert.deepEqual(twoD.room,threeD.room);
  assert.deepEqual(twoD.players.map(p=>[p.id,p.seatId,p.statusTags]),threeD.players.map(p=>[p.id,p.seatId,p.statusTags]));
  assert.deepEqual(twoD.players[0].position,{x:24,y:55});
  assert.deepEqual(threeD.players[0].position,{x:-2.6,y:0,z:0.5});
  assert.deepEqual({meta,publicPlayers},before,'adapter cannot mutate authoritative game state');
});

test('Dual Renderer: public allowlist blocks private assignments, secrets, actions for both viewers',()=>{
  const frame=fromAuthoritativePublicRoom(meta,publicPlayers);
  const serialized=JSON.stringify(frame);
  for(const secret of ['TOP-SECRET','privateToken','privateCards','faction','roleName','wolf','secret'])assert.equal(serialized.includes(secret),false,secret);
  assert.equal(frame.players[0].statusTags[0].statusId,'protected');
  assert.equal(JSON.stringify(rendererCommands(frame,'2d')).includes('privateCards'),false);
  assert.equal(JSON.stringify(rendererCommands(frame,'3d')).includes('privateCards'),false);
});

test('Dual Renderer: fail closed on missing roster; dedupe and cap at 30 players plus one GM',()=>{
  assert.throws(()=>createPublicRendererFrame({room:meta}),/INVALID_PUBLIC_FRAME/);
  const many=Array.from({length:34},(_,i)=>({participantId:'p'+i,seatId:i+1}));
  const frame=createPublicRendererFrame({room:meta,players:[...many,many[0],{participantId:'gm',kind:'gm'}]});
  assert.equal(frame.players.length,31);
  assert.equal(frame.players.filter(x=>x.kind==='gm').length,1);
  assert.throws(()=>rendererCommands(frame,'4d'),/INVALID_RENDERER_COMMAND/);
});

test('Dual Renderer: stale revisions must not reopen previous match or delivered roles',()=>{
  const v1=fromAuthoritativePublicRoom(meta,publicPlayers);
  const behind=fromAuthoritativePublicRoom({...meta,deliveryVersion:2},publicPlayers);
  const next=fromAuthoritativePublicRoom({...meta,matchId:'m-2',matchRevision:3,deliveryVersion:0},publicPlayers);
  assert.equal(shouldAcceptRendererFrame(v1,behind),false);
  assert.equal(shouldAcceptRendererFrame(v1,next),true);
  assert.equal(shouldAcceptRendererFrame(next,v1),false);
  assert.equal(shouldAcceptRendererFrame(v1,{schema:'unknown'}),false);
});

test('Dual Renderer: unreleased/private effects require server-side authorization; cross-match denied',()=>{
  const events=[
    {eventId:'e-public',matchId:'m-1',kind:'vote',visibility:'public',released:true,targetId:'p1',label:'3 phiếu'},
    {eventId:'e-night',matchId:'m-1',kind:'attack',visibility:'gm',released:false,targetId:'p2',actorId:'wolf01',roleName:'Sói'},
    {eventId:'e-other',matchId:'m-2',kind:'inspect',visibility:'public',released:true,targetId:'p1'},
    {eventId:'e-unreleased',matchId:'m-1',kind:'inspect',visibility:'public',released:false,targetId:'p1'}
  ];
  const everyone=projectAuthorizedVisualEvents(events,{matchId:'m-1'});
  assert.deepEqual(everyone.map(x=>x.eventId),['e-public']);
  const authorized=projectAuthorizedVisualEvents(events,{matchId:'m-1',authorizePrivate:e=>e.visibility==='gm'});
  assert.deepEqual(authorized.map(x=>x.eventId),['e-public','e-night']);
  assert.equal(JSON.stringify(authorized).includes('wolf01'),false);
  assert.equal(JSON.stringify(authorized).includes('roleName'),false);
  assert.equal(projectAuthorizedVisualEvents(events,{matchId:'wrong'}).length,0);
});

test('Dual Renderer: production 2D files are untouched; 3D preview cannot call live APIs or store state',()=>{
  const preview=readFileSync('assets/village/arena-3d/main.mjs','utf8');
  assert.match(preview,/dual-renderer-core\.mjs/);
  assert.doesNotMatch(preview,/fetch\s*\(|\/api\/rooms|new WebSocket|localStorage|sessionStorage/);
  const projection=readFileSync('src/gmww-dual-renderer-projection.js','utf8');
  assert.match(projection,/gmww-public-room-contract\.js/);
  assert.doesNotMatch(readFileSync('src/index.js','utf8'),/gmww-dual-renderer-projection\.js/);
});

test('Dual Renderer: CI scope classifier recognizes ONLY the explicit new architecture files',async()=>{
  const {classifyBrowserScope}=await import('../.github/scripts/ci-browser-scope.mjs');
  const changes=[
    {path:'assets/village/dual-renderer-core.mjs',status:'A'},
    {path:'assets/village/arena-3d/main.mjs',status:'A'},
    {path:'src/gmww-dual-renderer-projection.js',status:'A'},
    {path:'tests/dual-renderer-contract.test.mjs',status:'A'}
  ];
  assert.equal(classifyBrowserScope(changes),'dual-renderer');
  assert.equal(classifyBrowserScope([...changes,{path:'src/index.js',status:'M'}]),'full');
  assert.equal(classifyBrowserScope([{path:'server-game/current/app.js',status:'M'}]),'full');
});
