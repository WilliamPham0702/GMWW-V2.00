import {workerSource} from '../.github/scripts/worker-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';
import {patchPrivatePlayerCards} from '../src/gmww-player-private-card-patch.js';

const player=patchPrivatePlayerCards(gmwwMembersLiveScript);
const worker=workerSource();

test('Player scripts remain valid after instant viewer patch',()=>{
  assert.doesNotThrow(()=>new vm.Script(player));
  assert.match(player,/function renderGMWWPlayerCardFace\(kind\)/);
  assert.match(player,/renderGMWWPlayerCardFace\(kind\);\s*armPrivateCardIdle\(\);/);
  assert.doesNotMatch(player,/gmwwInstantPrivateViewer|showGmwwInstantPrivateViewer/);
  assert.match(player,/#gmwwPlayerUnifiedCard\.gmww-face-wolf\{--faction:#ef5555\}/);
  assert.match(player,/#gmwwPlayerUnifiedCard\.gmww-face-artifact\{--faction:#bc92ff\}/);
  assert.match(player,/grid-template-rows:minmax\(0,8fr\) minmax\(48px,1fr\) minmax\(0,3fr\)/);
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
  assert.match(worker,/artifactExpected:deliveryManifest\.artifactExpected/);
  assert.match(worker,/artifact=currentArtifact\?privateArtifact\(currentArtifact\):null/);
  assert.match(player,/state\.artifactExpected=d\?\.deliveryManifest\?\.artifactExpected===true\|\|d\?\.artifactExpected===true/);
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

test('Player Artifact with a dark left gutter is centered without distorting the artwork',()=>{
  const begin=player.indexOf('function artifactArtworkSideMargins(');
  const end=player.indexOf('function renderGMWWPlayerCardFace(kind){',begin);
  assert.ok(begin>=0&&end>begin,'private Artwork helper exists');
  const helper=player.slice(begin,end);
  const width=240,height=200;
  const pixels=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const p=(y*width+x)*4;
    pixels[p]=x>=36?170:3;
    pixels[p+1]=x>=36?155:3;
    pixels[p+2]=x>=36?220:3;
    pixels[p+3]=255;
  }
  const document={createElement:()=>({
    width:0,height:0,
    getContext:()=>({drawImage(){},getImageData:()=>({data:pixels})})
  })};
  const align=vm.runInNewContext(helper+';gmwwAlignArtifactArtwork',{document});
  const img={naturalWidth:3072,naturalHeight:2560,style:{transform:''}};
  align(img);
  assert.match(img.style.transform,/^translate3d\(-\d+(?:\.\d+)?%,0,0\) scale\(1\.\d+\)$/);
  assert.equal(img.naturalWidth,3072,'image bytes and original aspect are unchanged');
  assert.match(player,/if\(kind==='artifact'\)gmwwAlignArtifactArtwork\(img\)/,'do not transform role art');
  assert.match(player,/img\.style\.removeProperty\('transform'\)/,'reset obsolete transform when switching cards');
});

test('Player card title wraps within the mobile card instead of truncating long Artifact names',()=>{
  assert.match(player,/#gmwwPlayerUnifiedCard \.gmww-card-title\{[^}]*white-space:normal/);
  assert.match(player,/#gmwwPlayerUnifiedCard \.gmww-card-title\{[^}]*overflow-wrap:anywhere/);
  assert.match(player,/#gmwwPlayerUnifiedCard \.gmww-card-zone-head\{[^}]*padding:4px 48px 4px 12px/);
  assert.doesNotMatch(player,/#gmwwPlayerUnifiedCard \.gmww-card-title\{[^}]*white-space:nowrap/);
});
