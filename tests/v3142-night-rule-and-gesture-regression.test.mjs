import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {canSnowWolfBite,resolveMaidenNight,resolveNightReveal} from '../src/gmww-wolf-night-resolution.js';
const read=path=>fs.readFileSync(path,'utf8');
const match='match-v3142';
const roles=[
 {loginId:'snow',roleId:'role_snow_wolf',roleCard:{factionId:'wolf'},roleName:'Sói Tuyết'},
 {loginId:'alpha',roleId:'role_alpha_wolf',roleCard:{factionId:'wolf'},roleName:'Sói Trùm'},
 {loginId:'wolf',roleId:'role_wolf',roleCard:{factionId:'wolf'},roleName:'Sói'},
 {loginId:'maiden',roleId:'role_maiden',roleCard:{factionId:'village'},roleName:'Thiếu Nữ'},
 {loginId:'villager',roleId:'role_villager',roleCard:{factionId:'village'},roleName:'Dân Làng'}
];
const dead=(id,night=1)=>({type:'dead',loginId:id,matchId:match,night,effectActive:true});
const visit=(target,actor='maiden')=>({type:'effect_notice',actionId:'action_visit_house',actorId:actor,loginId:target,matchId:match,night:1,effectActive:false});
test('Snow Wolf cannot bite while any other wolf remains alive; death state scoped to match',()=>{
 assert.equal(canSnowWolfBite({assignments:roles,interactions:[],matchId:match}),false);
 assert.equal(canSnowWolfBite({assignments:roles,interactions:[dead('alpha')],matchId:match}),false);
 assert.equal(canSnowWolfBite({assignments:roles,interactions:[dead('alpha'),dead('wolf')],matchId:match}),true);
 assert.equal(canSnowWolfBite({assignments:roles,interactions:[{...dead('alpha'),matchId:'old'},dead('wolf')],matchId:match}),false);
});
test('Seer recognizes Snow Wolf while Alpha Wolf masks its faction',()=>{
 assert.equal(resolveNightReveal({actionId:'action_seer',targetIds:['snow'],assignments:roles}).wolf,true);
 assert.equal(resolveNightReveal({actionId:'action_seer',targetIds:['alpha'],assignments:roles}).wolf,false);
 assert.equal(resolveNightReveal({actionId:'action_aura_read',targetIds:['snow'],assignments:roles}).message,'Sói Tuyết');
 assert.equal(resolveNightReveal({actionId:'action_compare_faction',targetIds:['snow','alpha'],assignments:roles}).message,'CÙNG PHE');
});
test('Maiden dies if she visits a wolf or her visited target dies in the same night',()=>{
 assert.deepEqual(resolveMaidenNight({assignments:roles,interactions:[visit('wolf')],matchId:match,night:1}),['maiden']);
 assert.deepEqual(resolveMaidenNight({assignments:roles,interactions:[visit('villager'),dead('villager')],matchId:match,night:1}),['maiden']);
 assert.deepEqual(resolveMaidenNight({assignments:roles,interactions:[visit('villager'),dead('villager',2)],matchId:match,night:1}),[]);
 assert.deepEqual(resolveMaidenNight({assignments:roles,interactions:[visit('villager')],matchId:match,night:1}),[]);
});
test('Seer may inspect a victim killed tonight, not yesterday, while rejecting self-selection',()=>{
 const ctx={};vm.runInNewContext(read('server-game/current/battle-controls.js'),ctx);
 const allowed=ctx.GMWW_BATTLE_CONTROLS.targetAllowed;
 const action={actionId:'action_seer',actorIds:['seer'],noSelf:true,type:'effect_notice',allowDead:false};
 assert.equal(allowed(action,{loginId:'villager'},'dead',[dead('villager',1)],1),true);
 assert.equal(allowed(action,{loginId:'villager'},'dead',[dead('villager',1)],2),false);
 assert.equal(allowed(action,{loginId:'seer'},'alive',[],1),false);
});
test('iPhone navigation, multi-target drag, next-turn confirmation, and popup outside-dismiss are wired',()=>{
 const b=read('server-game/src/40-battle-and-timeline.part'),
       audio=read('server-game/src/30-village-and-setup.part');
 assert.ok(b.includes('battleUnlockAudioFromGesture(); // iOS'));
 assert.ok(audio.includes('queue[cursor+1]'));
 assert.ok(b.includes('battleState.pendingNextTurnId=t.id'));
 assert.ok(b.includes('battleAdvanceConfirmedTurn()'));
 assert.ok(b.includes('if(!popup.hidden&&!popup.contains(event.target))battleCloseResultPopup()'));
 assert.ok(b.includes('if(close)close.hidden=scanOnly'));
 assert.ok(b.includes("battleState.targets.length===action.targetCount)battleOpenTargetSheet"));
 assert.ok(b.includes('battle-target-quota'));
 assert.ok(audio.includes('onFinished?.();\n    return false'));
});

test('Cached GM characters relight at night when expulsion expires without requiring tap',()=>{
 const gm=read('server-game/src/30-village-and-setup.part'),
       start=gm.indexOf('function playPlayerEffect('),end=gm.indexOf('function playDeliveryLabel(',start);
 assert.ok(start>0&&end>start);
 const state={activeEffects:[{loginId:'p1',type:'expelled',effectActive:true}]};
 const ctx={playNow:()=>2000,playSceneRuntime:state};
 const effect=vm.runInNewContext(gm.slice(start,end)+'; playPlayerEffect',ctx);
 assert.equal(effect('p1'),'expelled');
 state.activeEffects[0].effectActive=false;
 assert.equal(effect('p1'),'alive');
 assert.ok(gm.includes("token.classList.toggle('is-'+status,status===effect&&status!=='alive')"));
});
test('GM safe patrol stays navigable during idle hold and resets old session anchor',()=>{
 const gm=read('server-game/src/10-library-and-settings.part');
 const a=gm.indexOf('function gmwwGmClearWalk('),b=gm.indexOf('function gmwwGmAutoPoint(',a);
 assert.ok(a>0&&b>a);
 const ctx={gmwwGmRoute:()=>[],gmwwGmNearPlayer:()=>false,Math,
   GMWW_VILLAGE_LAYOUT:{inside:()=>true}};
 ctx.globalThis={GMWW_VILLAGE_LAYOUT:ctx.GMWW_VILLAGE_LAYOUT};
 const canWalk=vm.runInNewContext(gm.slice(a,b)+';gmwwGmClearWalk',ctx);
 assert.equal(canWalk({x:50,y:50},{x:50,y:50}),true);
 assert.ok(gm.includes("gmwwGmLastSafePoint=null; // Never carry a blocked path"));
});
