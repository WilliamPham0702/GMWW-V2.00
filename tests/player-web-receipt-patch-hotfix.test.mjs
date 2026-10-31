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

test('V3.273 Online Chat resume does not break the served login JavaScript',()=>{
  // Regression: a changed Online timeline/action tail made the patch throw,
  // so GET /gmww-members-live.js failed before the login handler could load.
  assert.match(gmwwMembersLiveScript,/gmwwChatMount\(\);gmwwChatAnnounce\(d\?\.audioCue\);renderPlayerTimeline\(d\?\.publicTimeline\);/);
  assert.doesNotMatch(gmwwMembersLiveScript,/renderRooms\(\);gmwwChatMount\(\);/);
  const served=patchPrivatePlayerCards(gmwwMembersLiveScript);
  assert.doesNotThrow(()=>new Function(served));
  assert.ok(served.includes('window.login=login;'),'login callback remains globally available');
  assert.ok(served.includes('await gmwwRefreshPublicRoster(code,state.participantId);'),'room resume refreshes public roster without old V1 room list');
  assert.ok(!served.includes('await Promise.allSettled([loadRooms(false),gmwwRefreshPublicRoster(code,state.participantId)])'));
  assert.ok(served.includes('renderPlayerTimeline(d?.publicTimeline);state.onlineActions=d?.onlineActions||[];renderOnlineActionDock();'),'Online timeline and action UI survive the fix');
});

test('V3.273 top menu remains callable after login and during reconnect',()=>{
  const begin=gmwwMembersLiveScript.indexOf('function updatePlayerTopMenu(){');
  const end=gmwwMembersLiveScript.indexOf('\n}\n',begin);
  assert.ok(begin>=0&&end>begin,'top menu function is present');
  const expression=gmwwMembersLiveScript.slice(begin,end+2);
  const state={room:{phase:'running'},roomCode:'ABCD',member:{},participantId:null,audioCue:{label:'Sói gọi dậy'}};
  const turn={textContent:''},info={textContent:''},hint={textContent:''};
  const menu={querySelector(selector){
    if(selector==='.gmww-player-menu-info b')return info;
    if(selector==='.gmww-player-menu-info small')return hint;
    if(selector==='.gmww-player-menu-turn')return turn;
    return null;
  },hidden:false};
  const view=new Function('state','$','playerTopMenuStatus','currentRoomPlayer','playerScenePolicy','gameCharacterImageUrl','ensureCharacterPreviewTicker',expression+'; return updatePlayerTopMenu;')(
    state,()=>menu,()=> 'ĐÊM 1',()=>null,r=>({mode:r?.phase==='running'?'battle':'lobby'}),()=>'',()=>{}
  );
  assert.doesNotThrow(()=>view(),'top menu must not reference an undefined room variable');
  assert.equal(turn.textContent,'Sói gọi dậy');
  assert.equal(menu.hidden,false);
});
