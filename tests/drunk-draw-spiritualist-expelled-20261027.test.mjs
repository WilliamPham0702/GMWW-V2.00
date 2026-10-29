import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {drunkDeadCards,drunkDeckView,isPassiveInformationAction} from '../src/gmww-drunk-draw-rules.js';
import {inheritedRolePlans} from '../src/gmww-role-inheritance-rules.js';

const matchId='m1',assignments=[
 {loginId:'drunk',roleId:'role_drunk',roleName:'Say Rượu',faction:'village'},
 {loginId:'wolf',roleId:'role_wolf_seer',roleName:'Sói Tiên Tri',faction:'wolf'},
 {loginId:'guard',roleId:'role_guard',roleName:'Bảo Vệ',faction:'village'},
 {loginId:'alive',roleId:'role_seer',roleName:'Tiên Tri',faction:'village'}];
const interactions=[
 {matchId,night:1,type:'dead',loginId:'wolf',effectActive:true},
 {matchId,night:2,type:'dead',loginId:'guard',effectActive:true},
 {matchId:'other',night:1,type:'dead',loginId:'alive',effectActive:true},
 {matchId,night:2,type:'dead',loginId:'alive',effectActive:false}
];
test('Only prior confirmed deaths in the same match enter the Drunk deck',()=>{
 const cards=drunkDeadCards({assignments,interactions,matchId,night:3});
 assert.deepEqual(cards.map(x=>x.sourceId),['wolf','guard']);
 assert.deepEqual(drunkDeadCards({assignments,interactions,matchId,night:2}).map(x=>x.sourceId),['wolf']);
});
test('Unopened cards never leak role/faction/player identities to Player Web or GM',()=>{
 const deck={matchId,night:3,actorId:'drunk',turnId:'role:role_drunk',
   selectedId:null,cards:[{id:'opaque1',sourceId:'wolf',roleId:'role_wolf_seer',roleName:'Sói Tiên Tri'},
   {id:'opaque2',sourceId:'guard',roleId:'role_guard',roleName:'Bảo Vệ'}]};
 const player=JSON.stringify(drunkDeckView(deck,false)),gm=JSON.stringify(drunkDeckView(deck,true));
 for(const value of ['wolf','guard','Sói Tiên Tri','Bảo Vệ','role_wolf_seer','role_guard'])
   assert.ok(!player.includes(value),'Private Player Web deck leaked '+value);
 assert.ok(!gm.includes('Sói Tiên Tri'),'GM unopened card face is hidden');
 deck.selectedId='opaque1';deck.selectedRoleName='Sói Tiên Tri';
 const opened=drunkDeckView(deck,false);
 assert.equal(opened.cards.filter(x=>x.selected).length,1);
 assert.equal(opened.status,'selected');
 assert.equal(opened.selectedRoleName,'Sói Tiên Tri');
 assert.equal(opened.cards[1].roleName,undefined);
});
test('Drunk never auto draws when dead cards exist; chosen source transfers once',()=>{
 assert.deepEqual(inheritedRolePlans({assignments,interactions,matchId,night:3}),[]);
 const plan=inheritedRolePlans({assignments,interactions,matchId,night:3,
   drunkChoice:{actorId:'drunk',sourceId:'wolf'}});
 assert.equal(plan.length,1);assert.equal(plan[0].sourceRoleId,'role_wolf_seer');
 assert.deepEqual(inheritedRolePlans({assignments,interactions,matchId,night:3,
   drunkChoice:{actorId:'intruder',sourceId:'wolf'}}),[]);
});
test('Without any death, Drunk automatically becomes Villager with no power',()=>{
 const plan=inheritedRolePlans({assignments,interactions:[],matchId,night:3});
 assert.equal(plan.length,1);assert.equal(plan[0].sourceRoleId,'role_villager');
});
test('Exile blocks bad effects but never obstructs neutral faction comparison',()=>{
 assert.equal(isPassiveInformationAction('action_compare_faction'),true);
 assert.equal(isPassiveInformationAction('action_witch_kill'),false);
 assert.equal(isPassiveInformationAction('action_wolf_bite'),false);
 const worker=fs.readFileSync('src/index.js','utf8');
 assert.match(worker,/const isFactionCompare=String\(body\?\.actionId\|\|''\)==='action_compare_faction'/);
 assert.match(worker,/effectiveTargets=isFactionCompare\?actionTargets:actionTargets\.filter/);
 assert.match(worker,/revealIds\.filter\(id=>players\["member:"\+id\]\&\&\(isFactionCompare\|\|revealActionId==='action_seer'\|\|!isExpelled\(id\)\)\)/);
 assert.match(worker,/results\.push\(\{ok:true,loginId:id,observed:true\}\)/);
});
test('Authenticated room route never trusts Player Web actor or source role',()=>{
 const worker=fs.readFileSync('src/index.js','utf8');
 assert.match(worker,/loginId:me\.member\.loginId,cardId:body\.cardId/);
 assert.match(worker,/DRUNK_ALREADY_CHOSEN/);
 assert.match(worker,/DRUNK_WRONG_TURN/);
 assert.match(worker,/DRUNK_CARD_INVALID/);
 assert.match(worker,/blockConcurrencyWhile/);
 const client=fs.readFileSync('src/player-web-src/30-rooms-and-realtime.part','utf8');
 assert.match(client,/drunk\/draw/);
 assert.match(client,/dd-card/);
 assert.match(client,/refreshPrivateRole\(true\)/);
});
