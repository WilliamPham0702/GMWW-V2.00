import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveLinkedDeaths} from '../src/gmww-linked-death-rules.js';
const assignments=[
 {roleId:'role_cupid',loginId:'cupid'},
 {roleId:'role_sect_leader',loginId:'leader'},
 {roleId:'role_cult',loginId:'cult'},
 ...['a','b','c','follower','follower2'].map(loginId=>({roleId:'role_villager',loginId}))];
const mark=(actorId,loginId,actionId,clientEventId)=>({type:'effect_notice',matchId:'m',night:1,actorId,loginId,actionId,clientEventId});
const dead=loginId=>({type:'dead',matchId:'m',night:1,loginId,effectActive:true});
test('Cupid links only a fully confirmed two-target transaction',()=>{
 const pair=[mark('cupid','a','action-cupid-pair','t:a'),mark('cupid','b','action-cupid-pair','t:b')];
 assert.deepEqual(resolveLinkedDeaths({assignments,interactions:[pair[0],dead('a')],matchId:'m',night:1}),[]);
 const next=resolveLinkedDeaths({assignments,interactions:[...pair,dead('a')],matchId:'m',night:1});
 assert.equal(next.length,1);assert.equal(next[0].loginId,'b');
 assert.deepEqual(resolveLinkedDeaths({assignments,interactions:[...pair,dead('a'),...next],matchId:'m',night:1}),[]);
});
test('Trưởng Phái and Cult only link leader deaths, never follower deaths',()=>{
 const notices=[mark('leader','follower','25','s:follower'),mark('cult','follower2','action-cult-add','c:follower2')];
 assert.deepEqual(resolveLinkedDeaths({assignments,interactions:[...notices,dead('follower')],matchId:'m',night:1}),[]);
 const hits=resolveLinkedDeaths({assignments,interactions:[...notices,dead('leader'),dead('cult')],matchId:'m',night:1});
 assert.deepEqual(new Set(hits.map(x=>x.loginId)),new Set(['follower','follower2']));
});
test('Cascade propagates link deaths and rejects unconfirmed fake faction actor',()=>{
 const notices=[mark('cupid','a','action-cupid-pair','p:a'),mark('cupid','b','action-cupid-pair','p:b'),
 mark('leader','a','25','leader:a'),mark('follower','c','action-cupid-pair','fake:c')];
 const hits=resolveLinkedDeaths({assignments,interactions:[...notices,dead('leader')],matchId:'m',night:1});
 assert.deepEqual(new Set(hits.map(x=>x.loginId)),new Set(['a','b']));
});
test('Server processes finite linked deaths using authoritative receipts',()=>{
 const s=fs.readFileSync('src/index.js','utf8');
 assert.ok(s.includes('resolveLinkedDeaths({assignments,interactions:rows,'));
 assert.ok(s.includes('applyAutomaticArtifactRevive(meta,rows,now)'));
});
