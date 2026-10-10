import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';
import {patchPrivatePlayerCards} from '../src/gmww-player-private-card-patch.js';

const player=patchPrivatePlayerCards(gmwwMembersLiveScript);
test('Offline-first Player Web builds without side effects on GM/assignment API',()=>{
 assert.doesNotThrow(()=>new vm.Script(player));
 assert.match(player,/function gmwwShufflePrivateDeck\(\)/);
 assert.match(player,/XÁO BÀI/);
 assert.match(player,/data-shuffle-deck/);
 assert.match(player,/#game #gmwwArtifactBar,#game \.gmww-artifact-bar/);
 assert.match(player,/display:none!important/);
 assert.match(player,/function closePrivateCardViewer\(\)\{\n  if\(state\.roleOpen/);
 assert.match(player,/gmwwViewedRoleDeck\.add\(gmwwDeckRoleIdentity\(\)\)/);
 assert.match(player,/if\(shuffle\)shuffle\.hidden=!ready\|\|!state\.artifact/);
 assert.match(player,/deckTop=state\.artifact&&\(gmwwDeckRoleWasViewed\(\)\|\|gmwwDeckPreferredTop==='artifact'\)\?'artifact':'role'/);
 assert.doesNotMatch(player,/\/api\/rooms\/'\+state\.roomCode\+'\/assignments'/);
});
test('Shuffling rearranges visible backs, never changes assigned Role or Artifact',()=>{
 const start=player.indexOf('const gmwwViewedRoleDeck=new Set();');
 const end=player.indexOf('function renderPlayerPrivateDock(){',start);
 assert.ok(start>0&&end>start);
 const state={roomCode:'AABBCC',participantId:'member:safari',room:{matchId:'match1'},role:{assignmentIndex:0,roleId:'witch',viewedAt:null},artifact:{artifactId:'mirror'}};
 let renderCalls=0;const dock={classList:{remove(){},add(){}},offsetWidth:60};
 const ctx={state,Set,privateCardAllowed:()=>true,$:()=>dock,renderPlayerPrivateDock:()=>{renderCalls++},setTimeout(fn){fn()}};
 vm.runInNewContext(player.slice(start,end)+\`\nthis.isSeen=gmwwDeckRoleWasViewed;this.shuffle=gmwwShufflePrivateDeck;this.markSeen=()=>gmwwViewedRoleDeck.add(gmwwDeckRoleIdentity());this.getPreferred=()=>gmwwDeckPreferredTop;\`,ctx);
 assert.equal(ctx.isSeen(),false);
 ctx.shuffle();assert.equal(ctx.getPreferred(),'artifact');assert.equal(renderCalls,1);
 assert.equal(state.role.roleId,'witch');assert.equal(state.artifact.artifactId,'mirror');
 ctx.markSeen();assert.equal(ctx.isSeen(),true);
 state.role={...state.role,roleId:'new-role',viewedAt:null};assert.equal(ctx.isSeen(),false,'changing assigned role must not inherit old viewed status');
 state.role.viewedAt='2026-10-10T17:35:00Z';assert.equal(ctx.isSeen(),true,'server viewed receipt must survive tab restore');
});
test('On reconnect Player fetches private cards before noncritical avatar/village setup',()=>{
 assert.match(player,/void loadAvatars\(\)\.catch\(\(\)=>\{\}\);await restore\(\)/);
 assert.match(player,/const resumed=await autoResumeActiveRoom\(\{stayInVillage:false\}\);if\(!resumed\)await enterVillage\(\)/);
 assert.match(player,/window\.addEventListener\('pagehide',closePrivateCardViewer/);
 assert.match(player,/PLAYER_PRIVATE_CARD_IDLE_MS=30000/);
});
