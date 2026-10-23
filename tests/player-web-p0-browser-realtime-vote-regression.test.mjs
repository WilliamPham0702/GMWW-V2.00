import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';
import {patchPrivatePlayerCards} from '../src/gmww-player-private-card-patch.js';

const player=patchPrivatePlayerCards(gmwwMembersLiveScript);
const worker=readFileSync('src/index.js','utf8');

test('P0: Chrome and Edge receive one parseable live script with a single-tap private role viewer',()=>{
 assert.doesNotThrow(()=>new vm.Script(player));
 const dock=player.slice(player.indexOf('function ensurePlayerPrivateDock(){'),player.indexOf('const gmwwPrivateArtworkCache=new Map();'));
 assert.match(dock,/gmwwPendingPrivateCardTap='';gmwwDeckBringToFront\(kind\);openPrivateCardViewer\(kind\)/);
 assert.doesNotMatch(dock,/gmwwDeckBringToFront\(kind\);return/);
 const scene=player.slice(player.indexOf('function syncPlayerPresentation(){'),player.indexOf('function maybeOpenGame(){'));
 assert.match(scene,/dataset\.privateCardView!=='open'\)setGameViewPane\('village'/);
});

test('P0: partial movement and WS room-state snapshots do not collapse a full roster',()=>{
 const a=player.indexOf('let gmwwRosterRepairTimer=null,');
 const b=player.indexOf('async function autoResumeActiveRoom(',a);
 assert.ok(a>=0&&b>a);
 const state={roomCode:'ROOM12',participantId:'member:a',token:'token',players:[
  {participantId:'member:a',displayName:'A'},
  {participantId:'member:b',displayName:'B'},
  {participantId:'member:c',displayName:'C'}
 ],room:{phase:'running'}};
 const ctx={state,api:async()=>({players:[{participantId:'member:a'}]}),
  encodeURIComponent,gmwwLastRoomBroadcastAt:0,
  console,setTimeout:()=>1,renderRooms:()=>{},syncVillageFrame:()=>{},
  gmwwVerifyMemberBeforeRemoval:async()=>false};
 vm.runInNewContext(player.slice(a,b)+';this.applyRoster=gmwwApplyRoster;this.refreshRoster=gmwwRefreshPublicRoster;',ctx);
 state.players=ctx.applyRoster([{participantId:'member:a'}],'movement');
 assert.equal(state.players.length,3,'movement is a partial update');
 state.players=ctx.applyRoster([{participantId:'member:a'}],'socket');
 assert.equal(state.players.length,3,'a websocket shrink must be verified');
 return ctx.refreshRoster('ROOM12','member:a').then(()=>{
  assert.equal(state.players.length,3,'one transient HTTP shrink must not erase team');
  return ctx.refreshRoster('ROOM12','member:a');
 }).then(()=>assert.equal(state.players.length,1,'two identical confirmed HTTP responses allow an actual leave'));
});

test('P0: a snapshot from another room or without my membership never destroys valid team',()=>{
 const a=player.indexOf('let gmwwRosterRepairTimer=null,'),b=player.indexOf('async function autoResumeActiveRoom(',a);
 const state={roomCode:'ABCDEF',participantId:'member:a',token:'t',
  players:[{participantId:'member:a'},{participantId:'member:b'}],room:{phase:'running'}};
 const ctx={state,api:async()=>({room:{phase:'lobby'},players:[{participantId:'member:z'}]}),
  console,encodeURIComponent,gmwwLastRoomBroadcastAt:0,gmwwVerifyMemberBeforeRemoval:async()=>false,
  setTimeout:()=>1,renderRooms:()=>{},syncVillageFrame:()=>{}};
 vm.runInNewContext(player.slice(a,b)+';this.refreshRoster=gmwwRefreshPublicRoster;',ctx);
 return ctx.refreshRoster('WRONG1','member:a').then(ok=>{
  assert.equal(ok,false);assert.equal(state.players.length,2);assert.equal(state.room.phase,'running');
 });
});

test('P0: compiled Player Web RETAINS every gallows function after private receipt simplification',()=>{
 for(const helper of [
  'function gallowsCurrentStage(){','function gallowsWidget(){','function gallowsDock(){',
  'function renderGallowsWidget(){','async function sendGallowsChoice('
 ])assert.equal(player.split(helper).length-1,1,'missing or duplicated voting helper: '+helper);
 assert.match(player,/function renderGallowsWidget\(\)\{[\s\S]*?dock\.querySelectorAll\('\[data-gallows-vote\]'\)/);
});

test('P0: server gallows pushes authoritative phase, and private replies never roll back newer vote broadcasts',()=>{
 const events=(worker.match(/this\.broadcast\(\{type:"gallows_updated",room:publicRoom\(meta\),gallows:/g)||[]).length;
 assert.equal(events,3,'automatic timer, GM command and Player vote broadcast the full phase');
 assert.match(player,/if\(d\.type==='gallows_updated'\)\{gmwwLastGallowsBroadcastAt=Date\.now\(\);if\(d\.room\)state\.room=d\.room;/);
 assert.match(player,/__gmwwFetchedAt:requestedAt/);
 assert.match(player,/Number\(d\.__gmwwFetchedAt\|\|0\)>=gmwwLastGallowsBroadcastAt/);
 assert.match(player,/gmwwLastRoomBroadcastAt>startedAt\)\{if\(roomCode===state\.roomCode&&participantId===state\.participantId\)void refreshPrivateRole\(true\)/);
 assert.match(player,/state\.players=gmwwApplyRoster\(d\.players,movementEvent\?'movement':'socket'\)/);
 assert.match(player,/state\.players=gmwwApplyRoster\(pub\.players,'http'\)/);
 const ballot=player.slice(player.indexOf('function renderGallowsWidget(){'),player.indexOf('async function sendGallowsChoice(',player.indexOf('function renderGallowsWidget(){')));
 assert.match(ballot,/g\.mode==='gm'/);
 assert.match(ballot,/gallowsCurrentStage\(\)/);
 assert.match(ballot,/dock\.querySelectorAll\('\[data-gallows-vote\]'\)/);
});
