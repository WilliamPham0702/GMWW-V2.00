import test from 'node:test';
import assert from 'node:assert/strict';
import {exportStagingSnapshot,restoreStagingSnapshot} from '../tools/gr01-staging-export.mjs';
test('isolated staging export and restore preserve data',()=>{
 const source=new Map([['meta',{code:'TEST',phase:'lobby'}],['players',{p1:{role:'seer'}}],['artifactUse:p1',{usedAt:null}]]);
 const backup=exportStagingSnapshot(source,{environment:'gr01-isolated-staging',instanceId:'room-fixture'});
 const target=new Map();assert.equal(restoreStagingSnapshot(backup,target,{environment:'gr01-isolated-staging'}).dryRun,true);
 assert.equal(target.size,0);restoreStagingSnapshot(backup,target,{environment:'gr01-isolated-staging',dryRun:false});
 assert.deepEqual([...target],[...source].sort((a,b)=>a[0].localeCompare(b[0])));
});
test('production export denied',()=>assert.throws(()=>exportStagingSnapshot(new Map(),{environment:'production',instanceId:'room'}),/denied/));
test('production restore denied',()=>assert.throws(()=>restoreStagingSnapshot({source:'production:x'},new Map(),{environment:'production'}),/denied/));
test('nonempty staging target rejected',()=>{
 const backup=exportStagingSnapshot(new Map([['meta',{a:1}]]),{environment:'gr01-isolated-staging',instanceId:'x'});
 assert.throws(()=>restoreStagingSnapshot(backup,new Map([['meta',{live:true}]]),{environment:'gr01-isolated-staging',dryRun:false}),/empty isolated/);
});
