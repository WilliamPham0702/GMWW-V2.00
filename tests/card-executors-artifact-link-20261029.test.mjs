import test from 'node:test';
import assert from 'node:assert/strict';
import {planArtifactLink,linkedArtifactAction} from '../src/gmww-artifact-link.js';
const assignments=[{loginId:'alice',artifactId:'artifact_32'},
 {loginId:'bob',artifactId:'artifact_09'}];
const actorArtifact={artifactId:'artifact_32',matchId:'m'};
const donorArtifact={artifactId:'artifact_09',matchId:'m',
 artifactCard:{functions:[{id:'f9',actionId:'artifact_action_check_villager',
 phase:'day',usageMode:'onceGame',targetCount:1}]}};
const base={actorId:'alice',targetId:'bob',actorArtifact,
 donorArtifact,assignments,matchId:'m'};
test('#32 links only to another valid donor and never mutates donor power',()=>{
 const plan=planArtifactLink(base);assert.equal(plan.ok,true);
 assert.equal(plan.link.sourceArtifactId,'artifact_09');
 assert.equal(plan.copiedFunction.copiedFromArtifactId,'artifact_09');
 assert.equal(plan.copiedFunction.usageMode,'onceGame');
 assert.equal(donorArtifact.artifactCard.functions[0].usageMode,'onceGame');
 assert.equal(planArtifactLink({...base,targetId:'alice'}).ok,false);
 assert.equal(planArtifactLink({...base,donorArtifact:{...donorArtifact,
   removedFromMatch:true}}).ok,false);
 assert.equal(planArtifactLink({...base,donorArtifact:{...donorArtifact,
   artifactId:'artifact_35'}}).ok,false);
});
test('#32 copied action requires linked donor to have revealed the unchanged source',()=>{
 const {link}=planArtifactLink(base);
 const actual={...donorArtifact,viewedAt:'2026-10-29T12:00:00Z'};
 assert.equal(linkedArtifactAction({link,actorId:'alice',actionId:link.actionId,
   matchId:'m',donorArtifact:actual,donorAssignment:assignments[1]}).ok,true);
 assert.equal(linkedArtifactAction({link,actorId:'alice',actionId:link.actionId,
   matchId:'m',donorArtifact,donorAssignment:assignments[1]}).error,
   'ARTIFACT_LINK_SOURCE_NOT_REVEALED');
 assert.equal(linkedArtifactAction({link,actorId:'mallory',actionId:link.actionId,
   matchId:'m',donorArtifact:actual,donorAssignment:assignments[1]}).ok,false);
 assert.equal(linkedArtifactAction({link,actorId:'alice',actionId:link.actionId,
   matchId:'m',donorArtifact:{...actual,removedFromMatch:true},
   donorAssignment:assignments[1]}).ok,false);
});
