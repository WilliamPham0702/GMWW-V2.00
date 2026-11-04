import test from 'node:test';
import assert from 'node:assert/strict';
import {localUrl,runLocalProbe,stableRoomProjection} from './probe-local.mjs';

const testEnv={GMWW_ORACLE_STAGING:'1',GMWW_ORACLE_PROBE_ONLY:'1',GMWW_ORACLE_PORT:'8787'};
test('Oracle probe only ever targets loopback, never Production',()=>{
  assert.equal(localUrl(testEnv),'http://127.0.0.1:8787');
  assert.equal(localUrl({...testEnv,GMWW_ORACLE_PORT:'8875'}),'http://127.0.0.1:8875');
  for(const env of [
    {...testEnv,GMWW_ORACLE_STAGING:''},
    {...testEnv,GMWW_ORACLE_PROBE_ONLY:''},
    {...testEnv,GMWW_ORACLE_PORT:'0'},
    {...testEnv,GMWW_ORACLE_PORT:'65536'},
    {...testEnv,CLOUDFLARE_API_TOKEN:'DO-NOT-USE'},
    {...testEnv,CLOUDFLARE_API_KEY:'DO-NOT-USE'}
  ])assert.throws(()=>localUrl(env));
});
test('Probe refuses unknown phase before touching STAGING state',async()=>{
  await assert.rejects(runLocalProbe('production',testEnv),/INVALID_PROBE_PHASE/);
});
test('Probe fails closed without a marked isolated state directory',async()=>{
  await assert.rejects(runLocalProbe('create',testEnv),/ISOLATED_STATE_DIR_REQUIRED/);
});

test('Room reconciliation includes only stable, nonsecret public fields',()=>{
 const input={room:{code:'ABC234',roomName:'Oracle STAGING',seatCount:8,phase:'lobby',status:'waiting',gmToken:'NEVER_COPY',updatedAt:42},
 players:[{participantId:'member:test456',secret:'NO'},{participantId:'member:test123',roleName:'SECRET'}]};
 assert.deepEqual(stableRoomProjection(input),{room:{code:'ABC234',roomName:'Oracle STAGING',seatCount:8,phase:'lobby',status:'waiting'},participantIds:['member:test123','member:test456']});
 assert.throws(()=>stableRoomProjection({room:input.room,players:[{participantId:'x'},{participantId:'x'}]}));
 assert.throws(()=>stableRoomProjection({room:{code:'INVALID'},players:[]}));
});
