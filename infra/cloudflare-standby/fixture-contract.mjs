/**
 * GMWW Dual Cloudflare Phase 1: synthetic contract/guard ONLY.
 * No endpoints, API tokens, room credentials, production data, deployment or routing.
 */
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';

export const STANDBY_SCHEMA='gmww-cf-standby-fixture-v1';
const CODE=/^[A-HJ-NP-Z2-9]{6}$/;
const SHA=/^[a-f0-9]{40}$/;
const HMAC=/^[a-f0-9]{64}$/;
const FIELDS=['schema','roomCode','revision','phase','activeMatch','connectedSockets','sourceSha','engineVersion','fixture'];
const FIXTURE_FIELDS=['seatCount','playerCount','roomName'];
const own=(v,k)=>Object.prototype.hasOwnProperty.call(v,k);
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
function canonical(v) {
  if(v===null||typeof v==='boolean'||typeof v==='string')return JSON.stringify(v);
  if(typeof v==='number'&&Number.isFinite(v))return JSON.stringify(v);
  if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
  if(plain(v))return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
  throw Error('NON_CANONICAL_VALUE');
}
function requireKey(key) {
  if(typeof key!=='string'||Buffer.byteLength(key,'utf8')<32)throw Error('TEST_KEY_REQUIRED');
  return key;
}
function validate(payload) {
  if(!plain(payload)||Object.keys(payload).length!==FIELDS.length||FIELDS.some(k=>!own(payload,k)))throw Error('INVALID_SCHEMA_FIELDS');
  if(payload.schema!==STANDBY_SCHEMA)throw Error('INVALID_SCHEMA');
  if(typeof payload.roomCode!=='string'||!CODE.test(payload.roomCode))throw Error('INVALID_ROOM_CODE');
  if(!Number.isSafeInteger(payload.revision)||payload.revision<0)throw Error('INVALID_REVISION');
  if(!['lobby','setup','ended','day','night'].includes(payload.phase))throw Error('INVALID_PHASE');
  if(typeof payload.activeMatch!=='boolean')throw Error('INVALID_ACTIVE_MATCH');
  if(!Number.isSafeInteger(payload.connectedSockets)||payload.connectedSockets<0)throw Error('INVALID_SOCKETS');
  if(!SHA.test(payload.sourceSha||''))throw Error('INVALID_SOURCE_SHA');
  if(typeof payload.engineVersion!=='string'||!/^[A-Za-z0-9._-]{1,32}$/.test(payload.engineVersion))throw Error('INVALID_VERSION');
  const f=payload.fixture;
  if(!plain(f)||Object.keys(f).length!==FIXTURE_FIELDS.length||FIXTURE_FIELDS.some(k=>!own(f,k)))throw Error('INVALID_FIXTURE');
  if(!Number.isSafeInteger(f.seatCount)||f.seatCount<1||f.seatCount>30||!Number.isSafeInteger(f.playerCount)||f.playerCount<0||f.playerCount>f.seatCount)throw Error('INVALID_COUNTS');
  if(typeof f.roomName!=='string'||f.roomName.length>50)throw Error('INVALID_ROOM_NAME');
  // Deliberately excludes members, sessions, role cards, tokens and private game state.
  return payload;
}
const sha=o=>createHash('sha256').update(canonical(o)).digest('hex');
const mac=(o,key)=>createHmac('sha256',requireKey(key)).update(canonical(o)).digest('hex');
export function makeFixtureProof(payload,{testKey,fixtureOnly=false}={}) {
  if(fixtureOnly!==true)throw Error('FIXTURE_ONLY_OPT_IN_REQUIRED');
  validate(payload);
  return {payload,sha256:sha(payload),authTag:mac(payload,testKey)};
}
export function verifyFixtureProof(proof,{testKey}={}) {
  try {
    if(!plain(proof)||Object.keys(proof).length!==3||!own(proof,'payload')||!own(proof,'sha256')||!own(proof,'authTag'))return false;
    validate(proof.payload);
    if(!HMAC.test(proof.sha256)||!HMAC.test(proof.authTag))return false;
    const got=Buffer.from(proof.authTag,'hex'),expected=Buffer.from(mac(proof.payload,testKey),'hex');
    return sha(proof.payload)===proof.sha256&&got.length===expected.length&&timingSafeEqual(got,expected);
  }catch{return false}
}
/** Always fail closed for Production. This is a fixture parity report, NOT authorization. */
export function evaluateStandbyFixture({primary,standby,testKey,gmApproved=false,loginSessionE2E=false,websocketE2E=false}={}) {
  const blockers=[];
  const validA=verifyFixtureProof(primary,{testKey}),validB=verifyFixtureProof(standby,{testKey});
  if(!validA||!validB)blockers.push('INVALID_OR_UNSIGNED_FIXTURE');
  else {
    if(primary.sha256!==standby.sha256)blockers.push('ROOM_FIXTURE_DIGEST_MISMATCH');
    if(primary.payload.sourceSha!==standby.payload.sourceSha)blockers.push('SOURCE_SHA_MISMATCH');
    if(primary.payload.engineVersion!==standby.payload.engineVersion)blockers.push('ENGINE_VERSION_MISMATCH');
    if(primary.payload.revision!==standby.payload.revision)blockers.push('REVISION_MISMATCH');
    if(primary.payload.activeMatch||standby.payload.activeMatch||
       !['lobby','setup','ended'].includes(primary.payload.phase)||!['lobby','setup','ended'].includes(standby.payload.phase))
      blockers.push('MATCH_ACTIVE');
    if(primary.payload.connectedSockets||standby.payload.connectedSockets)blockers.push('CLIENTS_CONNECTED');
  }
  if(!gmApproved)blockers.push('GM_APPROVAL_REQUIRED');
  if(!loginSessionE2E)blockers.push('LIVE_LOGIN_SESSION_NOT_VERIFIED');
  if(!websocketE2E)blockers.push('LIVE_WEBSOCKET_NOT_VERIFIED');
  blockers.push('SECOND_ACCOUNT_NOT_PROVISIONED','PRIVATE_STORAGE_NOT_RECONCILED','LIVE_SWITCH_DISABLED');
  return Object.freeze({fixtureParity:validA&&validB&&primary.sha256===standby.sha256,
    stage1SimulationOnly:true,productionSwitchAllowed:false,blockers});
}

/**
 * Phase 1 synthetic authentication/WebSocket contract. Only structured test
 * results, never credentials or real network calls; not a session migration.
 */
export const SYNTHETIC_E2E_SCHEMA='gmww-standby-session-ws-probe-v1';
const E2E_FIELDS=['schema','account','challenge','fixtureId','sourceSha','engineVersion','issuedAtMs',
  'loginStatus','anonymousStatus','wsUpgradeStatus','wsPingPong','reconnectStatus'];
function validateSyntheticE2E(p) {
  if(!plain(p)||Object.keys(p).length!==E2E_FIELDS.length||E2E_FIELDS.some(k=>!own(p,k)))
    throw Error('INVALID_PROBE_FIELDS');
  if(p.schema!==SYNTHETIC_E2E_SCHEMA||!['A','B'].includes(p.account))throw Error('INVALID_ACCOUNT_SCHEMA');
  if(typeof p.challenge!=='string'||!/^[a-f0-9]{32}$/.test(p.challenge))throw Error('INVALID_CHALLENGE');
  if(typeof p.fixtureId!=='string'||!/^[a-z0-9-]{6,48}$/.test(p.fixtureId))throw Error('INVALID_FIXTURE_ID');
  if(!SHA.test(p.sourceSha||'')||typeof p.engineVersion!=='string'||
     !/^[A-Za-z0-9._-]{1,32}$/.test(p.engineVersion))throw Error('INVALID_ENGINE_IDENTITY');
  if(!Number.isSafeInteger(p.issuedAtMs)||p.issuedAtMs<0)throw Error('INVALID_ISSUED_AT');
  if(![200,401].includes(p.loginStatus)||p.anonymousStatus!==401||
     ![101,403].includes(p.wsUpgradeStatus)||typeof p.wsPingPong!=='boolean'||
     ![200,401].includes(p.reconnectStatus))throw Error('INVALID_RESULT_FIELDS');
  return p;
}
export function makeSyntheticE2EProof(result,{testKey,fixtureOnly=false}={}) {
  if(fixtureOnly!==true)throw Error('FIXTURE_ONLY_OPT_IN_REQUIRED');
  validateSyntheticE2E(result);
  return Object.freeze({result,sha256:sha(result),authTag:mac(result,testKey)});
}
export function verifySyntheticE2EProof(proof,{testKey,nowMs}={}) {
  try {
    if(!plain(proof)||Object.keys(proof).length!==3||!own(proof,'result')||
       !own(proof,'sha256')||!own(proof,'authTag'))return false;
    validateSyntheticE2E(proof.result);
    if(!HMAC.test(proof.sha256)||!HMAC.test(proof.authTag)||sha(proof.result)!==proof.sha256)return false;
    if(!Number.isSafeInteger(nowMs)||Math.abs(nowMs-proof.result.issuedAtMs)>5*60_000)return false;
    const expected=Buffer.from(mac(proof.result,testKey),'hex');
    const actual=Buffer.from(proof.authTag,'hex');
    return actual.length===expected.length&&timingSafeEqual(actual,expected);
  }catch{return false}
}
export function assessSyntheticTwoAccountE2E({primary,standby,testKey,nowMs}={}) {
  const blockers=[];
  const validA=verifySyntheticE2EProof(primary,{testKey,nowMs}),
    validB=verifySyntheticE2EProof(standby,{testKey,nowMs});
  if(!validA||!validB)blockers.push('INVALID_EXPIRED_OR_UNSIGNED_E2E');
  else {
    if(primary.result.account!=='A'||standby.result.account!=='B')blockers.push('ACCOUNT_BINDING_MISMATCH');
    for(const field of ['challenge','fixtureId','sourceSha','engineVersion'])
      if(primary.result[field]!==standby.result[field])blockers.push('MISMATCH_'+field.toUpperCase());
    for(const proof of [primary,standby]){
      const p=proof.result;
      if(p.loginStatus!==200||p.anonymousStatus!==401||p.reconnectStatus!==200)
        blockers.push('SYNTHETIC_AUTH_SESSION_FAILED_'+p.account);
      if(p.wsUpgradeStatus!==101||p.wsPingPong!==true)
        blockers.push('SYNTHETIC_WEBSOCKET_FAILED_'+p.account);
    }
  }
  // Never equate synthetic probe with actual two Cloudflare accounts.
  blockers.push('LIVE_E2E_NOT_VERIFIED','SECOND_ACCOUNT_NOT_PROVISIONED','LIVE_SWITCH_DISABLED');
  return Object.freeze({syntheticChecksPass:blockers.length===3,
    liveLoginSessionWebSocketVerified:false,productionSwitchAllowed:false,blockers});
}
