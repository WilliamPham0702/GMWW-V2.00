import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {privateTurnActionOptions,validateGmActionTargets,ARENA_STAGE29_VERSION}
 from '../assets/village/arena-3d/stage29-gm-actions.mjs';
import {CORE_ACTION_CATALOG} from '../assets/village/arena-3d/stage11-core-catalog.mjs';
const standard=(source,id)=>({id,actionId:id,label:id,targetCount:1,passive:false});
test('GĐ29: one GM turn exposes all delivered role actions, not just four preview roles',()=>{
 assert.equal(ARENA_STAGE29_VERSION,'gmww.arena.private-action-menu.29');
 const functions=CORE_ACTION_CATALOG.map(x=>standard(null,x.id));
 const result=privateTurnActionOptions({actorId:'p1',roleId:'role_custom',
  card:{functions,actions:functions},turnActorIds:['member:p1'],matchOk:true});
 assert.equal(result.length,CORE_ACTION_CATALOG.length);
 assert.deepEqual(new Set(result.map(x=>x.actionId)),new Set(CORE_ACTION_CATALOG.map(x=>x.id)));
 assert.equal(result.some(x=>x.actionId==='action_protect'),true);
 assert.equal(result.some(x=>x.actionId==='action_wolf_bite'),true);
 assert.equal(result.some(x=>x.actionId==='action_thief_change_role'),true);
});
test('GĐ29: custom role and Artifact require delivered cards and matching GM turn',()=>{
 const opts=privateTurnActionOptions({actorId:'alice',roleId:'role_ocean',
  artifactId:'artifact_pearl',matchOk:true,turnActorIds:['member:alice'],
  card:{functions:[{actionId:'action_oracle_three',targetCount:3, noSelf:true,label:'Soi ba người'}]},
  artifactCard:{actions:[{actionId:'action_pearl_ward',targetCount:2,noSelf:true,
   label:'Lá chắn Ngọc Trai',vfxFamily:'shield'}]}});
 assert.equal(opts.length,2);
 assert.equal(opts[0].targetCount,3);
 assert.equal(opts[1].targetCount,2);
 assert.equal(opts[1].artifactId,'artifact_pearl');
 assert.deepEqual(validateGmActionTargets(opts[0],
  ['member:bob','member:cara','member:danny']),['bob','cara','danny']);
 assert.equal(validateGmActionTargets(opts[0],['member:bob','member:cara']),null);
 assert.equal(validateGmActionTargets(opts[0],['member:alice','member:bob','member:cara']),null);
 assert.equal(validateGmActionTargets(opts[1],['member:bob','member:bob']),null);
 assert.equal(validateGmActionTargets(opts[1],['member:bob','evil']),null);
 assert.deepEqual(privateTurnActionOptions({actorId:'alice',matchOk:false,turnActorIds:['member:alice'],
  card:{functions:[standard(null,'action_protect')]}}),[]);
 assert.deepEqual(privateTurnActionOptions({actorId:'alice',matchOk:true,turnActorIds:['member:other'],
  card:{functions:[standard(null,'action_protect')]}}),[]);
});
test('GĐ29: zero-target action, reject passive, malformed and targets over limit',()=>{
 const options=privateTurnActionOptions({actorId:'p1',matchOk:true,
  turnActorIds:['member:p1'],card:{functions:[
   {actionId:'action_renounce',targetCount:0,noTarget:true},
   {actionId:'action_passive',passive:true},
   {actionId:'action_too_many',targetCount:30},
   {actionId:'<img>',targetCount:1},
   {actionId:'action_revive',targetCount:1}]}} );
 assert.deepEqual(options.map(x=>x.actionId),['action_renounce','action_revive']);
 assert.deepEqual(validateGmActionTargets(options[0],[]),[]);
 assert.equal(validateGmActionTargets(options[0],['member:p2']),null);
 assert.equal(validateGmActionTargets({actorId:'p1',targetCount:6},Array(6).fill('member:x')),null);
});
test('GĐ30: only GM-only /arena/gm-visuals includes private active actions',()=>{
 const stage=readFileSync('src/arena3d-stage-worker.mjs','utf8');
 assert.match(stage,/const auth=await this\.gmAuthorized\(request\)/);
 assert.match(stage,/if\(!auth\.ok\)return auth\.response/);
 assert.match(stage,/const availableActions=\[\]/);
 assert.match(stage,/const items=privateTurnActionOptions\(/);
 assert.match(stage,/availableActions:availableActions\.slice\(0,90\)/);
 assert.match(stage,/nightControl:await this\.gmNightControls\(meta\)/);
 assert.doesNotMatch(stage,/this\.broadcast\([^\n]*availableActions/);
 assert.match(stage,/redactStagingPublicBroadcast\(payload\)/);
 const live=readFileSync('assets/village/arena-3d/live.mjs','utf8');
 assert.match(live,/validateGmActionTargets\(action,targetIds\)/);
 assert.match(live,/if\(action\.artifactId\)body\.artifactId=action\.artifactId/);
 assert.match(live,/await gm\('battle-action',body\)/);
 const ui=readFileSync('assets/village/arena-3d/gm-dashboard.mjs','utf8');
 assert.match(ui,/hasGM&&Array\.isArray\(nightControl\?\.availableActions\)/);
 assert.match(ui,/onAction\?\.\('coreAction',nightControl\.turnId,action,targetList\)/);
 assert.match(ui,/selectedTargets=\[\.\.\.selectedTargets,seat\.id\]/);
});
test('GĐ31: browser + Core E2E remain isolated from production',()=>{
 const wf=readFileSync('.github/workflows/arena3d-stage14-16-research.yml','utf8');
 const e2e=readFileSync('tests/arena3d-stage16-standard-core-e2e.mjs','utf8');
 assert.match(wf,/wrangler\.arena3d-stage14-staging\.jsonc/);
 assert.match(e2e,/viewer\.reload\(/);
 assert.match(e2e,/dealReconnect:true/);
 assert.match(e2e,/Core đã xác nhận hành động/);
 assert.match(e2e,/viewerDenied:deny\.status/);
});
