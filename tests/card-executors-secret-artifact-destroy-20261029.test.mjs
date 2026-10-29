import test from 'node:test';
import assert from 'node:assert/strict';
import {validateUnrevealedArtifactDestroy as eligible} from '../src/gmww-artifact-destruction.js';
const base={actorId:'owner',targetId:'target',matchId:'m1',
  artifact:{artifactId:'artifact_16',matchId:'m1',viewedAt:null,usedAt:null},
  assignment:{loginId:'target',artifactId:'artifact_16',artifactViewedAt:null,artifactUsedAt:null}};
test('Hắc Ngọc Hủy Diệt may remove only another player\'s unflipped Artifact',()=>{
 assert.deepEqual(eligible(base),{ok:true,artifactId:'artifact_16'});
 for(const update of [
   {targetId:'owner'},{artifact:null},{artifact:{...base.artifact,viewedAt:'2026-10-29'}},
   {assignment:{...base.assignment,artifactViewedAt:'2026-10-29'}},
   {artifact:{...base.artifact,usedAt:'2026-10-29'}},
   {artifact:{...base.artifact,removedFromMatch:true}},
   {artifact:{...base.artifact,matchId:'m0'}},
   {assignment:{...base.assignment,artifactId:'artifact_09'}}
 ])assert.equal(eligible({...base,...update}).error,'DESTROY_TARGET_NOT_UNREVEALED');
});
test('Unflipped removal guard tolerates canonical member login IDs',()=>{
 assert.equal(eligible({...base,targetId:'member:target'}).ok,true);
});
