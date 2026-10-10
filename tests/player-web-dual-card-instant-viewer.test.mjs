import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';
import {patchPrivatePlayerCards} from '../src/gmww-player-private-card-patch.js';

const player=patchPrivatePlayerCards(gmwwMembersLiveScript);
const worker=fs.readFileSync('src/index.js','utf8');

test('Player scripts remain valid after instant viewer patch',()=>{
  assert.doesNotThrow(()=>new vm.Script(player));
  assert.match(player,/function renderGMWWPlayerCardFace\(kind\)/);
  assert.match(player,/renderGMWWPlayerCardFace\(kind\);\s*armPrivateCardIdle\(\);/);
  assert.doesNotMatch(player,/gmwwInstantPrivateViewer|showGmwwInstantPrivateViewer/);
  assert.match(player,/#gmwwPlayerUnifiedCard\.gmww-face-wolf\{--faction:#ef5555\}/);
  assert.match(player,/#gmwwPlayerUnifiedCard\.gmww-face-artifact\{--faction:#bc92ff\}/);
  assert.match(player,/grid-template-rows:8fr 1fr 3fr/);
  assert.match(player,/type==='wolf'\?'🐾':type==='third'\?'🔥':'🍃'/);
  assert.match(player,/renderGMWWPlayerCardFace\('role'\)/);
  assert.match(player,/const PLAYER_PRIVATE_CARD_IDLE_MS=30000/);
  assert.match(player,/function closePrivateCardViewer\(\)[\s\S]*?if\(face\)face\.hidden=true/);
});

test('Player keeps assigned Artifact pending until its private data arrives',()=>{
  const start=player.indexOf('function privateCardDeliveryPending(){');
  const end=player.indexOf('let gmwwRoleRecoveryAt=',start);
  assert.ok(start>=0&&end>start);
  const state={roomCode:'ABC123',participantId:'member:edge',role:{roleId:'witch'},artifact:null,artifactExpected:true,room:{phase:'role_delivery'}};
  const api=vm.runInNewContext(player.slice(start,end)+';privateCardDeliveryPending',{state,playerScenePolicy:()=>({rolesReleased:true})});
  assert.equal(api(),true);
  state.artifact={artifactId:'crown'};
  assert.equal(vm.runInNewContext(player.slice(start,end)+';privateCardDeliveryPending',{state,playerScenePolicy:()=>({rolesReleased:true})})(),false);
  state.role=null;
  assert.equal(vm.runInNewContext(player.slice(start,end)+';privateCardDeliveryPending',{state,playerScenePolicy:()=>({rolesReleased:true})})(),true);
});

test('Artifact delivery uses committed role snapshot as fallback, never public data',()=>{
  assert.match(worker,/attachedArtifact=roleRows\.find\(r=>r\?\.artifact/);
  assert.match(worker,/artifactExpected:!!currentArtifact/);
  assert.match(worker,/artifact=currentArtifact\?privateArtifact\(currentArtifact\):null/);
  assert.match(player,/state\.artifactExpected=d\?\.artifactExpected===true/);
  assert.match(player,/artifact\.hidden=!state\.artifact&&!waitingArtifact/);
  assert.match(player,/artifact\.disabled=!state\.artifact/);
});

test('Single canonical GM face presents role and artifact with stable artwork URL and proper data',()=>{
  const face=player.slice(player.indexOf('function renderGMWWPlayerCardFace(kind){'),player.indexOf('function syncPlayerPresentation(){'));
  assert.match(face,/const data=kind==='artifact'\?state\.artifact:state\.role/);
  assert.match(face,/const pc=\(kind==='artifact'\?data\.artifactCard:data\.roleCard\)/);
  assert.match(face,/const information=String\(pc\.information\?\?data\.description/);
  assert.match(face,/const img=card\.querySelector\('img'\),src=gmwwPrivateArtworkUrl\(kind\)/);
  assert.match(face,/if\(img\.dataset\.source!==src\)/);
  assert.match(face,/split\('\\n'\)\.map\(x=>x\.trim\(\)\)\.filter\(Boolean\)/);
  assert.match(face,/requestAnimationFrame\(\(\)=>\{/);
  assert.match(face,/while\(body>12&&info\.scrollHeight>info\.clientHeight\+1\)/);
  assert.doesNotMatch(player,/GMWW_PLAYER_INSTANT_VIEWER_CODE/);
});
