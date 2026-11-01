import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,symlink,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {STANDBY_SCHEMA,makeFixtureProof} from './fixture-contract.mjs';
import {openSyntheticFixtureStore,reconcileSyntheticStores} from './storage-adapter.mjs';

const testKey='only-a-synthetic-hmac-key-for-standby-local-tests';
const env={GMWW_CF_STANDBY_FIXTURE_ONLY:'1'};
const payload=(changes={})=>({schema:STANDBY_SCHEMA,roomCode:'ABC234',revision:1,phase:'lobby',
 activeMatch:false,connectedSockets:0,sourceSha:'a'.repeat(40),engineVersion:'V3.286',
 fixture:{seatCount:10,playerCount:2,roomName:'Mock room'},...changes});
const signed=(changes={})=>makeFixtureProof(payload(changes),{fixtureOnly:true,testKey});
async function root(t,marked=true){
 const dir=await mkdtemp(join(tmpdir(),'gmww-cf-standby-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 if(marked)await writeFile(join(dir,'.gmww-cloudflare-standby-only'),
  'GMWW-CF-STANDBY-FIXTURE-ONLY\n',{mode:0o600});
 return dir;
}
const open=(dir,account)=>openSyntheticFixtureStore({root:dir,account,testKey,fixtureOnly:true,env});

test('synthetic A capture -> signed checkpoint -> B dry run -> explicit restore -> parity',async t=>{
 const dir=await root(t),a=await open(dir,'A'),b=await open(dir,'B');
 t.after(()=>{a.close();b.close()});
 assert.deepEqual(a.capture(signed()),{status:'STORED',revision:1});
 const checkpoint=a.exportCheckpoint('ABC234');
 assert.equal(b.read('ABC234'),null);
 assert.equal(b.restoreCheckpoint(checkpoint).status,'DRY_RUN_OK');
 assert.equal(b.read('ABC234'),null,'Dry run must not commit data');
 assert.throws(()=>b.restoreCheckpoint(checkpoint,{dryRun:false}),/CONFIRMATION_REQUIRED/);
 assert.equal(b.restoreCheckpoint(checkpoint,{dryRun:false,confirmSyntheticRestore:true}).status,'STORED');
 assert.equal(a.read('ABC234').sha256,b.read('ABC234').sha256);
 const parity=reconcileSyntheticStores(a,b,'ABC234',{testKey});
 assert.equal(parity.fixtureParity,true);
 assert.equal(parity.productionSwitchAllowed,false);
 assert.ok(parity.blockers.includes('SECOND_ACCOUNT_NOT_PROVISIONED'));
 assert.ok(parity.blockers.includes('LIVE_SWITCH_DISABLED'));
});
test('two accounts persist after independent database reopen',async t=>{
 const dir=await root(t);let a=await open(dir,'A'),b=await open(dir,'B');
 a.capture(signed());b.restoreCheckpoint(a.exportCheckpoint('ABC234'),{dryRun:false,confirmSyntheticRestore:true});
 a.close();b.close();a=await open(dir,'A');b=await open(dir,'B');
 assert.equal(a.read('ABC234').sha256,b.read('ABC234').sha256);
 a.close();b.close();
});
test('revision update needs compare-and-swap and rejects rollback and divergence',async t=>{
 const dir=await root(t),a=await open(dir,'A'),b=await open(dir,'B');
 t.after(()=>{a.close();b.close()});
 a.capture(signed());b.restoreCheckpoint(a.exportCheckpoint('ABC234'),{dryRun:false,confirmSyntheticRestore:true});
 assert.throws(()=>a.capture(signed({revision:2})),/REVISION_CAS_MISMATCH/);
 a.capture(signed({revision:2}),{expectedRevision:1});
 const next=a.exportCheckpoint('ABC234');
 assert.throws(()=>b.restoreCheckpoint(next,{dryRun:false,confirmSyntheticRestore:true}),/REVISION_CAS_MISMATCH/);
 assert.equal(b.restoreCheckpoint(next,{dryRun:false,confirmSyntheticRestore:true,expectedRevision:1}).revision,2);
 assert.equal(b.restoreCheckpoint(next,{expectedRevision:2,dryRun:false,confirmSyntheticRestore:true}).status,'UNCHANGED');
});
test('replayed identical checkpoint is idempotent, never overwrites newer data',async t=>{
 const dir=await root(t),a=await open(dir,'A'),b=await open(dir,'B');
 t.after(()=>{a.close();b.close()});
 a.capture(signed());const old=a.exportCheckpoint('ABC234');
 b.restoreCheckpoint(old,{dryRun:false,confirmSyntheticRestore:true});
 assert.equal(b.restoreCheckpoint(old,{dryRun:false,confirmSyntheticRestore:true,expectedRevision:1}).status,'UNCHANGED');
 a.capture(signed({revision:2}),{expectedRevision:1});
 b.restoreCheckpoint(a.exportCheckpoint('ABC234'),{expectedRevision:1,dryRun:false,confirmSyntheticRestore:true});
 assert.throws(()=>b.restoreCheckpoint(old,{expectedRevision:2,dryRun:false,confirmSyntheticRestore:true}),
  /STALE_OR_DIVERGENT_REVISION/);
 assert.equal(b.read('ABC234').payload.revision,2);
});
test('signed checkpoint cannot be modified after export',async t=>{
 const dir=await root(t),a=await open(dir,'A'),b=await open(dir,'B');
 t.after(()=>{a.close();b.close()});
 a.capture(signed());
 const cp=a.exportCheckpoint('ABC234');cp.proof.payload.fixture.playerCount=4;
 assert.throws(()=>b.restoreCheckpoint(cp),/INVALID_OR_PRIVATE_FIXTURE_PROOF/);
 assert.equal(b.read('ABC234'),null);
});
test('signed checkpoint cannot be redirected to another source or target',async t=>{
 const dir=await root(t),a=await open(dir,'A'),b=await open(dir,'B');
 t.after(()=>{a.close();b.close()});a.capture(signed());
 const cp=a.exportCheckpoint('ABC234');
 assert.throws(()=>b.restoreCheckpoint({...cp,targetAccount:'A'}),/INVALID_CHECKPOINT_ENVELOPE/);
 assert.throws(()=>b.restoreCheckpoint({...cp,signature:'0'.repeat(64)}),/CHECKPOINT_SIGNATURE_MISMATCH/);
 assert.throws(()=>b.restoreCheckpoint({...cp,accessToken:'secret'}),/INVALID_CHECKPOINT_ENVELOPE/);
});
test('recovery forbidden for active match, day/night and connected WebSockets',async t=>{
 const dir=await root(t),a=await open(dir,'A'),b=await open(dir,'B');
 t.after(()=>{a.close();b.close()});
 for(const [i,changes] of [[1,{activeMatch:true,phase:'night'}],[2,{phase:'day'}],[3,{connectedSockets:2}]]){
   a.capture(signed({revision:i,...changes}),{expectedRevision:i===1?null:i-1});
   assert.throws(()=>b.restoreCheckpoint(a.exportCheckpoint('ABC234')),/MATCH_OR_SOCKETS_STILL_ACTIVE/);
 }
 assert.equal(b.read('ABC234'),null);
});
test('mismatched source SHA or game version rejected on existing restored room',async t=>{
 const dir=await root(t),a=await open(dir,'A'),b=await open(dir,'B');
 t.after(()=>{a.close();b.close()});
 a.capture(signed());b.restoreCheckpoint(a.exportCheckpoint('ABC234'),{dryRun:false,confirmSyntheticRestore:true});
 assert.throws(()=>a.capture(signed({revision:2,sourceSha:'b'.repeat(40)}),{expectedRevision:1}),/ENGINE_IDENTITY_CHANGED/);
 assert.equal(a.read('ABC234').payload.revision,1,'A must not mutate when commit SHA changes unexpectedly');
 assert.equal(b.read('ABC234').payload.revision,1,'B must remain unchanged');
});
test('manual SQLite corruption detected before any restore and transaction rolled back',async t=>{
 const dir=await root(t),a=await open(dir,'A'),b=await open(dir,'B');
 a.capture(signed());b.restoreCheckpoint(a.exportCheckpoint('ABC234'),{dryRun:false,confirmSyntheticRestore:true});
 b.close();
 const sqlite=new DatabaseSync(join(dir,'synthetic-B.sqlite'));
 sqlite.prepare('UPDATE fixture_rooms SET digest=? WHERE room=?').run('0'.repeat(64),'ABC234');
 sqlite.close();
 const b2=await open(dir,'B');
 assert.throws(()=>b2.read('ABC234'),/CORRUPT_STORED_METADATA/);
 assert.throws(()=>b2.restoreCheckpoint(a.exportCheckpoint('ABC234'),{expectedRevision:1,dryRun:false,confirmSyntheticRestore:true}),/CORRUPT_STORED_METADATA/);
 assert.equal(b2.productionSwitchAllowed,false);
 a.close();b2.close();
});
test('unmarked directories, symlinks and missing opt in fail closed',async t=>{
 const dir=await root(t),unmarked=await root(t,false);
 await assert.rejects(open(unmarked,'A'),/ENOENT|MARKER/);
 await assert.rejects(openSyntheticFixtureStore({root:dir,account:'A',testKey,fixtureOnly:true,env:{}}),
   /SYNTHETIC_STORAGE_OPT_IN_REQUIRED/);
 await assert.rejects(openSyntheticFixtureStore({root:dir,account:'A',testKey,fixtureOnly:false,env}),
   /SYNTHETIC_STORAGE_OPT_IN_REQUIRED/);
 const link=join(unmarked,'link');await symlink(dir,link,'dir');
 await assert.rejects(open(link,'A'),/INSECURE_STORAGE_DIRECTORY/);
});
test('private session, roles, arbitrary data and account misuse rejected',async t=>{
 const dir=await root(t),a=await open(dir,'A'),b=await open(dir,'B');
 t.after(()=>{a.close();b.close()});
 assert.throws(()=>signed({sessionToken:'secret'}),/INVALID_SCHEMA_FIELDS/);
 assert.throws(()=>signed({fixture:{...payload().fixture,roles:['wolf']}}),/INVALID_FIXTURE/);
 assert.throws(()=>b.capture(signed()),/ONLY_A_MAY_CAPTURE/);
 assert.throws(()=>a.restoreCheckpoint({}),/ONLY_B_MAY_RESTORE/);
 assert.throws(()=>b.exportCheckpoint('ABC234'),/ONLY_A_MAY_EXPORT/);
 assert.throws(()=>a.read('../etc'),/INVALID_ROOM_CODE/);
});
