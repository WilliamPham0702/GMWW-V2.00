import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';
import {patchPrivatePlayerCards} from '../src/gmww-player-private-card-patch.js';

const result=patchPrivatePlayerCards(gmwwMembersLiveScript);
test('Patched Player Web script parses cleanly and is safe to apply once',()=>{
 assert.ok(result.length>gmwwMembersLiveScript.length);
 assert.doesNotThrow(()=>new vm.Script(result,{filename:'gmww-members-live-patched.js'}));
 assert.equal(patchPrivatePlayerCards(result),result);
});
test('GM release gates both personal face-down cards; no role name leaks in bottom dock',()=>{
 assert.match(result,/function privateCardAllowed\(\)\{return !!\(state\.roomCode&&state\.participantId&&state\.role&&playerScenePolicy\(state\.room\)\.rolesReleased\)\}/);
 assert.match(result,/dock\.hidden=!privateCardAllowed\(\)/);
 assert.match(result,/data-private-card="role"/);
 assert.match(result,/data-private-card="artifact"/);
 assert.match(result,/state\.artifact\?'Chạm để lật':'Không có Artifact'/);
 assert.doesNotMatch(result,/sessionStorage\.getItem\(storageKey\)!==deliveryKey/,'no automatic role reveal');
 const a=result.indexOf('function privateCardAllowed()'),b=result.indexOf('function clearPrivateCardIdle()',a);
 const evalRole=role=>{const ctx={state:{roomCode:'AABBCC',participantId:'member:safari',role,room:{phase:'role_delivery'}},playerScenePolicy:()=>({rolesReleased:true})};
 vm.runInNewContext(result.slice(a,b)+'\nthis.allowed=privateCardAllowed;',ctx);
 return ctx.allowed()};
 assert.equal(evalRole(null),false);assert.equal(evalRole({roleId:'village-seer'}),true);
});
test('Tapping Role or Artifact opens real full-card viewer; idle 30 seconds closes both',()=>{
 assert.match(result,/const PLAYER_PRIVATE_CARD_IDLE_MS=30000/);
 assert.match(result,/openPrivateCardViewer\(b\.dataset\.privateCard\)/);
 assert.match(result,/if\(kind==='role'\)toggleRole\(\);else toggleArtifact\(\)/);
 assert.match(result,/renderRole\(\);setGameViewPane\('role',\{persist:false\}\)/);
 assert.match(result,/setGameViewPane\('village',\{persist:false\}\)/);
 assert.match(result,/Date\.now\(\)-privateCardActivityAt>=PLAYER_PRIVATE_CARD_IDLE_MS/);
 assert.match(result,/state\.roleOpen=false;state\.artifactOpen=false;state\.artifactFocus=''/);
 assert.match(result,/roleBackdrop\.hidden=!showing/);
 assert.match(result,/document\.addEventListener\('visibilitychange'/);
 assert.match(result,/window\.addEventListener\('pagehide'/);
 assert.match(result,/object-fit:contain!important/);
 assert.match(result,/btn\.textContent='← ÚP LÁ · VỀ LÀNG'/);
});
test('Player card modifications do not touch GM face-up card presentation or public player data',()=>{
 const gm=fs.readFileSync('server-game/current/app.js','utf8');
 assert.doesNotMatch(gm,/gmwwPlayerPrivateDock/);
 assert.match(result,/renderPlayerPrivateDock\(\)/);
 assert.match(result,/const artifact=dock\.querySelector\('\[data-private-card="artifact"\]'\)/);
 assert.ok(!result.includes('GM role delivery keeps both cards face down until a player taps.\n  if(policy.phase'));
});
