import test from 'node:test';
import assert from 'node:assert/strict';
import {planArtifactRoleSwap} from '../src/gmww-artifact-role-swap.js';
const role=(loginId,roleId,faction,artifactId)=>({
 loginId,roleId,roleName:roleId,faction,artifact:{artifactId},
 assignmentIndex:0,roleCard:{name:roleId,functions:[{actionId:roleId+'-power'}]}
});
function sample(){
 const alice=role('alice','role_guard','village','artifact_40');
 const bob=role('bob','role_wolf','wolf','artifact_19');
 return {assignments:[{loginId:'alice',assignmentIndex:0,roleId:alice.roleId,
  roleName:alice.roleName,faction:alice.faction,artifactId:'artifact_40'},
  {loginId:'bob',assignmentIndex:0,roleId:bob.roleId,
  roleName:bob.roleName,faction:bob.faction,artifactId:'artifact_19'}],
 actorId:'alice',targetId:'bob',actorRoles:[alice],targetRoles:[bob],
 now:'2026-10-29T11:30:00.000Z'};
}
test('Swap #40 exchanges role + faction + actual power, not Artifact or identity',()=>{
 const source=sample(),value=planArtifactRoleSwap(source);
 assert.equal(value.ok,true);
 assert.equal(value.assignments[0].roleId,'role_wolf');
 assert.equal(value.assignments[1].roleId,'role_guard');
 assert.equal(value.assignments[0].artifactId,'artifact_40');
 assert.equal(value.assignments[1].artifactId,'artifact_19');
 assert.equal(value.actorRoles[0].roleCard.functions[0].actionId,'role_wolf-power');
 assert.equal(value.targetRoles[0].roleCard.functions[0].actionId,'role_guard-power');
 assert.equal(value.actorRoles[0].artifact.artifactId,'artifact_40');
 assert.equal(value.targetRoles[0].artifact.artifactId,'artifact_19');
 assert.equal(value.actorRoles[0].viewedAt,null);
 assert.equal(source.actorRoles[0].roleId,'role_guard');
});
test('Swap #40 never mutates a match for self-target, unknown player, or missing Role',()=>{
 const s=sample();
 for(const changes of [{targetId:'alice'},{targetId:'nobody'},{targetRoles:[]}])
   assert.equal(planArtifactRoleSwap({...s,...changes}).ok,false);
 assert.equal(s.assignments[0].roleId,'role_guard');
});
test('Multi-Role recipients are rejected rather than silently corrupting the other assignment',()=>{
 const s=sample();s.assignments.push({...s.assignments[0],assignmentIndex:1});
 assert.equal(planArtifactRoleSwap(s).error,'ROLE_SWAP_NEEDS_SINGLE_ROLE');
});
