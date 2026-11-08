import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {reviveOwnerPlans} from '../src/gmww-artifact-rules.js';

const src=fs.readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
const dead=(loginId,extra={})=>({id:'d-'+loginId,type:'dead',loginId,matchId:'m1',effectActive:true,...extra});

test('revive artifacts: owner who dies is revived once, others untouched',()=>{
  const assignments=[{loginId:'a',roleId:'role_seer',artifactId:'artifact_30'},{loginId:'b',roleId:'role_villager',artifactId:'artifact_33'},{loginId:'c',roleId:'role_wolf',artifactId:'artifact_01'}];
  const rows=[dead('a'),dead('c'),{id:'x',type:'dead',loginId:'b',matchId:'other',effectActive:true}];
  const plans=reviveOwnerPlans({assignments,interactions:rows,matchId:'m1'});
  assert.deepEqual(plans.map(p=>p.loginId),['a']);
  assert.equal(plans[0].name,'Trượng Luân Hồi');
  assert.equal(reviveOwnerPlans({assignments,interactions:rows,matchId:'m1',usedLogins:['a']}).length,0,'single use');
});

test('reviveArtifactSweep clears the death, marks artifact used and keeps role',async()=>{
  const start=src.indexOf('  async reviveArtifactSweep('),end=src.indexOf('  async applyCycle(');
  const Room=vm.runInNewContext('(class { '+src.slice(start,end)+' })',{reviveOwnerPlans,normalizeLoginId:x=>String(x||'').trim().toLowerCase(),Date,String,Number});
  const data=new Map([['assignments',[{loginId:'a',roleId:'role_seer',artifactId:'artifact_33'}]],['artifact:a',{artifactId:'artifact_33',usedAt:null}]]);
  const room=new Room();room.broadcast=()=>{};
  room.ctx={storage:{get:async k=>data.get(k),put:async(k,v)=>data.set(k,v)}};
  const rows=[dead('a')],now='2026-11-08T00:00:00.000Z';
  assert.equal(await room.reviveArtifactSweep({matchId:'m1',cycleNight:2,cycleKey:'night-2'},rows,now),1);
  assert.equal(rows[0].effectActive,false);assert.equal(rows[0].expiredReason,'ARTIFACT_REVIVE');
  assert.ok(data.get('artifactUse:a:artifact_33'));assert.equal(data.get('artifact:a').usedAt,now);
  assert.equal(await room.reviveArtifactSweep({matchId:'m1',cycleNight:2,cycleKey:'night-2'},[dead('a')],now),0,'second death is final');
});

test('Tráng Gương turn plays the Mirror artifact audio, never the copied role audio',()=>{
  const start=src.indexOf('function announcementTargetsForTurn('),end=src.indexOf('// Daytime clips are public');
  const fn=vm.runInNewContext(src.slice(start,end)+';announcementTargetsForTurn',{ANNOUNCE_WOLF_ROLES:['role_wolf','role_alpha_wolf']});
  assert.deepEqual([...fn({kind:'role',mirror:true,roleId:'role_witch',label:'Tráng Gương'})],['artifacts:artifact_23']);
  assert.deepEqual([...fn({kind:'role',roleId:'role_witch'})],['cards:role_witch']);
});
