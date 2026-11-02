import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {STANDBY_SCHEMA,makeFixtureProof} from './fixture-contract.mjs';
import {openSyntheticFixtureStore} from './storage-adapter.mjs';
import {assessStage4SyntheticRecovery} from './stage4-readiness.mjs';

const TEST_KEY='stage4-local-synthetic-only-secret-not-for-cloudflare';
const COMMIT='c'.repeat(40);
const ROOM='ABC234';
const opts={fixtureOnly:true,env:{GMWW_CF_STANDBY_FIXTURE_ONLY:'1'},testKey:TEST_KEY};
const input=(patch={})=>({
  fixtureOnly:true,sourceAccount:'synthetic-A',targetAccount:'synthetic-B',
  realProductionDataConnected:false,schemaVersion:STANDBY_SCHEMA,
  sourceSha:COMMIT,targetSha:COMMIT,checkpointSha256:'a'.repeat(64),
  checkpointVerified:true,restoreDryRunVerified:true,restoredChecksumMatches:true,
  activeMatch:false,phase:'lobby',connectedSockets:0,...patch
});
async function newPair(t){
  const root=await mkdtemp(join(tmpdir(),'gmww-stage4-fixture-'));
  t.after(()=>rm(root,{force:true,recursive:true}));
  await writeFile(join(root,'.gmww-cloudflare-standby-only'),
    'GMWW-CF-STANDBY-FIXTURE-ONLY\n',{mode:0o600});
  const a=await openSyntheticFixtureStore({root,account:'A',...opts});
  const b=await openSyntheticFixtureStore({root,account:'B',...opts});
  t.after(()=>{a.close();b.close()});
  return {a,b};
}

test('Stage4 synthetic signed checkpoint dry-run and B restore verify parity, never failover',async t=>{
  const {a,b}=await newPair(t);
  const proof=makeFixtureProof({
    schema:STANDBY_SCHEMA,roomCode:ROOM,revision:1,phase:'lobby',
    activeMatch:false,connectedSockets:0,sourceSha:COMMIT,engineVersion:'V3.291',
    fixture:{seatCount:10,playerCount:2,roomName:'Synthetic Stage4'}
  },{testKey:TEST_KEY,fixtureOnly:true});
  a.capture(proof);
  const checkpoint=a.exportCheckpoint(ROOM);
  const dry=b.restoreCheckpoint(checkpoint);
  assert.equal(dry.status,'DRY_RUN_OK');
  assert.equal(b.read(ROOM),null,'dry run never writes to standby');
  b.restoreCheckpoint(checkpoint,{dryRun:false,confirmSyntheticRestore:true});
  const result=assessStage4SyntheticRecovery(input({
    checkpointSha256:checkpoint.proof.sha256,
    restoredChecksumMatches:a.read(ROOM).sha256===b.read(ROOM).sha256,
    checkpointVerified:checkpoint.signature.length===64,
    restoreDryRunVerified:dry.status==='DRY_RUN_OK'
  }));
  assert.equal(result.syntheticRestoreReady,true);
  assert.equal(result.productionSwitchAllowed,false);
  assert.equal(result.failoverReady,false);
  assert.equal(result.realBackupVerified,false);
  assert.ok(result.requiresSeparateApprovals.includes('REAL_DO_CROSS_ACCOUNT_RESTORE'));
});
test('an active match, a day/night phase or connected sockets always block cutover',()=>{
  for(const bad of [{activeMatch:true},{phase:'day'},{phase:'night'},{connectedSockets:2}]){
    const result=assessStage4SyntheticRecovery(input(bad));
    assert.equal(result.syntheticRestoreReady,false);
    assert.equal(result.productionSwitchAllowed,false);
  }
});
test('missing, stale or tampered recovery evidence blocks all readiness',()=>{
  for(const bad of [
    {checkpointVerified:false},{restoreDryRunVerified:false},{restoredChecksumMatches:false},
    {checkpointSha256:'bad'},{sourceSha:'d'.repeat(40)},{targetSha:'d'.repeat(40)},
    {schemaVersion:'production-room-v1'},{realProductionDataConnected:true},
    {sourceAccount:'Cloudflare-A'},{targetAccount:'Cloudflare-B'},{fixtureOnly:false}
  ]){
    const result=assessStage4SyntheticRecovery(input(bad));
    assert.equal(result.syntheticRestoreReady,false,JSON.stringify(bad));
    assert.equal(result.productionSwitchAllowed,false);
  }
});
test('empty input, unspecified state and permissive flags fail closed',()=>{
  for(const e of [undefined,{},input({activeMatch:undefined}),input({connectedSockets:null})]){
    const result=assessStage4SyntheticRecovery(e);
    assert.equal(result.syntheticRestoreReady,false);
    assert.equal(result.failoverReady,false);
    assert.equal(result.productionSwitchAllowed,false);
    assert.ok(result.blockers.length>0);
  }
});
test('Stage4 source is isolated and never reaches production or Cloudflare credentials',async()=>{
  const {readFileSync}=await import('node:fs');
  const source=readFileSync(new URL('./stage4-readiness.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/cloudflare\.request\(|wrangler\s+deploy|process\.env|GM_SYNC_TOKEN|CLOUDFLARE_API_TOKEN/);
  assert.match(source,/productionSwitchAllowed:false/);
  assert.match(source,/failoverReady:false/);
});
