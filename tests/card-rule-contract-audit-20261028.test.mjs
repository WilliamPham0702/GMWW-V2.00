import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {sanitizePlayerRoleCard,sanitizePlayerArtifactCard} from '../src/gmww-private-card-contract.js';
import {resolveRoleActionPolicy,checkBattleRoleActionUsage} from '../src/gmww-battle-action-policy.js';
const raw={id:'fn',actionId:'power',phase:'both',usageMode:'custom',usageCount:4,targetCount:2,noSelf:true,allowDead:false,noTarget:false,passive:false,fromNight:1,toNight:5,cooldownNights:2,allowConsecutive:false,targetPreviousCycleOnly:true,perUserLimit:2,activation:'on_actor_death',pushToPlayerWeb:true,effectIds:['effect-power']};
const source=fs.readFileSync('server-game/src/50-roles-and-artifacts.part','utf8');
const begin=source.indexOf('function playFunctionRulePayload('),end=source.indexOf('async function playBlobDataUrl(',begin);
const payload=vm.runInNewContext(source.slice(begin,end)+';({role:playRoleCardPayload,artifact:playArtifactCardPayload})',{state:{actions:{role:[{id:'power',name:'Power'}],artifacts:[{id:'power',name:'Power'}]}},playFactionLabel:()=> 'Phe Dân'});
for(const kind of ['role','artifact'])test(kind+': GM/private DTO keeps complete configured function contract',()=>{
 const dto=(kind==='role'?sanitizePlayerRoleCard:sanitizePlayerArtifactCard)(payload[kind]({id:'card',name:'Card',functions:[raw],flags:{allowMultipleActions:false}}));
 assert.ok(Array.isArray(dto.functions));const fn=dto.functions[0];
 for(const k of ['actionId','usageCount','targetCount','noSelf','allowDead','noTarget','passive','fromNight','toNight','cooldownNights','allowConsecutive','targetPreviousCycleOnly','perUserLimit','activation','pushToPlayerWeb'])assert.equal(fn[k],raw[k],k);
 assert.equal(fn.phase,'any');assert.equal(fn.usageMode,'custom');assert.deepEqual(fn.effectIds,raw.effectIds);assert.equal(dto.artworkAssetId,kind+':card');
});
const detail={matchId:'m',actorId:'a',roleId:'role_spiritualist',actionId:'power',night:4};
const card={flags:{allowMultipleActions:false},functions:[{...raw,phase:'night',targetPreviousCycleOnly:false}]};
const policy=()=>resolveRoleActionPolicy(sanitizePlayerRoleCard(card),detail.roleId,'power');
test('custom quota counts four uses across match, not per night',()=>{
 const rows=[1,2,3,4].map(night=>({...detail,night}));
 assert.equal(checkBattleRoleActionUsage(rows,{...detail,night:5,policy:policy()}).error,'ACTION_GAME_LIMIT_REACHED');
 assert.equal(checkBattleRoleActionUsage(rows.slice(0,3),{...detail,night:5,policy:policy()}).ok,true);
});
test('configured first/last night and phase are authoritative',()=>{
 assert.equal(checkBattleRoleActionUsage([],{...detail,night:6,policy:policy()}).error,'ACTION_OUTSIDE_NIGHT_WINDOW');
 const p=resolveRoleActionPolicy({functions:[{actionId:'power',phase:'day'}]},detail.roleId,'power');
 assert.equal(checkBattleRoleActionUsage([],{...detail,policy:p}).error,'ACTION_WRONG_PHASE');
});
test('no self, exact count and consecutive target rules',()=>{
 const p=policy();
 assert.equal(checkBattleRoleActionUsage([],{...detail,targetIds:['a','b'],policy:p}).error,'ACTION_SELF_TARGET_FORBIDDEN');
 assert.equal(checkBattleRoleActionUsage([],{...detail,targetIds:['b'],policy:p}).error,'ACTION_TARGET_COUNT_INVALID');
 assert.equal(checkBattleRoleActionUsage([{...detail,night:3,targetIds:['b','c']}],{...detail,targetIds:['b','d'],policy:p}).error,'CONSECUTIVE_NIGHT_TARGET_FORBIDDEN');
 assert.equal(checkBattleRoleActionUsage([{...detail,night:2,targetIds:['b','c']}],{...detail,targetIds:['b','d'],policy:p}).ok,true);
});
test('no-target powers accept self wire placeholder, never foreign target',()=>{
 const p=resolveRoleActionPolicy({functions:[{actionId:'power',noTarget:true,targetCount:0,noSelf:true}]},detail.roleId,'power');
 assert.equal(checkBattleRoleActionUsage([],{...detail,targetIds:['a'],policy:p}).ok,true);
 assert.equal(checkBattleRoleActionUsage([],{...detail,targetIds:['b'],policy:p}).error,'ACTION_TARGET_COUNT_INVALID');
});
test('per-target game quota excludes other matches',()=>{
 const rows=[1,2].map(night=>({...detail,night,targetIds:['b','c']}));
 assert.equal(checkBattleRoleActionUsage(rows,{...detail,night:5,targetIds:['b','d'],policy:policy()}).error,'ACTION_TARGET_GAME_LIMIT_REACHED');
 assert.equal(checkBattleRoleActionUsage(rows.map(x=>({...x,matchId:'other'})),{...detail,night:5,targetIds:['b','d'],policy:policy()}).ok,true);
});
test('settings modes and trigger/setup phases never become unlimited/night',()=>{
 for(const sanitize of [sanitizePlayerRoleCard,sanitizePlayerArtifactCard]){
 const c=sanitize({functions:[{actionId:'day',phase:'trigger',usageMode:'eachDay'},{actionId:'night',phase:'setup',usageMode:'nPerNight'}]});
 assert.equal(c.functions[0].usageMode,'eachDay');assert.equal(c.functions[0].phase,'trigger');assert.equal(c.functions[1].usageMode,'nPerNight');assert.equal(c.functions[1].phase,'setup');}
});
test('one onceGame Artifact function implies single use when flag absent',()=>{
 assert.equal(sanitizePlayerArtifactCard({functions:[{actionId:'a',usageMode:'onceGame',usageCount:1}]}).singleUse,true);
 assert.equal(sanitizePlayerArtifactCard({functions:[{actionId:'a',usageMode:'unlimited'}]}).singleUse,false);
});
test('explicit repeatable Artifact and independent powers are not collapsed',()=>{
 assert.equal(sanitizePlayerArtifactCard({singleUse:false,functions:[{actionId:'a',usageMode:'onceGame'}]}).singleUse,false);
 assert.equal(sanitizePlayerArtifactCard({functions:[{actionId:'a',usageMode:'onceGame'},{actionId:'b',usageMode:'onceGame'}]}).singleUse,false);
});
test('partial legacy functions do not invent target restrictions',()=>{
 const fn=sanitizePlayerArtifactCard({functions:[{actionId:'power'}]}).functions[0];assert.equal(fn.targetCount,undefined);assert.equal(fn.noSelf,undefined);
});
test('user ruling: Aura reads role name and Mirror/Swap grant fresh function uses without changing media',()=>{
 const core=fs.readFileSync('server-game/src/00-core-and-library.part','utf8'),a=core.indexOf('function applyApprovedRoleSettings(s){'),b=core.indexOf('function applyV221AudioGuard(s){',a);
 const migrate=vm.runInNewContext(core.slice(a,b)+';applyApprovedRoleSettings',{DEFAULT_STATE:{cards:[]},clone:structuredClone});
 const s={cards:[{id:'role_aura_seer',information:'đọc chức năng',functions:[{actionId:'action_aura_read'}],media:{audio:'keep'}}],artifacts:[{id:'artifact_23',information:'old',media:{image:'keep'}},{id:'artifact_40',information:'old'}]};
 migrate(s);assert.match(s.cards[0].information,/tên Vai Trò/);assert.doesNotMatch(s.cards[0].information,/đọc chức năng/);
 assert.match(s.artifacts[0].information,/lượt sử dụng mới/);assert.match(s.artifacts[1].information,/lượt sử dụng mới/);
 assert.equal(s.cards[0].media.audio,'keep');assert.equal(s.artifacts[0].media.image,'keep');
 const once=JSON.stringify(s);migrate(s);assert.equal(JSON.stringify(s),once);
});

test('approved 28/10: elder bell and seven Artifact rulings persist without changing action metadata or media',()=>{
 const core=fs.readFileSync('server-game/src/00-core-and-library.part','utf8');
 const a=core.indexOf('function applyApprovedRoleSettings(s){'),b=core.indexOf('function applyV221AudioGuard(s){',a);
 const apply=vm.runInNewContext(core.slice(a,b)+';applyApprovedRoleSettings',{DEFAULT_STATE:{cards:[]},clone:structuredClone});
 const role={id:'role_elder',functions:[{actionId:'18',phase:'night',effectIds:['effect-bell']}],media:{image:'elder-image'}};
 const ids=['07','13','15','19','30','32','42'];const actionIds=['action-grudge-designate','artifact_action_reveal_role','artifact_action_negate','artifact_action_lock_function','action-maid-inherit','artifact_action_link','artifact_action_custom'];
 const artifacts=ids.map((id,i)=>({id:'artifact_'+id,functions:[{actionId:actionIds[i],usageMode:'onceGame',effectIds:['existing']}],media:{image:id}}));
 const state={cards:[role],artifacts};apply(state);
 assert.match(role.information,/mọi tác động gây chết/);assert.match(role.information,/0/);assert.equal(role.functions[0].toNight,4);
 const rules=Object.fromEntries(artifacts.map(x=>[x.id,x]));
 assert.match(rules.artifact_07.information,/đêm hôm sau/);
 assert.match(rules.artifact_13.information,/không công bố thì chết/);
 assert.match(rules.artifact_15.information,/dùng mãi mãi đã được sử dụng/);
 assert.match(rules.artifact_19.information,/2 ngày đêm/);
 assert.match(rules.artifact_30.information,/chính Vai Trò trước khi chết/);
 assert.match(rules.artifact_32.information,/cùng sử dụng/);
 assert.match(rules.artifact_42.information,/Offline/);
 for(let i=0;i<ids.length;i++){assert.equal(artifacts[i].functions[0].actionId,actionIds[i]);assert.equal(artifacts[i].media.image,ids[i]);assert.deepEqual(artifacts[i].functions[0].effectIds,['existing']);}
 assert.equal(role.media.image,'elder-image');
 const snapshot=JSON.stringify(state);apply(state);assert.equal(JSON.stringify(state),snapshot);
});
