import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openStandbyFixtureStore,STANDBY_MARKER} from './storage-adapter.mjs';
import {makeFixtureProof,STANDBY_SCHEMA} from './fixture-contract.mjs';
const testKey='gmww-fixture-key-for-storage-integration-tests-only';
const payload=(revision=1)=>({schema:STANDBY_SCHEMA,roomCode:'ABC234',revision,phase:'setup',activeMatch:false,connectedSockets:0,
  sourceSha:'e0ca9292ef3f89dc14c9daa31d68194b034f7ddb',engineVersion:'V3.286',fixture:{seatCount:10,playerCount:2,roomName:'Fixture'}});
const signed=n=>makeFixtureProof(payload(n),{testKey,fixtureOnly:true});
async function fixture(fn){
  const dir=await mkdtemp(join(tmpdir(),'gmww-cf-b-fixture-'));
  const prevA=process.env.GMWW_CLOUDFLARE_STANDBY,prevB=process.env.GMWW_CF_STANDBY_FIXTURE_ONLY;
  try{
    await writeFile(join(dir,'.gmww-cf-standby-fixture-only'),STANDBY_MARKER+'\n');
    process.env.GMWW_CLOUDFLARE_STANDBY='1';process.env.GMWW_CF_STANDBY_FIXTURE_ONLY='1';
    await fn(dir);
  }finally{
    if(prevA===undefined)delete process.env.GMWW_CLOUDFLARE_STANDBY;else process.env.GMWW_CLOUDFLARE_STANDBY=prevA;
    if(prevB===undefined)delete process.env.GMWW_CF_STANDBY_FIXTURE_ONLY;else process.env.GMWW_CF_STANDBY_FIXTURE_ONLY=prevB;
    await rm(dir,{force:true,recursive:true});
  }
}
test('refuse without explicit STAGING flags',async()=>fixture(async dir=>{
  delete process.env.GMWW_CF_STANDBY_FIXTURE_ONLY;
  await assert.rejects(openStandbyFixtureStore(dir,{testKey}),/OPT_IN_REQUIRED/);
}));
test('marked synthetic fixture persists and verifies across process adapters',async()=>fixture(async dir=>{
  const first=await openStandbyFixtureStore(dir,{testKey});const p=signed(1);
  await first.write(p);const second=await openStandbyFixtureStore(dir,{testKey});
  assert.deepEqual(await second.read('ABC234'),p);
  assert.equal(second.productionWriteAllowed,false);
}));
test('revision increases; conflicting equal revision cannot overwrite',async()=>fixture(async dir=>{
  const s=await openStandbyFixtureStore(dir,{testKey});await s.write(signed(1));await s.write(signed(2));
  await assert.rejects(s.write(signed(1)),/STALE_OR_CONFLICTING_REVISION/);
  assert.equal((await s.read('ABC234')).payload.revision,2);
}));
test('corruption and forged HMAC refuse reads',async()=>fixture(async dir=>{
  const s=await openStandbyFixtureStore(dir,{testKey});await s.write(signed(1));
  const path=join(dir,'ABC234.json'),data=JSON.parse(await readFile(path,'utf8'));
  data.payload.fixture.playerCount=9;await writeFile(path,JSON.stringify(data));
  await assert.rejects(s.read('ABC234'),/CORRUPT_OR_UNAUTHENTICATED_FIXTURE/);
  await assert.rejects(s.write(signed(2)),/CORRUPT_OR_UNAUTHENTICATED_FIXTURE/);
}));
test('missing marker refuses storage even with env flags',async()=>fixture(async dir=>{
  await writeFile(join(dir,'.gmww-cf-standby-fixture-only'),'INVALID');
  await assert.rejects(openStandbyFixtureStore(dir,{testKey}),/MISSING_STANDBY_MARKER/);
}));
test('unknown room path refused, missing valid room returns null',async()=>fixture(async dir=>{
  const s=await openStandbyFixtureStore(dir,{testKey});
  assert.equal(await s.read('DEF234'),null);
  await assert.rejects(s.read('../etc'),/INVALID_ROOM_CODE/);
}));
