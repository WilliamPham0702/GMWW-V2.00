import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {validateMasterManifest,reviewCoverage} from '../assets/characters/v4/artwork-review-v418.mjs';
const m=JSON.parse(fs.readFileSync(new URL('../assets/characters/v4/artwork-v416-manifest.json',import.meta.url)));
test('real HD masters remain 4/8 and no production activation',()=>{
 const s=validateMasterManifest(m);assert.equal(s.sourceReady,4);assert.equal(s.missing.length,4);assert.equal(s.canPublish,false);
});
test('even eight source masters without 17 independent layers and owner approval cannot publish',()=>{
 const eight={...m,drafts:[...m.drafts,...['character-01-left','character-02-left','character-02-right','character-02-back'].map(id=>({id:id.slice(0,12),direction:id.slice(13),sha256:'a'.repeat(64)}))]};
 const s=reviewCoverage(eight,eight.drafts.map(x=>x.id+'-'+x.direction));assert.equal(s.canPublish,false);
});
test('duplicate source entries rejected',()=>assert.throws(()=>validateMasterManifest({...m,drafts:[...m.drafts,m.drafts[0]]}),/INVALID_MASTER_ENTRY/));
