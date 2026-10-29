import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';
import {patchPrivatePlayerCards} from '../src/gmww-player-private-card-patch.js';

const script=patchPrivatePlayerCards(gmwwMembersLiveScript);
const noop=()=>{};
test('resume reaches full roster and realtime connection after authenticated receipt',async()=>{
  const state={token:'t',member:{},roomCode:'',players:[]};
  let connected=0,watched=0;
  const player={participantId:'member:a'},other={participantId:'member:b'};
  const context={state,console,encodeURIComponent,
    savedActiveRoom:()=>({roomCode:'ABCDEF'}),rememberActiveRoom:noop,
    api:async()=>({room:{code:'ABCDEF',phase:'lobby'},player}),
    gmwwAcknowledgePrivateDelivery:noop,restoreCachedRole:noop,applyRoleCardBack:noop,
    renderDrunkDraw:noop,gmwwChatMount:noop,gmwwChatAnnounce:noop,renderPlayerTimeline:noop,renderOnlineActionDock:noop,
    handlePendingInteractions:noop,syncRoleEffects:noop,loadRooms:async()=>{},
    gmwwRefreshPublicRoster:async()=>{state.players=[player,other];return true},
    auth:()=>({}),renderRooms:noop,connectWS:()=>connected++,
    startRoomStateWatch:()=>watched++,sendPresence:noop,enterVillage:async()=>{}};
  const a=script.indexOf('async function autoResumeActiveRoom(');
  const b=script.indexOf('function ensureWebUpdateBanner(',a);
  vm.runInNewContext(script.slice(a,b)+';this.resume=autoResumeActiveRoom;',context);
  assert.equal(await context.resume({stayInVillage:true}),true,'receipt must not abort resume');
  assert.equal(state.players.length,2);
  assert.equal(connected,1);assert.equal(watched,1);
});

test('private receipt installs Role and Artifact without refresh or legacy seat-swap handler',async()=>{
  const state={roomCode:'ABCDEF',participantId:'member:a',token:'t',room:{phase:'lobby'}};
  const role={roleId:'r1'},artifact={artifactId:'a1'};
  const context={state,console,gmwwLastRoomBroadcastAt:0,gmwwLastGallowsBroadcastAt:0,
    setPrivateWolfRecognition:noop,handleSeatSwapRequests:noop,
    gmwwReadPrivateReceipt:async()=>({__gmwwFetchedAt:1,room:{phase:'role_delivery'},role,artifact}),
    renderGallowsWidget:noop,handlePendingInteractions:noop,syncRoleEffects:noop,
    renderPlayerPrivateDock:noop,gmwwAcknowledgePrivateDelivery:noop,
    renderDrunkDraw:noop,gmwwChatAnnounce:noop,renderPlayerTimeline:noop,renderOnlineActionDock:noop,renderDemoActions:noop,
    rememberActiveRole:noop,renderRole:noop,maybeOpenGame:noop,restoreCachedRole:noop};
  const a=script.indexOf('async function refreshPrivateRole(force=false){');
  const b=script.indexOf('async function ensureRoleGameView(',a);
  vm.runInNewContext(script.slice(a,b)+';this.refresh=refreshPrivateRole;',context);
  assert.equal(await context.refresh(true),true,'receipt must reach card assignment');
  assert.equal(state.role,role);assert.equal(state.artifact,artifact);
});
