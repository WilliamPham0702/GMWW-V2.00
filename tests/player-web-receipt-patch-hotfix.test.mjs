import test from 'node:test';
import assert from 'node:assert/strict';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';
import {patchPrivatePlayerCards} from '../src/gmww-player-private-card-patch.js';

const sourceReceipt="try{const d=await api('/api/rooms/'+state.roomCode+'/me',{headers:auth()});";
const replacedReceipt="try{const d=await gmwwReadPrivateReceipt();if(!d)return false;";

test('Player JS receipt injection compiles and preserves private wolf recognition',()=>{
  assert.equal(gmwwMembersLiveScript.split(sourceReceipt).length-1,1,'exactly one source receipt anchor');
  const script=patchPrivatePlayerCards(gmwwMembersLiveScript);
  assert.notEqual(script,gmwwMembersLiveScript,'patched script must differ from authored source');
  assert.doesNotThrow(()=>new Function(script));
  assert.equal(script.split(replacedReceipt).length-1,1,'one authenticated receipt reader');
  assert.ok(script.includes("if(wolfWakeEpoch===Number(state.wolfWakeEpoch||0))setPrivateWolfRecognition"));
  assert.equal(patchPrivatePlayerCards(script),script,'idempotent');
});

test('login, join, room receipt and reconnect handlers survive Player script patch',()=>{
  const script=patchPrivatePlayerCards(gmwwMembersLiveScript);
  for(const marker of ['/api/members/login','/api/rooms/','function gmwwReadPrivateReceipt(','async function autoResumeActiveRoom(','connectWS(']){
    assert.ok(script.includes(marker),'missing Player entry flow: '+marker);
  }
});

test('unknown receipt source must fail closed instead of serving broken JavaScript',()=>{
  const corrupted=gmwwMembersLiveScript.replace(sourceReceipt,'try{const d=await legacyBrokenReceipt();');
  assert.notEqual(corrupted,gmwwMembersLiveScript);
  assert.throws(()=>patchPrivatePlayerCards(corrupted),error=>String(error).includes('Player receipt patch mismatch'));
});

test('V3.266 Online Chat hooks do not break the login entry script',()=>{
  const authored=gmwwMembersLiveScript;
  assert.ok(authored.includes("renderRooms();gmwwChatMount();gmwwChatAnnounce(d?.audioCue);connectWS();"));
  assert.ok(authored.includes("else if(d.type==='room_cycle'){gmwwChatClear();void gmwwChatRefresh();"));
  const deployed=patchPrivatePlayerCards(authored);
  assert.doesNotThrow(()=>new Function(deployed));
  assert.ok(deployed.includes('window.login=login;'),'login handler must be registered');
  assert.ok(deployed.includes("renderRooms();gmwwChatMount();gmwwChatAnnounce(d?.audioCue);connectWS();"));
  assert.ok(deployed.includes("else if(d.type==='room_cycle'){gmwwChatClear();void gmwwChatRefresh();"));
  assert.ok(deployed.includes("await Promise.allSettled([loadRooms(false),gmwwRefreshPublicRoster(code,state.participantId)]);"));
});
