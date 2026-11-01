import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveWolfNight} from '../src/gmww-wolf-night-resolution.js';

const players=Object.fromEntries(['alpha','wolf1','wolf2','wolf3','bob','carol','dave'].map((loginId,i)=>[
  'member:'+loginId,{loginId,seatId:i+1}
]));
const wolf=(id,roleId='role_wolf')=>({loginId:id,roleId,roleCard:{factionId:'wolf'}});
const regular=[wolf('wolf1'),wolf('wolf2'),wolf('wolf3')];
const withAlpha=[...regular,wolf('alpha','role_alpha_wolf')];
const bite=(actorId,loginId,extra={})=>({
  type:'effect_notice',actionId:'action_wolf_bite',actorId,loginId,
  matchId:'gmww-match',night:2,effectActive:true,...extra
});
const resolve=(interactions,assignments=regular)=>resolveWolfNight({
  matchId:'gmww-match',night:2,players,assignments,interactions
});

test('three Wolves each bite once: unique majority wins, never three deaths',()=>{
 const result=resolve([bite('wolf1','bob'),bite('wolf2','carol'),bite('wolf3','bob')]);
 assert.deepEqual(result.victims,['bob']);
 assert.equal(result.biteCount,3);
 assert.equal(result.attacked.length,1);
});

test('no Alpha: tied one-vote-each ballot fails closed rather than killing randomly',()=>{
 const result=resolve([bite('wolf1','bob'),bite('wolf2','carol'),bite('wolf3','dave')]);
 assert.deepEqual(result.victims,[]);
 assert.equal(result.reason,'PACK_VOTE_TIE');
 assert.equal(result.tied,true);
});

test('Alpha confirmed final bite overrides a larger majority of regular Wolves',()=>{
 const result=resolve([
   bite('wolf1','bob'),bite('wolf2','bob'),bite('wolf3','carol'),bite('alpha','dave')
 ],withAlpha);
 assert.deepEqual(result.victims,['dave']);
 assert.equal(result.biteCount,4);
});

test('Alpha abstains: count only other Wolves and honor their majority',()=>{
 const result=resolve([bite('wolf1','bob'),bite('wolf2','bob'),bite('wolf3','carol')],withAlpha);
 assert.deepEqual(result.victims,['bob']);
});

test('Frozen Alpha cancels pack bite as its role card requires',()=>{
 const result=resolve([bite('wolf1','bob'),bite('wolf2','bob'),
   {type:'frozen',loginId:'alpha',matchId:'gmww-match',night:2,effectActive:true}],withAlpha);
 assert.deepEqual(result.victims,[]);
 assert.equal(result.reason,'ALPHA_FROZEN_OR_EXPELLED');
});

test('repeated actor receipts, foreign actors, stale nights cannot multiply votes',()=>{
 const result=resolve([bite('wolf1','carol'),bite('wolf1','bob'),
   bite('stranger','dave'),bite('wolf2','bob'),
   bite('wolf3','carol',{night:1})]);
 assert.deepEqual(result.victims,['bob']);
 assert.equal(result.biteCount,2);
});

test('Player uses private offers, iOS pointer drag and bottom Restore',()=>{
 const ui=readFileSync('src/player-web-src/35-online-chat.part','utf8');
 const server=readFileSync('src/index.js','utf8');
 const offers=readFileSync('src/gmww-demo-runner.js','utf8');
 assert.match(ui,/function gmwwOnlinePlaceAtFire\(dock\)/);
 assert.match(ui,/function gmwwOnlineIconDown\(event,action\)/);
 assert.match(ui,/node\.style\.position='fixed'/);
 assert.match(ui,/function gmwwOnlineResetPlacement\(/);
 assert.match(ui,/async function gmwwOnlineRestore\(/);
 assert.match(ui,/undo\.onclick=.*gmwwOnlineRestore\(\)/);
 assert.match(ui,/command:'undo',undoToken:pending\.token/);
 assert.match(server,/PLAYER_UNDO_NOT_OWNED/);
 assert.match(server,/record\.source!=="online-human"/);
 assert.match(server,/PACK_BITE_ALREADY_USED_BY_ACTOR/);
 assert.match(offers,/turn\.kind==='wolf-pack-bite'\?x\.actorId===actorId/);
});
