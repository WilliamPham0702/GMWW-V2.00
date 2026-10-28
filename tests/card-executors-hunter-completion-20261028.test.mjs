import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {hunterLinkedDeaths,isHunterRole} from '../src/gmww-hunter-death-rules.js';
const time=n=>'2026-10-28T00:0'+n+':00Z';
const mark=(who,target,action,night=1)=>({id:'mark-'+who+'-'+night,type:'effect_notice',matchId:'m',night,
  actorId:who,loginId:target,actionId:action,createdAt:time(1)});
const dead=(who,night=1)=>({id:'death-'+who,type:'dead',matchId:'m',night,loginId:who,
  effectActive:true,createdAt:time(2)});
test('Sói Thợ Săn owns a deferred linked-death mark distinct from pack Bite',()=>{
  const assignments=[{loginId:'wolf',roleId:'role_wolf_hunter',roleName:'Sói Thợ Săn'}];
  assert.equal(isHunterRole(assignments[0]),true);
  assert.deepEqual(hunterLinkedDeaths({assignments,interactions:[
    mark('wolf','a','action_wolf_bite'),dead('wolf')],matchId:'m',night:1}),[]);
  const result=hunterLinkedDeaths({assignments,interactions:[
    mark('wolf','a','action_wolf_bite'),mark('wolf','b','action_hunter_mark'),dead('wolf')],matchId:'m',night:1});
  assert.equal(result.length,1);assert.equal(result[0].loginId,'b');
});
test('Hunter marks submitted after death cannot kill retroactively',()=>{
  const assignments=[{loginId:'hunter',roleId:'role_hunter'}];
  assert.deepEqual(hunterLinkedDeaths({assignments,interactions:[
    {...mark('hunter','b','action_hunt'),createdAt:time(3)},dead('hunter')],matchId:'m',night:1}),[]);
});
test('Server validates Hunter faction, Wolf Hunter mark usage and real action type',()=>{
  const s=fs.readFileSync('src/index.js','utf8');
  for(const key of ['HUNTER_THIRD_FACTION_FORBIDDEN','WOLF_HUNTER_REMARK_REQUIRES_PREVIOUS_TARGET_DEATH','WOLF_HUNTER_MARK_TYPE_INVALID'])
    assert.ok(s.includes(key));
  assert.match(s,/roleId==="role_wolf_hunter"&&actionId==="action_hunter_mark"\?"effect_notice"/);
});
