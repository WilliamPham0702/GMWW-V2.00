import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker from './b-staging-worker.mjs';
const config=JSON.parse(readFileSync(new URL('./wrangler-b-staging.jsonc',import.meta.url),'utf8'));
const request=(url,method='GET')=>worker.fetch(new Request(url,{method}));
test('Cloudflare B staging config is synthetic-only with no production bindings or routes',()=>{
  assert.equal(config.name,'gmww-b-staging-synthetic');
  assert.equal(config.main,'./b-staging-worker.mjs');
  assert.equal(config.workers_dev,true);
  assert.equal(config.preview_urls,false);
  for(const field of ['account_id','zone_id','routes','route','assets','durable_objects','vars','services','secrets','triggers'])
    assert.equal(Object.hasOwn(config,field),false,field+' must be absent');
  const source=readFileSync(new URL('./b-staging-worker.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/src\/index|GM_SYNC_TOKEN|wrangler deploy|fetch\(['"]https?:\/\//);
});
test('synthetic B health never claims live game, session, WebSocket or failover readiness',async()=>{
  const r=await request('https://gmww-b-staging-synthetic.example-b.workers.dev/health');
  assert.equal(r.status,200);
  const j=await r.json();
  assert.equal(j.ok,true);
  for(const field of ['productionSwitchAllowed','productionDataConnected','loginSessionVerified','websocketVerified'])
    assert.equal(j[field],false);
  assert.equal(r.headers.get('cache-control'),'no-store');
});
test('Worker fails closed on production URL, unknown routes and mutation requests',async()=>{
  const primary=await request('https://gmww-v2-00.williampham0702.workers.dev/health');
  assert.equal(primary.status,403);
  const unknown=await request('https://gmww-b-staging-synthetic.example-b.workers.dev/api/members/login','POST');
  assert.equal(unknown.status,404);
  const ws=await request('https://gmww-b-staging-synthetic.example-b.workers.dev/ws/ABC234');
  assert.equal(ws.status,404);
  const hostSpoof=await request('https://gmww-b-staging-synthetic.example-b.workers.dev.evil.test/health');
  assert.equal(hostSpoof.status,403);
});
