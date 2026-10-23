import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {targetsFor} from '../src/gmww-demo-runner.js';
import {resolveWolfNight} from '../src/gmww-wolf-night-resolution.js';
const source=fs.readFileSync('src/gmww-demo-runner.js','utf8');
const cut=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
test('DEMO keeps Witch kill available after night one, without changing normal role rules',()=>{
 const actions=['action_witch_save','action_witch_kill'].map(actionId=>({actionId,actorIds:['witch']}));
 const fn=vm.runInNewContext(cut('function nightActions(', 'function dayActions(')+';nightActions',{rules:{actionsForTurn:()=>actions},status:()=>false,isBattleActorBlocked:()=>false,STATUS_DEFS:{},checkBattleRoleActionUsage:()=>({ok:true})});
 const ctx={cards:[],artifacts:[],cycle:{accepted:[]},rows:[]},turn={roleId:'role_witch'};
 assert.deepEqual(Array.from(fn(ctx,{cycleNight:1},turn,[]),a=>a.actionId),['action_witch_save']);
 assert.equal(fn(ctx,{cycleNight:2},turn,[]).length,2);
});
test('Fairy DEMO observer records actual adjacent destination returned by the game',async()=>{
 const players=Object.fromEntries(['fairy','bitten','neighbor','other'].map((loginId,i)=>['member:'+loginId,{loginId,seatId:i+1}]));
 const meta={matchId:'m',cycleNight:1},ctx={players,rows:[{matchId:'m',night:1,type:'effect_notice',actionId:'action_wolf_bite',loginId:'bitten'}]};
 let observation,request;
 const room={demoInternalRequest:()=>({}),getNightRuntime:async()=>({queue:[{id:'fairy'}],cursor:0}),gmBattleAction:async(_req,body)=>{request=body;return {ok:true,wolfOutcome:resolveWolfNight({players,interactions:[...ctx.rows,{matchId:'m',night:1,type:'effect_notice',actionId:'action_transfer_bite',direction:body.direction}],matchId:'m',night:1})}}};
 const execute=vm.runInNewContext(cut('async function execute(', 'async function tasksFor(')+';execute',{pick:rows=>rows[0],targetsFor,crypto:webcrypto,checked:async r=>r,observe:async(...args)=>{observation=args}});
 await execute(room,meta,{},ctx,{actorIds:['fairy'],actionId:'action_transfer_bite',id:'role:fairy:transfer',name:'Dịch vết cắn',targetCount:1});
 assert.equal(request.direction,'left');assert.deepEqual(Array.from(observation[5]),['neighbor']);assert.match(observation[3],/Trái/);
});
