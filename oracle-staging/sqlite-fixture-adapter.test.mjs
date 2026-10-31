import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,symlink,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {snapshotFixture} from './room-adapter.mjs';
import {openOracleFixtureSqlite} from './sqlite-fixture-adapter.mjs';
const env={GMWW_ORACLE_STAGING:'1',GMWW_ORACLE_FIXTURE_ONLY:'1'};
const base={code:'ABC234',revision:1,phase:'lobby',sourceSha:'a'.repeat(40),
 engineVersion:'V3.285',data:{room:{code:'ABC234',seatCount:8},participantIds:['member:fixture01']}};
async function fixture(t,marked=true){
 const root=await mkdtemp(join(tmpdir(),'gmww-ora-sqlite-'));
 t.after(()=>rm(root,{force:true,recursive:true}));
 if(marked)await writeFile(join(root,'.gmww-oracle-staging-only'),'GMWW-ORACLE-STAGING-ONLY\n',{mode:0o600});
 return root;
}
test('SQLite fixture store persists across restart with verified SHA-256 and revision',async t=>{
 const root=await fixture(t),snap=snapshotFixture(base);
 let store=await openOracleFixtureSqlite(root,env);
 assert.equal(store.get(base.code),null);
 assert.deepEqual(store.put(snap),snap);
 assert.deepEqual(store.put(snap),snap);
 assert.deepEqual(store.get(base.code),snap);
 assert.throws(()=>store.put(snapshotFixture({...base,data:{x:2}})),/STALE_OR_CONFLICTING_REVISION/);
 assert.deepEqual(store.get(base.code),snap,'Conflicting transaction must rollback');
 const next=snapshotFixture({...base,revision:2});
 store.put(next);store.close();
 store=await openOracleFixtureSqlite(root,env);
 assert.deepEqual(store.get(base.code),next,'Persisted after SQLite close/open');
 assert.equal(store.productionSwitchAllowed,false);
 store.close();
});
test('SQLite fixture store rejects corruption and unmarked or linked persistence',async t=>{
 const root=await fixture(t),bad=await fixture(t,false);
 await assert.rejects(openOracleFixtureSqlite(bad,env));
 await assert.rejects(openOracleFixtureSqlite(root,{GMWW_ORACLE_STAGING:'1'}),/STAGING_FIXTURE_OPT_IN_REQUIRED/);
 const link=join(bad,'link');
 await symlink(root,link,'dir');
 await assert.rejects(openOracleFixtureSqlite(link,env),/INVALID_FIXTURE_DIRECTORY/);
 const db=await openOracleFixtureSqlite(root,env),snap=snapshotFixture(base);
 db.put(snap);db.close();
 const raw=new DatabaseSync(join(root,'oracle-fixture-audit.sqlite'));
 raw.prepare('UPDATE fixture_rooms SET digest=? WHERE code=?').run('0'.repeat(64),base.code);
 raw.close();
 const verify=await openOracleFixtureSqlite(root,env);
 assert.throws(()=>verify.get(base.code),/STORAGE_CORRUPT_CHECKSUM/);
 assert.throws(()=>verify.put(snapshotFixture({...base,revision:2})),/STORAGE_CORRUPT_CHECKSUM/);
 verify.close();
});
test('SQLite adapter never saves authentication secrets, roles or oversized snapshots',async t=>{
 const root=await fixture(t),store=await openOracleFixtureSqlite(root,env);
 for(const privateData of [
   {gmToken:'bad'},{nested:{sessionToken:'bad'}},{passwordHash:'bad'},{roleAssignments:[1]},
   {assignments:[]},{privateRole:'wolf'}
 ]) assert.throws(()=>store.put(snapshotFixture({...base,data:privateData})),/PRIVATE_FIXTURE_FIELD/);
 assert.throws(()=>store.put(snapshotFixture({...base,data:{bytes:'a'.repeat(280000)}})),/FIXTURE_TOO_LARGE/);
 assert.equal(store.get(base.code),null);
 assert.throws(()=>store.get('../foo'),/INVALID_ROOM_CODE/);
 store.close();
 assert.throws(()=>store.get(base.code),/SQLITE_CLOSED/);
});
