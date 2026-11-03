import test from 'node:test';
import assert from 'node:assert/strict';
import {archiveIds,compareArchiveSecret,archiveSourceAllowed,archiveScope,archiveWriteDecision}
  from './b-backup-archive-policy.mjs';
import {sealBackupChunk,openBackupChunk} from './production-backup-envelope.mjs';

const metadata={backupId:'a'.repeat(32),objectDigest:'b'.repeat(64),sourceSha:'c'.repeat(40),
 revision:1,index:0,count:1,quiescent:true,connectedSockets:0};
const rawKey=new Uint8Array(32).fill(37);
const aesKey=btoa(String.fromCharCode(...rawKey)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const testKey='qa-archive-only-'.padEnd(48,'z');

test('B archive rejects absent/weak auth and does not depend on GM legacy token',()=>{
 assert.equal(compareArchiveSecret(testKey,testKey),true);
 for(const token of [undefined,null,'',testKey.slice(0,-1),testKey+'x','x'.repeat(48)])
  assert.equal(compareArchiveSecret(token,testKey),false);
 for(const configured of [undefined,'',null,'short',testKey+'\n'])
  assert.equal(compareArchiveSecret(testKey,configured),false);
});
test('B archive restricts immutable backup ID and digest, pins exact source',()=>{
 assert.equal(archiveIds(metadata.backupId,metadata.objectDigest),
   metadata.backupId+':'+metadata.objectDigest);
 assert.throws(()=>archiveIds('bad',metadata.objectDigest));
 assert.throws(()=>archiveIds(metadata.backupId,'wrong'));
 assert.equal(archiveSourceAllowed(metadata,metadata.sourceSha),true);
 for(const bad of [{...metadata,sourceSha:'d'.repeat(40)},
   {...metadata,quiescent:false},{...metadata,connectedSockets:2}])
  assert.equal(archiveSourceAllowed(bad,metadata.sourceSha),false);
 assert.equal(archiveSourceAllowed(metadata,null),false);
});
test('synthetic sealed chunk can be accepted without storing plaintext; immutable conflicts are rejected',async()=>{
 const chunk=await sealBackupChunk(new TextEncoder().encode('Only synthetic B fixture'),metadata,aesKey);
 const opened=await openBackupChunk(chunk,aesKey);
 opened.plaintext.fill(0);
 const scope=archiveScope(opened.metadata);
 assert.equal(archiveWriteDecision(scope,null,null,chunk),'STORE');
 assert.equal(archiveWriteDecision(scope,scope,chunk,chunk),'UNCHANGED');
 assert.equal(archiveWriteDecision(scope,scope,chunk,{...chunk,nonce:'z'.repeat(16)}),'IMMUTABLE_CONFLICT');
 assert.equal(archiveWriteDecision(scope,{...scope,revision:2},null,chunk),'SCOPE_CONFLICT');
 assert.equal(Object.keys(chunk).includes('plaintext'),false);
});
test('B archive refuses active game, live sockets, bad revision and scope',()=>{
 for(const invalid of [{...metadata,quiescent:false},{...metadata,connectedSockets:1},
  {...metadata,revision:-1},{...metadata,count:0},{...metadata,sourceSha:'bad'}])
  assert.throws(()=>archiveScope(invalid));
});
