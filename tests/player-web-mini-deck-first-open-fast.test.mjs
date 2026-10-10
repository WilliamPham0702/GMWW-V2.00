import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';
import {patchPrivatePlayerCards} from '../src/gmww-player-private-card-patch.js';

const player=patchPrivatePlayerCards(gmwwMembersLiveScript);

test('Village only displays compact face-down cards; big card is isolated to explicit opening',()=>{
  assert.ok(player.includes('role-stage{display:none!important;visibility:hidden!important;pointer-events:none!important}'));
  assert.match(player,/#gmwwPlayerPrivateDock button\{width:clamp\(62px,18vw,78px\)!important\}/);
  assert.match(player,/if\(!\$\('#gmwwCompactPrivateCardStyle'\)\)/);
  assert.match(player,/openPrivateCardViewer\(b\.dataset\.privateCard\)/);
  assert.match(player,/#gmwwPlayerPrivateDock\{width:min\(38vw,154px\)!important;height:clamp\(88px,12vh,112px\)!important\}/);
  assert.match(player,/const PLAYER_PRIVATE_CARD_IDLE_MS=30000/);
  assert.doesNotThrow(()=>new vm.Script(player));
});

test('First tap reuses a prepared viewer and does not prepare private UI before role delivery',()=>{
  const dock=player.slice(player.indexOf('function renderPlayerPrivateDock(){'),player.indexOf('function renderGMWWPlayerCardFace(kind){'));
  assert.match(dock,/if\(!ready\)gmwwRecoverPrivateRole\(\);\s*else \{/);
  assert.match(dock,/warmPlayerPrivateArtwork\(\);/);
  assert.match(dock,/if\(!\$\('#gmwwPlayerUnifiedCard'\)\)/);
  assert.match(dock,/renderGMWWPlayerCardFace\('role'\)/);
  assert.match(dock,/if\(face\)face\.hidden=true/);
  assert.doesNotMatch(player,/gmwwInstantPrivateViewer/);
  assert.match(player,/if\(!privateCardAllowed\(\)\)return;/);
});

test('Role and Artifact use the same stable match-versioned URL as preloaded artwork',()=>{
  const start=player.indexOf('function renderRole(){'),end=player.indexOf('function renderPlayerPrivateDock(){');
  assert.ok(start>0&&end>start);
  const role=player.slice(start,player.indexOf('function ensurePlayerPresentationUi(){',start));
  assert.match(role,/dataset\.gmwwStableRoleUrl!==url/);
  const artifactStart=player.indexOf('function renderArtifactStack(){');
  const artifactEnd=player.indexOf('function toggleArtifact(){',artifactStart);
  assert.match(player.slice(artifactStart,artifactEnd),/dataset\.gmwwStableArtifactUrl!==url/);
  assert.doesNotMatch(role,/img\.src=src\+sep\+'v='\+encodeURIComponent\(String\(r\.matchId\|\|state\.room\?\.matchId\|\|Date\.now\(\)\)\)/);
  assert.match(player,/const revision=encodeURIComponent\(String\(data\.matchId\|\|state\.room\?\.matchId\|\|''\)\)/);
});

test('Artwork images are requested once at release and decoded before the first tap',async()=>{
  const first=player.indexOf('const gmwwPrivateArtworkCache=new Map();');
  const last=player.indexOf('function renderPlayerPrivateDock(){',first);
  assert.ok(first>0&&last>first);
  const images=[];let released=false,decodes=0;
  class FakeImage{
    constructor(){images.push(this);this.complete=true;this.naturalWidth=960}
    set src(v){this._src=v;this.onload?.()}
    get src(){return this._src}
    decode(){decodes++;return Promise.resolve()}
  }
  const ctx={state:{roomCode:'ABC123',room:{matchId:'game-one'},role:{roleId:'seer',artworkAssetId:'role:seer'},artifact:{artifactId:'mirror',artworkAssetId:'artifact:mirror'}},Image:FakeImage,privateCardAllowed:()=>released,encodeURIComponent};
  vm.runInNewContext(player.slice(first,last)+';this.prefetch=warmPlayerPrivateArtwork;',ctx);
  ctx.prefetch();assert.equal(images.length,0,'no private image request before role release');
  released=true;ctx.prefetch();
  assert.equal(images.length,2);
  assert.equal(decodes,2,'both images are decoded off the click path');
  assert.match(images[0].src,/match=game-one/);
  ctx.prefetch();assert.equal(images.length,2,'re-render does not fetch a second copy');
});
