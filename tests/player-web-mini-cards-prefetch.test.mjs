import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';
import {patchPrivatePlayerCards} from '../src/gmww-player-private-card-patch.js';

const player=patchPrivatePlayerCards(gmwwMembersLiveScript);
const cssKey='style.textContent=';
const cssStart=player.indexOf(cssKey,player.indexOf('function ensurePlayerPrivateDock(){'));
const cssEnd=player.indexOf(';document.head.appendChild(style)',cssStart);
const css=JSON.parse(player.slice(cssStart+cssKey.length,cssEnd));

test('Player folded role/artifact deck is compact like the GM cards, without changing the expanded full card',()=>{
  assert.match(css,/width:min\(42vw,180px\);height:clamp\(106px,16vh,142px\)/);
  assert.match(css,/width:clamp\(76px,22vw,98px\)/);
  assert.match(css,/#gmwwPlayerPrivateDock\.is-solo button\[data-private-card="role"\]/);
  assert.match(css,/data-private-card="artifact"\]/);
  assert.match(css,/#game\[data-private-card-view="open"\] \.role-card-shell\{/);
  assert.match(player,/const PLAYER_PRIVATE_CARD_IDLE_MS=30000/);
  assert.doesNotMatch(player,/renderRole\(\);const game=\$\('#game'\);if\(game\)game\.dataset\.privateCardFocus=kind/);
});

test('First artwork click uses one prewarmed source; no preload before GM release',()=>{
  const start=player.indexOf('const gmwwPrivateArtworkCache=new Map();');
  const end=player.indexOf('function renderPlayerPrivateDock(){',start);
  assert.ok(start>0&&end>start);
  const images=[],state={roomCode:'ABC123',room:{matchId:'match-A',phase:'role_delivery'},
    role:{roleId:'wolf',artworkAssetId:'role:wolf'},artifact:{artifactId:'mirror',artworkAssetId:'artifact:mirror'}};
  let released=false;
  class ImageMock { constructor(){this.decoding='';images.push(this)} set src(v){this._src=v} get src(){return this._src} }
  const context={state,Image:ImageMock,privateCardAllowed:()=>released,encodeURIComponent};
  vm.runInNewContext(player.slice(start,end)+';this.testApi={prime:warmPlayerPrivateArtwork,url:gmwwPrivateArtworkUrl};',context);
  context.testApi.prime();
  assert.equal(images.length,0,'no private artwork leaks to waiting-room players');
  released=true;
  context.testApi.prime();
  assert.equal(images.length,2);
  assert.match(images[0].src,/role%3Awolf\/image\?match=match-A$/);
  assert.match(images[1].src,/artifact%3Amirror\/image\?match=match-A$/);
  context.testApi.prime();
  assert.equal(images.length,2,'repeated room snapshots must not redownload');
  state.room.matchId='match-B';
  state.role.matchId='match-B';
  state.artifact.matchId='match-B';
  context.testApi.prime();
  assert.equal(images.length,4,'new match must load new artwork');
  assert.equal(context.testApi.url('role'),images[2].src);
  assert.equal(context.testApi.url('artifact'),images[3].src);
});

test('Reopening a full card does not reassign an unchanged IMG URL',()=>{
 const faceStart=player.indexOf('function renderGMWWPlayerCardFace(kind){');
 const faceEnd=player.indexOf('function syncPlayerPresentation(){',faceStart);
 assert.ok(faceStart>0&&faceEnd>faceStart);
 const viewer=player.slice(faceStart,faceEnd);
 assert.match(viewer,/if\(img\.dataset\.source!==src\)/);
 assert.match(viewer,/img\.src=src/);
 assert.match(viewer,/gmwwPrivateArtworkUrl\(kind\)/);
 assert.doesNotMatch(viewer,/Date\.now\(\)/);
 assert.doesNotThrow(()=>new vm.Script(player));
});
