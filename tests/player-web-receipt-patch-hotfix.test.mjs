import test from 'node:test';
import assert from 'node:assert/strict';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';
import {patchPrivatePlayerCards} from '../src/gmww-player-private-card-patch.js';

const sourceReceipt="try{const d=await api('/api/rooms/'+state.roomCode+'/me',{headers:auth()});";
const replacedReceipt="try{const d=await gmwwReadPrivateReceipt();if(!d)return false;";

test('Player JS receipt injection compiles and preserves private wolf recognition',()=>{
  assert.equal(gmwwMembersLiveScript.split(sourceReceipt).length-1,1,'exactly one source receipt anchor');
  const script=patchPrivatePlayerCards(gmwwMembersLiveScript);
  assert.ok(script.length>gmwwMembersLiveScript.length);
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
