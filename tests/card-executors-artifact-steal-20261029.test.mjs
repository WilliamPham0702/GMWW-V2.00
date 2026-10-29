import test from 'node:test';
import assert from 'node:assert/strict';
import {validateArtifactSteal,eligibleArtifactReplacements,
 applyArtifactStealSummary,artifactForNewOwner} from '../src/gmww-artifact-steal.js';
const assignments=[
 {loginId:'a',roleId:'role_villager',artifactId:'artifact_17'},
 {loginId:'b',roleId:'role_guard',artifactId:'artifact_16'},
 {loginId:'c',roleId:'role_wolf',artifactId:'artifact_20'}
];
const actorArtifact={artifactId:'artifact_17',matchId:'m'};
const targetArtifact={artifactId:'artifact_16',matchId:'m'};
const args={actorId:'a',targetId:'b',actorArtifact,targetArtifact,assignments,matchId:'m'};
test('Artifact #17 only transfers an unflipped, unused card owned by another player',()=>{
 assert.equal(validateArtifactSteal(args).ok,true);
 for(const value of [{targetId:'a'},{targetArtifact:{...targetArtifact,viewedAt:'today'}},
   {targetArtifact:{...targetArtifact,usedAt:'today'}},
   {targetArtifact:{...targetArtifact,removedFromMatch:true}},
   {targetArtifact:{...targetArtifact,matchId:'different'}},
   {assignments:assignments.map(x=>x.loginId==='b'?{...x,artifactId:'artifact_21'}:x)}])
    assert.equal(validateArtifactSteal({...args,...value}).ok,false);
});
test('Replacement comes from configured, catalog-backed, unassigned cards only',()=>{
 const result=eligibleArtifactReplacements({assignments,
 configured:[{artifactId:'artifact_17'},{artifactId:'artifact_16'},{artifactId:'artifact_20'},{artifactId:'artifact_35'},{artifactId:'artifact_21'}],
 catalog:[{artifactId:'artifact_35'}]});
 assert.deepEqual(result,['artifact_35']);
 assert.deepEqual(eligibleArtifactReplacements({assignments,configured:[{artifactId:'artifact_16'}],catalog:[]}),[]);
});
test('Steal keeps players/roles unchanged and resets only newly issued Artifact state',()=>{
 const now='2026-10-29T12:00:00Z',stolen=artifactForNewOwner({...targetArtifact,viewedAt:null,usedAt:null},'a',now),
 replacement=artifactForNewOwner({artifactId:'artifact_35',matchId:'m'},'b',now);
 const next=applyArtifactStealSummary({assignments,actorId:'a',targetId:'b',stolen,replacement,now});
 assert.equal(next[0].artifactId,'artifact_16');
 assert.equal(next[1].artifactId,'artifact_35');
 assert.equal(next[2].artifactId,'artifact_20');
 assert.equal(next[0].roleId,'role_villager');
 assert.equal(next[1].roleId,'role_guard');
 assert.equal(stolen.loginId,'a');assert.equal(replacement.loginId,'b');
 assert.equal(stolen.viewedAt,null);assert.equal(stolen.usedAt,null);
 assert.equal(assignments[0].artifactId,'artifact_17');
});
