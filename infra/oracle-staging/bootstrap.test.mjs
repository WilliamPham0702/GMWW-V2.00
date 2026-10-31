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

test('Oracle launcher refuses existing unmarked data without changing permissions',async()=>{
  const {mkdtempSync,writeFileSync,statSync,rmSync,existsSync}=await import('node:fs');
  const {tmpdir}=await import('node:os');
  const {join}=await import('node:path');
  const temp=mkdtempSync(join(tmpdir(),'gmww-oracle-refusal-'));
  try{
    writeFileSync(join(temp,'existing-game-data'),'DO-NOT-TOUCH');
    const before=statSync(temp).mode&0o777;
    const r=spawnSync('bash',[script],{
      encoding:'utf8',
      env:{...process.env,GMWW_ORACLE_STATE_DIR:temp,CLOUDFLARE_API_TOKEN:'',CLOUDFLARE_API_KEY:''}
    });
    assert.equal(r.status,1,r.stderr);
    assert.match(r.stderr,/Refusing existing unmarked data/);
    assert.equal(statSync(temp).mode&0o777,before);
    assert.ok(existsSync(join(temp,'existing-game-data')));
    assert.equal(existsSync(join(temp,'.gmww-oracle-staging-only')),false);
  }finally{rmSync(temp,{recursive:true,force:true})}
});
test('Oracle LOCAL STAGING stays out of Production and OTA release workflows',()=>{
  const deploy=readFileSync('.github/workflows/deploy-production.yml','utf8');
  const ota=readFileSync('.github/workflows/github-runtime-ota.yml','utf8');
  const ci=readFileSync('.github/workflows/check-oracle-staging-bootstrap.yml','utf8');
  for(const source of [deploy,ota]){
    assert.match(source,/ORACLE_LOCAL_UNRELATED=/);
    assert.match(source,/infra\/oracle-staging\/start-local[.]sh/);
    assert.match(source,/infra\/oracle-staging\/bootstrap[.]test[.]mjs/);
  }
  assert.match(ci,/node --test infra\/oracle-staging\/bootstrap[.]test[.]mjs/);
});
