#!/usr/bin/env node
/**
 * GMWW Oracle STAGING: read-only TWO-BACKEND preflight, never live failover.
 * No user accounts, rooms, secrets or production data are exported or mutated.
 */
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

export function chooseOrigins(env=process.env) {
  if(env.GMWW_ORACLE_REMOTE_READONLY!=='1')throw Error('REMOTE_READONLY_OPT_IN_REQUIRED');
  function origin(value,label) {
    if(typeof value!=='string'||!value.trim())throw Error(label+'_MISSING');
    const u=new URL(value);
    if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||
       u.pathname!=='/'||u.port||!u.hostname.includes('.'))throw Error(label+'_UNSAFE_URL');
    const host=u.hostname.toLowerCase();
    if(['localhost','127.0.0.1','0.0.0.0','::1'].includes(host))throw Error(label+'_LOCAL_FORBIDDEN');
    return u.origin;
  }
  const oracle=origin(env.GMWW_ORACLE_STAGING_URL,'ORACLE');
  const cloudflare=origin(env.GMWW_CLOUDFLARE_PROD_URL,'CLOUDFLARE');
  const oh=new URL(oracle).hostname,ch=new URL(cloudflare).hostname;
  if(oh===ch||oh.endsWith('.workers.dev')||oh.endsWith('.pages.dev'))throw Error('ORACLE_ENDPOINT_NOT_INDEPENDENT');
  if(!ch.endsWith('.workers.dev')&&!ch.endsWith('.pages.dev'))throw Error('CLOUDFLARE_ENDPOINT_NOT_VERIFIED');
  return Object.freeze({oracle,cloudflare});
}

async function inspect(origin,path,fetchImpl) {
  const response=await fetchImpl(origin+path,{
    method:'GET',redirect:'manual',cache:'no-store',
    signal:AbortSignal.timeout(10000),headers:{accept:'application/json'}
  });
  if(![200,401,503].includes(response.status))throw Error('UNEXPECTED_HTTP_STATUS '+path+' '+response.status);
  if(response.status>=300&&response.status<400)throw Error('REDIRECT_NOT_ALLOWED');
  const body=await response.json().catch(()=>{throw Error('NON_JSON_RESPONSE '+path)});
  if(!body||typeof body!=='object'||Array.isArray(body))throw Error('INVALID_JSON_BODY '+path);
  return {status:response.status,body};
}
export async function verifyTwoBackends(origins,fetchImpl=fetch) {
  assert.ok(origins?.oracle&&origins?.cloudflare,'Two explicit distinct origins required');
  const [cfHealth,oraHealth,guard,ready,cfDenied,oraDenied]=await Promise.all([
    inspect(origins.cloudflare,'/api/health',fetchImpl),
    inspect(origins.oracle,'/api/health',fetchImpl),
    inspect(origins.oracle,'/healthz',fetchImpl),
    inspect(origins.oracle,'/readyz',fetchImpl),
    inspect(origins.cloudflare,'/api/members/me',fetchImpl),
    inspect(origins.oracle,'/api/members/me',fetchImpl)
  ]);
  for(const [name,health] of [['Cloudflare',cfHealth],['Oracle',oraHealth]]) {
    assert.equal(health.status,200,name+' health must be HTTP 200');
    assert.equal(health.body.ok,true,name+' health must be ok');
    assert.equal(health.body.project,'GMWW-V2.00',name+' project must be GMWW-V2.00');
    assert.ok(/^V[0-9]+[.][0-9]+$/.test(health.body.version),name+' version malformed');
    assert.equal(health.body.version,health.body.serverVersion,name+' engine/server skew');
  }
  assert.equal(oraHealth.body.version,cfHealth.body.version,'Different game engine versions');
  assert.equal(guard.status,200,'Oracle staging identity endpoint not accessible');
  assert.equal(guard.body.service,'gmww-oracle-staging','Oracle identity mismatch');
  assert.equal(guard.body.environment,'STAGING','Not an Oracle staging endpoint');
  assert.equal(guard.body.ready,false,'Oracle control gate must remain fail-closed');
  assert.equal(guard.body.adapterSchema,'gmww-oracle-staging-room-v1','Oracle schema mismatch');
  assert.equal(ready.status,503,'Oracle readiness cannot be opened prematurely');
  assert.equal(ready.body.accepts_game_traffic,false,'Oracle bootstrap must not accept game traffic');
  assert.equal(cfDenied.status,401,'Cloudflare must deny unauthenticated member session');
  assert.equal(oraDenied.status,401,'Oracle must deny unauthenticated member session');
  return Object.freeze({
    contractComparable:true,
    engineVersion:cfHealth.body.version,
    oracleStagingIdentityVerified:true,
    unauthenticatedSessionsDenied:true,
    // These must remain false until the actual remote VM and two-backend fixtures are tested:
    storageMigrationVerified:false,privateDataParityVerified:false,
    remoteLoginSessionWebSocketE2EVerified:false,
    sourceCommitAttested:false,productionSwitchAllowed:false,
    outstanding:['SOURCE_SHA_ATTESTATION','PRIVATE_DATA_RECONCILIATION','ORACLE_VM_SESSION_WEBSOCKET_E2E','GM_BETWEEN_MATCH_APPROVAL']
  });
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
  try {
    const origins=chooseOrigins();
    const report=await verifyTwoBackends(origins);
    console.log(JSON.stringify(report));
    // A passing read-only preflight is intentionally NOT a release or switch approval.
  }catch(error){
    console.error('Oracle STAGING read-only preflight FAILED:',String(error.message||error));
    process.exitCode=1;
  }
}
