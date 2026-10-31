import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chatPolicy,chatBlockedByEffects,chatFrozenForDay} from '../src/gmww-online-chat-policy.js';

const meta={phase:'running',cyclePhase:'morning',matchId:'match-1',cycleNight:2,cycleKey:'morning-2'};
const players={'member:a':{loginId:'a'},'member:b':{loginId:'b'}};
const policy=(rows,loginId='a',m=meta)=>chatPolicy({meta:m,players,rows,loginId});

test('freezing a player stops village chat in that turn and the next morning only',()=>{
 const frozen={id:'f1',type:'frozen',loginId:'a',night:2,matchId:'match-1',effectActive:true};
 assert.equal(policy([frozen]).reason,'CHAT_FROZEN');
 assert.equal(policy([frozen]).canSend,false);
 const morningExpired={...frozen,effectActive:false,expiredReason:'MORNING_START',expiredAt:'2026-10-31T00:00:00Z'};
 assert.equal(chatFrozenForDay([morningExpired],meta,'a'),true);
 assert.equal(policy([morningExpired]).reason,'CHAT_FROZEN');
 assert.equal(policy([morningExpired],'a',{...meta,cycleNight:3,cyclePhase:'night',cycleKey:'night-3'}).reason,'CHAT_NIGHT_NOT_SHARED');
 assert.equal(chatFrozenForDay([morningExpired],{...meta,cycleNight:3},'a'),false);
 assert.equal(policy([morningExpired],'b').canSend,true);
 assert.equal(policy([{...morningExpired,undone:true}]).canSend,true);
 assert.equal(policy([{...morningExpired,expiredReason:'GM_CLEAR_STATE'}]).canSend,true);
 assert.equal(policy([{...morningExpired,matchId:'older-match'}]).canSend,true);
});
test('dead and expelled players cannot send even in their GM private channel',()=>{
 const source=readFileSync('src/index.js','utf8');
 assert.match(source,/const effects=chatBlockedByEffects\(rows,meta\?\.matchId,id\)/);
 assert.match(source,/effects\.dead\?"CHAT_DEAD"/);
 assert.match(source,/channel:"gm:"\+id,scope:"gm",reason/);
 for(const type of ['dead','expelled']){
  const flags=chatBlockedByEffects([{type,loginId:'a',effectActive:true}],'match-1','a');
  assert.equal(flags[type],true);
  assert.equal(policy([{type,loginId:'a',effectActive:true}]).canSend,false);
 }
});
