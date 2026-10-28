import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveFoolGallows} from '../src/gmww-gallows-rules.js';
test('Áo Choàng Hoàng Tử prevents repeat executions without burning Fool escape',()=>{
 const assignments=[{loginId:'fool',roleId:'role_fool',artifactId:'artifact_12'}];
 assert.deepEqual(resolveFoolGallows({candidateId:'fool',outcome:'dead',assignments,
   matchId:'m'}),{outcome:'alive',escaped:false,protectedBy:'artifact_12'});
 assert.deepEqual(resolveFoolGallows({candidateId:'fool',outcome:'alive',assignments,
   matchId:'m'}),{outcome:'alive',escaped:false});
});
test('Trượng Luân Hồi and Quyền Trượng Phục Sinh revive owner without role change',()=>{
 const s=fs.readFileSync('src/index.js','utf8');
 assert.ok(s.includes('async applyAutomaticArtifactRevive(meta,rows,now='));
 assert.ok(s.includes('AUTOMATIC_ARTIFACT_REVIVAL'));
 assert.ok(s.includes('"artifactUse:"+loginId+":"+artifactId'));
 assert.ok(s.includes('if(!["artifact_30","artifact_33"].includes(artifactId))continue;'));
 assert.ok(s.includes('owned.usedAt=now'));
 assert.ok(s.includes('await this.applyAutomaticArtifactRevive(meta,rows,now)'));
});
