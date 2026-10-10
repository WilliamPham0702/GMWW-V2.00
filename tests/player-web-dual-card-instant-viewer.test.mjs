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
  assert.match(player,/function showGmwwInstantPrivateViewer\(kind\)/);
  assert.match(player,/renderGMWWPlayerCardFace\(kind\);\s*showGmwwInstantPrivateViewer\(kind\);/);
  assert.match(player,/gmwwInstantPrivateViewer/);
  assert.match(player,/const PLAYER_PRIVATE_CARD_IDLE_MS=30000/);
  assert.match(player,/function closePrivateCardViewer\(\)[\s\S]*?viewer\.hidden=true/);
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
  assert.match(worker,/artifactExpected:!!attachedArtifact/);
  assert.match(worker,/artifact=currentArtifact\?privateArtifact\(currentArtifact\):null/);
  assert.match(player,/state\.artifactExpected=d\?\.artifactExpected===true/);
  assert.match(player,/artifact\.hidden=!state\.artifact&&!waitingArtifact/);
  assert.match(player,/artifact\.disabled=!state\.artifact/);
});

test('Viewer is independent of legacy role pane and card pictures reuse stable URL',()=>{
  assert.match(player,/document\.body\.appendChild\(pane\)/);
  assert.match(player,/pane\.hidden=false/);
  assert.match(player,/const img=pane\.querySelector\('img'\),message=pane\.querySelector\('\.gmww-instant-art span'\),url=gmwwPrivateArtworkUrl\(kind\)/);
  assert.match(player,/if\(img\.dataset\.url!==url\)/);
  assert.doesNotMatch(player,/GMWW_PLAYER_INSTANT_VIEWER_CODE/);
});
