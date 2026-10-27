import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectAuthorizedGmCoreState} from '../assets/village/arena-3d/production-gm-adapter.mjs';
const source=readFileSync('assets/village/arena-3d/live.mjs','utf8');
const html=readFileSync('assets/village/arena-3d/live.html','utf8');
test('GM Production adapter requires previously authorized Core room state and refuses fake roles',()=>{
 assert.equal(projectAuthorizedGmCoreState(null),null);
 assert.equal(projectAuthorizedGmCoreState({ok:false,room:{matchId:'x'}}),null);
 assert.equal(projectAuthorizedGmCoreState({ok:true,room:null}),null);
 const s={ok:true,room:{phase:'running',cyclePhase:'night',
   matchId:'match-1',cycleKey:'night-1'},interactions:[],
   nightRuntime:{completed:false,cursor:0,queue:[{id:'turn-a',roleId:'role_guard',loginId:'a',kind:'role'}]},
   assignments:[{loginId:'a',roleId:'role_guard',roleCard:{
    name:'Bảo Vệ',functions:[{actionId:'action_protect',type:'effect_notice',label:'Bảo Vệ',targetCount:1}]
   }}]};
 const result=projectAuthorizedGmCoreState(s);
 assert.deepEqual(result.nightControl.actorIds,['member:a']);
 assert.equal(result.nightControl.availableActions.length,1);
 assert.equal(result.nightControl.availableActions[0].actionId,'action_protect');
 assert.equal(result.nightControl.turnId,'turn-a');
 assert.equal(result.casting?.cast,null);
 assert.equal(result.effects.length,0);
 const wrong={...s,assignments:[{loginId:'a',roleId:'role_witch',
   roleCard:{functions:[{actionId:'action_witch_kill'}]}}]};
 assert.deepEqual(projectAuthorizedGmCoreState(wrong).nightControl.availableActions,[]);
});
test('GM Production effects only include current Core match/cycle, expiry, known family and target',()=>{
 const now=Date.parse('2026-10-25T12:00:00Z');
 const row=(id,overrides={})=>({id,matchId:'m1',cycleKey:'night-1',
   loginId:'alice',actionId:'action_wolf_bite',type:'dead',
   createdAt:new Date(now-2000).toISOString(),...overrides});
 const proj=projectAuthorizedGmCoreState({ok:true,room:{phase:'running',cyclePhase:'night',
   matchId:'m1',cycleKey:'night-1'},interactions:[
   row('event1'),row('expired',{createdAt:new Date(now-50000).toISOString()}),
   row('different-cycle',{cycleKey:'night-2'}),
   row('undone',{undone:true}),
   row('bad',{loginId:'invalid person!'}),
   row('mismatch',{matchId:'other'})
 ]},now);
 assert.deepEqual(proj.effects.map(x=>x.eventId),['event1']);
 assert.equal(proj.effects[0].targetId,'member:alice');
 assert.equal(proj.effects[0].kind,'attack');
 assert.equal(proj.effects[0].expiresAt<=now+1500,true);
});
test('GM Production retains original 2D Core auth and never imports trial assignment on official host',()=>{
 assert.match(source,/const stagingHost=location\.hostname\.includes\('arena3d-stage14-staging'\)/);
 assert.match(source,/const productionCoreView=!stagingHost\|\|new URLSearchParams\(location\.search\)\.get\('coreMode'\)==='live'/);
 assert.match(source,/privateGmUrl=room=>productionCoreView\?'\/api\/gm\/rooms\/'/);
 assert.match(source,/projectAuthorizedGmCoreState\(payload\)/);
 assert.match(source,/loadPublicGallows:!productionCoreView/);
 assert.match(source,/productionCoreView&&\['seed','deal'\]\.includes\(id\)/);
 assert.ok(source.includes("$('seed').onclick=()=>guarded('Lấp Seat trống bằng thành viên thử',async()=>{\n  if(productionCoreView)throw Error("));
 assert.ok(source.includes("$('deal').onclick=()=>guarded('Phát Vai thử bằng Core V2',async()=>{\n  if(productionCoreView)throw Error("));
 assert.match(source,/if\(productionCoreView\)\{/);
 assert.match(source,/if\(!productionCoreView\)demo\(rosterSize\)/);
 assert.match(source,/document\.title='GMWW Arena 3D · Chơi chính thức'/);
 assert.match(source,/\['seed','deal','sample-vfx','gallery-toolbar'\]/);
 assert.match(html,/\[hidden\]\{display:none!important\}/);
 assert.doesNotMatch(source,/localStorage\.setItem\('gm/);
});
