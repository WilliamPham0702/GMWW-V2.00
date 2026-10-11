import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBackup,validateBackup,restoreToEmptyMap} from '../tools/gr01-backup-core.mjs';
const fixture=[{key:'member:demo',value:{wins:2,history:[{matchId:'test'}]}},{key:'gameTemplate:demo',value:{id:'demo',playerCount:3}},{key:'sharedArtifactMeta:demo',value:{signature:'abc'}},{key:'meta',value:{phase:'lobby'}},{key:'players',value:{a:{role:'seer'}}}];
test('isolated round trip preserves all fixture keys and values',()=>{const b=makeBackup(fixture);assert.equal(validateBackup(b),true);const map=new Map();assert.equal(restoreToEmptyMap(b,map,{dryRun:true}).count,fixture.length);assert.equal(map.size,0);restoreToEmptyMap(b,map,{dryRun:false});for(const row of fixture)assert.deepEqual(map.get(row.key),row.value)});
test('tampering is rejected',()=>{const b=makeBackup(fixture);b.entries[0].value={tampered:true};assert.throws(()=>validateBackup(b),/Invalid backup entries/)});
test('duplicate keys rejected',()=>assert.throws(()=>makeBackup([fixture[0],fixture[0]]),/Duplicate/));
test('nonempty destination rejected',()=>assert.throws(()=>restoreToEmptyMap(makeBackup(fixture),new Map([['live',1]]),{dryRun:false}),/empty isolated/));
