import test from 'node:test';
import assert from 'node:assert/strict';
import {gmwwMembersLiveScript} from '../src/gmww-members-live.js';
import {patchPrivatePlayerCards} from '../src/gmww-player-private-card-patch.js';

const receiptCall="try{const d=await api('/api/rooms/'+state.roomCode+'/me',{headers:auth()});";

test('Player JS dynamic compilation: private receipt patch no longer crashes entry',()=>{
  assert.equal(gmwwMembersLiveScript.split(receiptCall).length-1,1,'single source anchor');
  const patched=patchPrivatePlayerCards(gmwwMembersLiveScript);
  assert.ok(patched.length>gmwwMembersLiveScript.length);
  assert.doesNotThrow(()=>new Function(patched));
  assert.equal((patched.match(/try\\{const d=await gmwwReadPrivateReceipt\\(\\);if\\(!d\\)return false;/g)||[]).length,1);
  assert.match(patched,/if\\(wolfWakeEpoch===Number\\(state\\.wolfWakeEpoch\\|\\|0\\)\\)setPrivateWolfRecognition/);
  assert.equal(patchPrivatePlayerCards(patched),patched,'idempotent');
});

test('login, join, authenticated room receipt and reconnect paths remain available',()=>{
  const patched=patchPrivatePlayerCards(gmwwMembersLiveScript);
  assert.match(patched,/\\/api\\/members\\/login/);
  assert.match(patched,/\\/api\\/rooms\\//);
  assert.match(patched,/function gmwwReadPrivateReceipt\\(/);
  assert.match(patched,/async function autoResumeActiveRoom\\(/);
  assert.match(patched,/connectWS\\(/);
});

test('changed/unknown receipt anchor fails closed rather than serving a broken Player script',()=>{
  const corrupted=gmwwMembersLiveScript.replace(receiptCall,'try{const d=await legacyBrokenReceipt();');
  assert.notEqual(corrupted,gmwwMembersLiveScript);
  assert.throws(()=>patchPrivatePlayerCards(corrupted),/Player receipt patch mismatch/);
});
