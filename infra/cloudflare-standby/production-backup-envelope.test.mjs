import test from 'node:test';
import assert from 'node:assert/strict';
import {sealBackupChunk,openBackupChunk,normalizeBackupMeta,BACKUP_ENVELOPE_SCHEMA} from './production-backup-envelope.mjs';

const meta={
 backupId:'1'.repeat(32),objectDigest:'2'.repeat(64),sourceSha:'3'.repeat(40),
 revision:7,index:0,count:1,quiescent:true,connectedSockets:0
};
const text=new TextEncoder();
const fixture=text.encode('Synthetic checkpoint bytes ONLY — not Production GMWW data.');
const key=btoa(String.fromCharCode(...new Uint8Array(32).fill(57))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const wrong=btoa(String.fromCharCode(...new Uint8Array(32).fill(58))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');

test('AES-256-GCM synthetic fixture roundtrip preserves bytes and metadata',async()=>{
 const archive=await sealBackupChunk(fixture,meta,key);
 assert.equal(archive.schema,BACKUP_ENVELOPE_SCHEMA);
 assert.equal(archive.ciphertext.includes('Synthetic'),false);
 assert.equal(Object.hasOwn(archive,'plainSha256'),false,'Never expose low-entropy plaintext hashes');
 assert.deepEqual((await openBackupChunk(archive,key)).plaintext,fixture);
 assert.deepEqual((await openBackupChunk(archive,key)).metadata,meta);
});
test('wrong keys, tampered ciphertext, metadata, nonce and checksums fail closed',async()=>{
 const a=await sealBackupChunk(fixture,meta,key);
 await assert.rejects(openBackupChunk(a,wrong));
 await assert.rejects(openBackupChunk({...a,cipherSha256:'0'.repeat(64)},key),/BACKUP_CHECKSUM_MISMATCH/);
 await assert.rejects(openBackupChunk({...a,metadata:{...meta,revision:8}},key),/BACKUP_AUTHENTICATION_FAILED/);
 const tampered=(a.ciphertext[0]==='A'?'B':'A')+a.ciphertext.slice(1);
 await assert.rejects(openBackupChunk({...a,ciphertext:tampered},key));
 await assert.rejects(openBackupChunk({...a,nonce:'a'.repeat(16)},key));
});
test('active matches, connected sockets, malformed or private metadata never seal',async()=>{
 for(const invalid of [{...meta,quiescent:false},{...meta,connectedSockets:1},
  {...meta,sourceSha:'wrong'},{...meta,backupId:'bad'},{...meta,index:1},
  {...meta,foo:'extra'},{}]){
   assert.throws(()=>normalizeBackupMeta(invalid));
   await assert.rejects(sealBackupChunk(fixture,invalid,key));
 }
 await assert.rejects(sealBackupChunk(new Uint8Array(),meta,key));
 await assert.rejects(sealBackupChunk(new Uint8Array(65537),meta,key));
 await assert.rejects(sealBackupChunk(fixture,meta,'invalid'));
});
test('identical plaintext gets unique nonces/ciphertexts',async()=>{
 const a=await sealBackupChunk(fixture,meta,key),b=await sealBackupChunk(fixture,meta,key);
 assert.notEqual(a.nonce,b.nonce);
 assert.notEqual(a.ciphertext,b.ciphertext);
});
