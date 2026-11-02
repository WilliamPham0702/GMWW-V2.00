import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STAGING_BASE,assertBUrl,publicChecks} from './b-staging-live-e2e.mjs';

test('GitHub E2E is locked to isolated B HTTPS Worker; cannot query A',()=>{
  assert.equal(STAGING_BASE,'https://gmww-b-staging-synthetic.gmww-stage-b-0702-2026.workers.dev');
  assert.equal(assertBUrl('/health'),STAGING_BASE+'/health');
  for(const path of ['https://gmww-v2-00.williampham0702.workers.dev/health','//elsewhere/health','/../health','/qa/..//health'])assert.throws(()=>assertBUrl(path));
  const source=readFileSync(new URL('./b-staging-live-e2e.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/cloudflare\.request|wrangler\s+deploy|productionSwitchAllowed\s*:\s*true/);
  const workflow=readFileSync(new URL('../../.github/workflows/check-cloudflare-standby.yml',import.meta.url),'utf8');
  assert.match(workflow,/permissions:\s*\n\s*contents:\s*read/);
  assert.doesNotMatch(workflow,/pull_request_target|CLOUDFLARE_API_TOKEN|workers\.dev\/api/);
  assert.match(workflow,/secrets\.GMWW_B_SYNTHETIC_ADMIN_KEY/);
});
test('public live checks require B health, fail-closed statuses and no false parity',async()=>{
  const called=[];
  const request=async (path, opts={})=>{
    called.push({path,hasKey:!!opts.fixtureKey});
    if(path==='/health')return {status:200,data:{ok:true,environment:'cloudflare-b',mode:'synthetic-only',productionSwitchAllowed:false,productionDataConnected:false,loginSessionVerified:false,websocketVerified:false}};
    return {status:401,data:{ok:false,environment:'cloudflare-b',productionSwitchAllowed:false}};
  };
  await publicChecks(request);
  assert.equal(called.length,3);
  assert.deepEqual(called.map(x=>x.path),['/health','/qa/login','/qa/login']);
  const bad=async()=>({status:200,data:{ok:true,environment:'cloudflare-b',mode:'synthetic-only',productionSwitchAllowed:Boolean(1)}});
  await assert.rejects(publicChecks(bad),/failover/);
});
