import test from 'node:test';import assert from 'node:assert/strict';
import {resolveNightReveal,canSnowWolfBite,resolveMaidenNight} from '../src/gmww-wolf-night-resolution.js';
import {isWolfRole,packMembers} from '../src/gmww-pack-night-rules.js';
import {wolfPackMembers} from '../src/gmww-wolf-recognition.js';
const roles=[{loginId:'human',roleId:'role_human_wolf',faction:'village'},{loginId:'lycan',roleId:'role_lycan',faction:'wolf'},{loginId:'alpha',roleId:'role_alpha_wolf',faction:'wolf'},
 {loginId:'seer',roleId:'role_seer',roleName:'Tiên Tri',faction:'Phe Dân Làng',roleCard:{functions:[{actionId:'action_seer'}]}},
 {loginId:'passive',roleId:'role_strongman',faction:'village',roleCard:{functions:[{actionId:'action-strongman-bite',passive:true}]}},
 {loginId:'empty',roleId:'role_villager',faction:'village',roleCard:{functions:[]}}];
const reveal=(actionId,...targetIds)=>resolveNightReveal({actionId,targetIds,assignments:roles});
test('Seer sees Human Wolf as Wolf, Lycan/Alpha as non-Wolf; group sees actual faction',()=>{
 assert.equal(reveal('action_seer','human').wolf,true);assert.equal(reveal('action_seer','lycan').wolf,false);assert.equal(reveal('action_seer','alpha').wolf,false);
 assert.equal(reveal('action_scan_three','human','empty','passive').wolf,false);assert.equal(reveal('action_scan_three','lycan','empty','passive').wolf,true);
});
test('Digan real Action ID reads current faction',()=>{assert.equal(reveal('action-digan-scry','lycan')?.faction,'wolf');});
test('Rotten Seer checks active functions with real Action ID',()=>{
 assert.equal(reveal('action-rotten-seer-check','passive')?.hasFunction,false);assert.equal(reveal('action-rotten-seer-check','seer')?.hasFunction,true);assert.equal(reveal('action-rotten-seer-check','empty')?.hasFunction,false);
});
test('Vampire uses three distinct people, returns no role identities',()=>{
 const r=reveal('action-vampire-check','human','lycan','seer');assert.equal(r?.found,true);assert.equal(r.targets.some(x=>x.roleName||x.roleId||x.faction),false);
 assert.equal(reveal('action-vampire-check','human','seer'),null);assert.equal(reveal('action-vampire-check','human','human','seer'),null);
});
test('Spiritualist canonical faction comparison accepts Vietnamese labels',()=>{assert.equal(reveal('action_compare_faction','seer','empty')?.same,true);});
test('Human Wolf and former wolf in Village never receive private pack identities',()=>{
 const a={loginId:'human',roleId:'role_human_wolf',faction:'village'},b={loginId:'former',roleId:'role_hybrid_wolf',faction:'village',roleCard:{factionId:'wolf'}},c={loginId:'new',roleId:'role_villager',faction:'wolf'};
 assert.equal(isWolfRole(a),false);assert.equal(isWolfRole(b),false);assert.equal(isWolfRole(c),true);
 assert.deepEqual(packMembers([a,b,c],[],'m').map(x=>x.loginId),['new']);assert.deepEqual(wolfPackMembers([a,b,c],[],'m').map(x=>x.loginId),['new']);
 assert.equal(resolveNightReveal({actionId:'action-digan-scry',targetIds:['former'],assignments:[b]}).faction,'village');
});
test('Human Wolf does not block solo Snow Wolf or kill a visiting Maiden',()=>{
 const assignments=[{loginId:'snow',roleId:'role_snow_wolf',faction:'wolf'},{loginId:'human',roleId:'role_human_wolf',faction:'village'},{loginId:'maiden',roleId:'role_maiden',faction:'village'}];
 assert.equal(canSnowWolfBite({assignments,interactions:[],matchId:'m'}),true);
 assert.deepEqual(resolveMaidenNight({assignments,matchId:'m',night:1,interactions:[{matchId:'m',night:1,type:'effect_notice',actionId:'action_visit_house',actorId:'maiden',loginId:'human'}]}),[]);
});
