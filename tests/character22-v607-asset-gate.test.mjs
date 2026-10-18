// A draft rig may be evaluated on isolated staging BEFORE iPhone owner acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import roster from '../assets/characters/overhaul-v600/portraits-22-30-v606-staging.json' with {type:'json'};
import costumes from '../assets/characters/overhaul-v600/approved-costumes-21-30.json' with {type:'json'};
import {verifyCharacter22Candidate} from '../scripts/verify-character22-rig-candidate.mjs';

const id='character-22';
const row=roster.characters.find(c=>c.id===id);
const outfit=costumes.assets.find(c=>c.id===id);
test('Character 22 portrait remains authentic and owner-approved only for appearance',()=>{
 assert.ok(row&&outfit);
 assert.equal(outfit.approval,'costume appearance only');
 const p='assets'+row.avatar;
 assert.ok(existsSync(p),'missing source portrait');
 const data=readFileSync(p);
 assert.equal(data.length,row.bytes);
 assert.equal(createHash('sha256').update(data).digest('hex'),row.sha256);
});
test('Character 22 needs distinct real 8-way rig before staging preview can activate',async()=>{
 const result=await verifyCharacter22Candidate();
 assert.ok(['PORTRAIT_ONLY','STAGING_RIG_CANDIDATE'].includes(result.status));
 if(result.status==='PORTRAIT_ONLY'){
  assert.equal(result.readyForStaging,false);
  assert.equal(row.availableGLB,false);
  assert.equal(row.validArtworkViews,1);
  assert.deepEqual(row.availableActions,[]);
  return;
 }
 assert.equal(result.readyForStaging,true);
 assert.equal(result.directions,8);
 assert.equal(result.clips,4);
 assert.equal(result.joints,16);
 assert.equal(result.ownerAccepted,false);
 assert.equal(result.productionEnabled,false);
 // Candidate is eligible for a separate iPhone review, not main/Production.
 assert.equal(row.availableGLB,false,'a candidate must not be listed as live/approved');
 assert.deepEqual(row.availableActions,[]);
});
test('Character 22 release activation is prohibited without explicit acceptance',()=>{
 assert.equal(roster.ownerApproved3DSkin,false);
 assert.equal(roster.readyForMain,false);
 assert.equal(roster.stagingOnly,true);
 assert.equal(row.status,'PORTRAIT_ONLY_NOT_RIGGED');
});
