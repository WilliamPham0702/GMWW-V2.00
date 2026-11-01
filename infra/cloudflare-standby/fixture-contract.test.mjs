import test from 'node:test';
import assert from 'node:assert/strict';
import {STANDBY_SCHEMA,makeFixtureProof,verifyFixtureProof,evaluateStandbyFixture} from './fixture-contract.mjs';
const testKey='gmww-staging-fixture-key-only-long-enough-for-tests';
const base=()=>({schema:STANDBY_SCHEMA,roomCode:'ABC234',revision:3,phase:'lobby',activeMatch:false,
  connectedSockets:0,sourceSha:'f9f32750d484ef3d0b43ca03eafb2937ebaf0e49',engineVersion:'V3.286',
  fixture:{roomName:'Synthetic room',seatCount:10,playerCount:2}});
const proof=(v=base())=>makeFixtureProof(v,{testKey,fixtureOnly:true});
test('explicit fixture-only opt-in required',()=>assert.throws(()=>makeFixtureProof(base(),{testKey}),/OPT_IN/));
test('valid synthetic checksummed HMAC proof passes',()=>assert.equal(verifyFixtureProof(proof(),{testKey}),true));
test('tamper with room fixture fails checksum',()=>{const p=proof();p.payload.fixture.playerCount=9;assert.equal(verifyFixtureProof(p,{testKey}),false)});
test('incorrect HMAC key rejected',()=>assert.equal(verifyFixtureProof(proof(),{testKey:'different-long-enough-staging-test-key'}),false));
test('unexpected private/session fields are forbidden',()=>assert.throws(()=>proof({...base(),accessToken:'secret'}),/INVALID_SCHEMA_FIELDS/));
test('private fixture fields are forbidden',()=>assert.throws(()=>proof({...base(),fixture:{...base().fixture,roles:['wolf']}}),/INVALID_FIXTURE/));
test('invalid room revision/seat count blocked',()=>{
  assert.throws(()=>proof({...base(),revision:-1}),/INVALID_REVISION/);
  assert.throws(()=>proof({...base(),fixture:{...base().fixture,seatCount:99}}),/INVALID_COUNTS/);
});
test('identical signed fixture still NEVER permits live failover',()=>{
  const p=proof();const r=evaluateStandbyFixture({primary:p,standby:proof(),testKey,gmApproved:true,loginSessionE2E:true,websocketE2E:true});
  assert.equal(r.fixtureParity,true);assert.equal(r.productionSwitchAllowed,false);assert.ok(r.blockers.includes('LIVE_SWITCH_DISABLED'));
});
test('live match and connected players block even synthetic parity',()=>{
  const p=proof({...base(),phase:'night',activeMatch:true,connectedSockets:2});
  const r=evaluateStandbyFixture({primary:p,standby:proof({...base(),phase:'night',activeMatch:true,connectedSockets:2}),testKey,gmApproved:true,loginSessionE2E:true,websocketE2E:true});
  assert.ok(r.blockers.includes('MATCH_ACTIVE'));assert.ok(r.blockers.includes('CLIENTS_CONNECTED'));
});
test('mismatched primary standby checksum/commit is rejected',()=>{
  const r=evaluateStandbyFixture({primary:proof(),standby:proof({...base(),sourceSha:'a'.repeat(40)}),testKey});
  assert.equal(r.fixtureParity,false);assert.ok(r.blockers.includes('ROOM_FIXTURE_DIGEST_MISMATCH'));
});
test('missing login/session and websocket parity cannot be waived by GM',()=>{
  const p=proof();const r=evaluateStandbyFixture({primary:p,standby:proof(),testKey,gmApproved:true});
  assert.ok(r.blockers.includes('LIVE_LOGIN_SESSION_NOT_VERIFIED'));assert.ok(r.blockers.includes('LIVE_WEBSOCKET_NOT_VERIFIED'));
});
