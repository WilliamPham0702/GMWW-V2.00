import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const script='infra/oracle-staging/start-local.sh';
const src=readFileSync(script,'utf8');

test('Oracle launch script parses and never deploys or connects remote bindings',()=>{
  const syntax=spawnSync('bash',['-n',script],{encoding:'utf8'});
  assert.equal(syntax.status,0,syntax.stderr);
  for(const flag of ['--local','--persist-to "$STATE"','--ip 127.0.0.1','--inspector-ip 127.0.0.1'])
    assert.ok(src.includes(flag),'missing '+flag);
  assert.doesNotMatch(src,/wrangler (?:deploy|publish|versions deploy)|--remote|cloudflare\.com\/api|--ip 0[.]0[.]0[.]0/);
});
test('Oracle script rejects Cloudflare credentials before opening any server',()=>{
  const r=spawnSync('bash',[script],{encoding:'utf8',env:{...process.env,CLOUDFLARE_API_TOKEN:'never-use-prod-token'}});
  assert.equal(r.status,1);
  assert.match(r.stderr,/Refusing Oracle STAGING with Cloudflare deploy credentials/);
});
test('Oracle staging cannot be mistaken for a production failover release',()=>{
  const w=readFileSync('.github/workflows/deploy-production.yml','utf8');
  const ota=readFileSync('.github/workflows/github-runtime-ota.yml','utf8');
  assert.match(w,/infra\/oracle-staging\/\*/);
  assert.match(ota,/ORACLE_UNRELATED/);
  assert.match(ota,/SKIP_AUTO_RELEASE=true/);
  assert.match(src,/NOT APPROVED for production failover/);
});
test('Oracle launch uses the same code package but a separate DO SQLite namespace',()=>{
  const config=readFileSync('wrangler.jsonc','utf8');
  assert.match(config,/"main": "src\/index[.]js"/);
  assert.match(config,/"class_name": "RoomDurableObject"/);
  assert.match(config,/"storage": "sqlite"/);
  assert.match(src,/\.gmww-oracle-staging-only/);
  assert.match(src,/Refusing existing unmarked data/);
});
