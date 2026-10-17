import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 sanitizePlayerRoleCard, mergePlayerRoleCard, privateRole,
 sanitizePlayerArtifactCard, privateArtifact
} from '../src/gmww-private-card-contract.js';

test('private cards: preserve legacy role title, descriptions and artwork aliases',()=>{
 const raw={roleName:'Tiên Tri',description:'Đêm nào cũng xem',faction:'village',artworkId:'role-seer',
   functions:[{actionId:'seer_view',usageMode:'eachNight',usageCount:1}],
   flags:{allowMultipleActions:false}};
 const original=structuredClone(raw),card=sanitizePlayerRoleCard(raw);
 assert.deepEqual(raw,original,'normalize role must not mutate persisted source');
 assert.equal(card.name,'Tiên Tri');
 assert.equal(card.information,'Đêm nào cũng xem');
 assert.equal(card.artworkAssetId,'role-seer');
 assert.equal(card.artworkId,'role-seer');
 assert.equal(card.version,7);
 assert.deepEqual(card.functions,[{id:'seer_view',actionId:'seer_view',usageMode:'eachNight',usageCount:1}]);
 assert.deepEqual(card.flags,{allowMultipleActions:false});
});

test('private cards: role functions preserve counts and reject invalid usage modes',()=>{
 const c=sanitizePlayerRoleCard({name:'Sói',
  functions:[{id:'kill',usageMode:'onceGame',usageCount:999},
    {id:'none',usageMode:'unexpected',usageCount:0}],
  actions:[{id:'bite',name:'Sói Cắn',description:'test'}]});
 assert.equal(c.functions[0].usageCount,100);
 assert.equal(c.functions[0].usageMode,'onceGame');
 assert.equal(c.functions[1].usageCount,1);
 assert.equal(c.functions[1].usageMode,'unlimited');
 assert.equal(c.actions[0].name,'Sói Cắn');
 assert.equal(c.functions.length,2);
});

test('private cards: role merge preserves original actions when update omits or empties them',()=>{
 const base={version:7,name:'Tiên Tri',actions:[{id:'seer_view'}],artworkAssetId:'original',
   objective:'win',functions:[{id:'seer'}],flags:{allowMultipleActions:false}};
 const out=mergePlayerRoleCard(base,{name:'Tiên Tri Mới',actions:[],artworkId:'replacement'});
 assert.equal(out.name,'Tiên Tri Mới');
 assert.deepEqual(out.actions,[{id:'seer_view'}]);
 assert.deepEqual(out.functions,[{id:'seer'}]);
 assert.equal(out.artworkAssetId,'replacement');
 assert.equal(out.artworkId,'replacement');
 assert.equal(out.objective,'win');
 assert.deepEqual(base.actions,[{id:'seer_view'}]);
});

test('private cards: Artifact target restrictions, priority and single-use are retained',()=>{
 const artifact=sanitizePlayerArtifactCard({
   artifactName:'Tráng Gương',singleUse:true,priorityFirst:false,artworkId:'original-artifact',
   actions:[{id:'copy',targetCount:2,noSelf:true,allowDead:false,description:'copied action'}]});
 assert.equal(artifact.name,'Tráng Gương');
 assert.equal(artifact.singleUse,true);
 assert.equal(artifact.priorityFirst,false);
 assert.equal(artifact.artworkAssetId,'original-artifact');
 assert.equal(artifact.actions[0].targetCount,2);
 assert.equal(artifact.actions[0].noSelf,true);
 assert.equal(artifact.actions[0].allowDead,false);
 assert.equal(sanitizePlayerArtifactCard({artifactName:'Tráng Gương'}).priorityFirst,true);
});

test('private cards: invalid Artifact target count is not carried into Player Web',()=>{
 const actions=[{id:'zero',targetCount:0},{id:'too-large',targetCount:31},
   {id:'negative',targetCount:-1},{id:'string-number',targetCount:'3'}];
 const c=sanitizePlayerArtifactCard({actions});
 assert.equal(c.actions[0].targetCount,0);
 assert.equal(c.actions[1].targetCount,undefined);
 assert.equal(c.actions[2].targetCount,undefined);
 assert.equal(c.actions[3].targetCount,3);
});

test('private delivery DTOs keep established response properties without leaking unrelated internal data',()=>{
 const role=privateRole({roleId:'wolf',roleName:'Sói',roleCard:{name:'Sói'},
   artworkId:'wolf-img',playerCardVersion:8,matchId:'m1',matchRevision:4,
   passwordHash:'do-not-export',gmAuth:'private'});
 const art=privateArtifact({artifactId:'mirror',artifactName:'Tráng Gương',artifactCard:{name:'Tráng Gương'},
   artworkId:'mirror-img',matchId:'m1',matchRevision:4,passwordHash:'do-not-export',gmAuth:'private'});
 assert.equal(role.roleId,'wolf');
 assert.equal(role.artworkAssetId,'wolf-img');
 assert.equal(role.playerCardVersion,8);
 assert.equal(role.matchRevision,4);
 assert.equal(art.artifactId,'mirror');
 assert.equal(art.artworkAssetId,'mirror-img');
 assert.equal(art.artworkId,'mirror-img');
 for(const x of [role,art]){
   assert.equal(x.gmAuth,undefined);
   assert.equal(x.passwordHash,undefined);
 }
});

test('private cards: production Worker uses one shared sanitizer module',()=>{
 const source=readFileSync('src/index.js','utf8');
 assert.match(source,/from "\.\/gmww-private-card-contract\.js";/);
 for(const name of ['sanitizePlayerRoleCard','sanitizePlayerArtifactCard',
  'mergePlayerRoleCard','privateRole','privateArtifact']){
    assert.doesNotMatch(source,new RegExp('function '+name+'\\('));
    assert.match(source,new RegExp(name+'\\('));
 }
});
