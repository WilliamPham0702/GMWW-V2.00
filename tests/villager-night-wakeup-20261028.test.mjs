import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {defaultPriorityFirst} from '../src/gmww-game-scene-rules.js';
import {combineConfiguredTurns,groupConfiguredRoleTurns} from '../src/gmww-night-turn-rules.js';
import {wolfPackMembers,shouldWakeWolfPack} from '../src/gmww-wolf-recognition.js';
import {partitionNightSpecialRoles} from '../src/gmww-witch-drunk-clone-rules.js';
import {isWolfRole,packMembers,arrangeNightRoles} from '../src/gmww-pack-night-rules.js';
import {readNightAssignments,canSnowWolfBite} from '../src/gmww-wolf-night-resolution.js';

// Exercise the actual Durable Object night scheduler, not a copied queue builder.
const source=fs.readFileSync('src/index.js','utf8');
const start=source.indexOf('  async buildNightRuntime(meta,night){');
const end=source.indexOf('  async artifactUsedInNight(',start);
assert.ok(start>=0&&end>start,'Production night scheduler must be found');
const Room=vm.runInNewContext('(class {'+source.slice(start,end)+'})',{
  defaultPriorityFirst,combineConfiguredTurns,groupConfiguredRoleTurns,
  wolfPackMembers,shouldWakeWolfPack,partitionNightSpecialRoles,
  isWolfRole,packMembers,arrangeNightRoles,readNightAssignments,canSnowWolfBite,
  normalizeLoginId:x=>String(x||'').replace(/^member:/,'').trim().toLowerCase()
});
const villager={loginId:'alice',roleId:'role_villager',roleName:'Dân Làng',faction:'village'};
const seer={loginId:'bob',roleId:'role_seer',roleName:'Tiên Tri',faction:'village'};
function harness(assignments,options={}){
  const db=new Map([
    ['assignments',assignments],
    ['interactions',[]],
    ['gameConfig',{
      artifactsEnabled:options.artifactsEnabled??false,
      roles:[{roleId:'role_villager',order:1},{roleId:'role_seer',order:1}],
      timing:{defaultActionSec:45,artifactActionSec:30}
    }]
  ]);
  if(options.artifact)db.set('artifact:alice',{
    artifactId:options.artifact.artifactId,priorityFirst:false,singleUse:false
  });
  const room=new Room();
  room.ctx={storage:{
    get:async key=>structuredClone(db.get(key)),
    put:async(key,value)=>db.set(key,structuredClone(value))
  }};
  room.applyNightRoleInheritance=async(_meta,_night,rows)=>({assignments:rows,drunkNotices:[]});
  room.getNightRuntime=async()=>null;
  room.nightRuntimeKey=(_meta,night)=>'nightRuntime:'+night;
  const meta={matchId:'villager-regression',autoGM:false,cycleNight:1,cyclePhase:'night'};
  return {room,meta,db};
}
const roleTurns=queue=>queue.filter(step=>step.kind==='role'||step.kind==='role-group');
const containsVillager=queue=>queue.some(step=>step.roleId==='role_villager'||(step.roles||[]).some(row=>row.roleId==='role_villager'));

test('ordinary Dân Làng gets no night wakeup, speech, progress or timer in night 1 and night 2',async()=>{
  const h=harness([villager,seer]);
  for(const night of [1,2]){
    const rt=await h.room.buildNightRuntime(h.meta,night);
    assert.equal(containsVillager(rt.queue),false);
    assert.deepEqual(Array.from(roleTurns(rt.queue),step=>step.roleId),['role_seer']);
    assert.equal(rt.queue.at(-1).kind,'village-wakeup','Làng ơi dậy đi remains a dawn transition only');
    assert.equal(rt.queue.some(step=>step.loginIds?.includes('alice')),false);
  }
});

test('a village of ordinary Dân Làng only has the internal dawn transition, not fake role turns',async()=>{
  const h=harness([villager,{...villager,loginId:'carol'}]);
  const rt=await h.room.buildNightRuntime(h.meta,1);
  assert.deepEqual(Array.from(rt.queue,step=>step.kind),['village-wakeup']);
});

test('Dân Làng Artifact remains usable on its own night turn without waking ordinary role',async()=>{
  const artifact={artifactId:'artifact_guard',artifactName:'Bùa Hộ Mệnh',artifactPriorityFirst:false};
  const h=harness([{...villager,...artifact},seer],{artifact,artifactsEnabled:true});
  for(const night of [1,2]){
    const rt=await h.room.buildNightRuntime(h.meta,night);
    assert.equal(containsVillager(rt.queue),false);
    assert.ok(rt.queue.some(step=>step.kind==='role'&&step.roleId==='role_seer'));
    const turn=rt.queue.find(step=>step.kind==='artifact-main'&&step.loginId==='alice');
    assert.ok(turn,'Dân Làng must keep its Artifact night action');
    assert.equal(turn.artifactId,'artifact_guard');
    assert.equal(rt.queue.at(-1).kind,'village-wakeup');
  }
});
