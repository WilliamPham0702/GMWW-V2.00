import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';
import {patchPrivatePlayerCards} from '../src/gmww-player-private-card-patch.js';

const player=patchPrivatePlayerCards(gmwwMembersLiveScript);
const gm=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');

test('Gọi Người: short, emphasized, accessible single-row confirmation buttons',()=>{
 const sheet=html.slice(html.indexOf('<div class="sheet hidden" id="playRosterSheet">'),html.indexOf('<div class="sheet hidden" id="playSeatSheet">'));
 assert.match(sheet,/id="playRosterCancel"[^>]*>HỦY<\/button>/);
 assert.match(sheet,/id="playRosterSave"[^>]*>XÁC NHẬN<\/button>/);
 assert.match(sheet,/id="playRosterSelectAll"[^>]*>CHỌN TẤT CẢ<\/button>/);
 assert.match(sheet,/id="playRosterSaveStatus"[^>]*role="status"[^>]*aria-live="polite"/);
 assert.match(css,/#playRosterSheet \.play-roster-toolbar-v3155\{\s*display:grid!important;grid-template-columns:/);
 assert.match(css,/#playRosterSheet #playRosterSave\{[^}]*linear-gradient/);
});

test('Gọi Người: Server ACK closes modal before heavy follow-up sync and prevents double submit',()=>{
 const start=gm.indexOf('async function savePlayRosterIds(ids){');
 const end=gm.indexOf('\nasync function savePlayRoster(){',start);
 assert.ok(start>=0&&end>start);
 const save=gm.slice(start,end);
 assert.match(save,/if\(playSceneRuntime\.busy\|\|playRosterSaving\)return/);
 assert.match(save,/playRosterSaving=true;playSetBusy\(true\)/);
 assert.match(save,/data\?\.ok!==true\|\|Number\(data\.selectedCount\)!==ids\.length/);
 const close=save.indexOf('playRosterSaving=false;closePlayRosterSheet()');
 const redraw=save.indexOf('renderPlayScene()',close);
 const sync=save.indexOf('setTimeout(()=>',redraw);
 assert.ok(close>=0&&redraw>close&&sync>redraw,'Modal closes on POST ACK; sync is deferred');
 assert.doesNotMatch(save,/await playSyncRoom\(true\)/);
 assert.match(save,/playRosterSaveFeedback\(message,true\)/);
});

test('Player Web Artifact open/close and deck swapping each use existing page-flip audio',()=>{
 assert.doesNotThrow(()=>new vm.Script(player));
 assert.match(player,/function toggleArtifact\(\)\{[\s\S]*?state\.artifactOpen=!state\.artifactOpen;playPageFlipSound\(state\.artifactOpen\)/);
 assert.match(player,/function gmwwDeckBringToFront\(kind\)\{[\s\S]*?gmwwDeckPreferredTop!==kind&&typeof playPageFlipSound==='function'\)playPageFlipSound\(true\)/);
 assert.match(player,/function closePrivateCardViewer\(\)\{[\s\S]*?if\(\(state\.roleOpen\|\|state\.artifactOpen\)\&\&typeof playPageFlipSound==='function'\)playPageFlipSound\(false\)/);
});

test('Player Web retries authenticated delivery until the current role and Artifact manifest is complete',async()=>{
 const begin=player.indexOf('let gmwwLiveDeliveryTimer=null');
 const end=player.indexOf('async function refreshPrivateRole(force=false){',begin);
 assert.ok(begin>=0&&end>begin);
 const watch=player.slice(begin,end);
 const state={roomCode:'ABC123',participantId:'member:test',token:'private',
   room:{phase:'role_delivery',matchId:'m1',deliveryVersion:4},
   role:null,roles:[],artifact:null,privateDeliveryManifest:null};
 let tick=null,reads=0,starts=0,stops=0;
 const ctx={state,Promise,document:{hidden:false},
   playerScenePolicy:room=>({rolesReleased:room.phase==='role_delivery'}),
   setInterval:fn=>{starts++;tick=fn;return starts},
   clearInterval:()=>{stops++},
   refreshPrivateRole:async()=>{reads++;return false}};
 vm.runInNewContext(watch+';this.watch=gmwwEnsureLiveDeliveryWatch;this.complete=gmwwLiveDeliveryComplete;',ctx);
 ctx.watch();assert.equal(starts,1);
 tick();await Promise.resolve();assert.equal(reads,1);
 state.role={roleId:'seer'};state.roles=[state.role];state.artifact={artifactId:'mirror'};
 state.privateDeliveryManifest={schemaVersion:1,complete:true,matchId:'m1',deliveryVersion:4,roleCount:1,artifactExpected:true};
 assert.equal(ctx.complete(),true);
 ctx.watch();assert.equal(stops,1,'stop polling once both cards are available');
 state.room.deliveryVersion=5;
 assert.equal(ctx.complete(),false,'an old receipt cannot satisfy a new GM delivery');
 ctx.watch();assert.equal(starts,2,'restart when the GM publishes a newer delivery');
});
