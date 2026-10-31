import test from 'node:test';
import assert from 'node:assert/strict';
import {connect} from 'node:net';
import {spawnSync} from 'node:child_process';
import {makeStagingServer} from '../oracle-staging/server.mjs';

test('Oracle STAGING is alive but never claims game readiness',async t=>{
 const server=makeStagingServer();
 await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(r=>server.close(r)));
 const base='http://127.0.0.1:'+server.address().port;
 const alive=await fetch(base+'/healthz');
 assert.equal(alive.status,200);
 assert.equal((await alive.json()).ready,false);
 const readiness=await fetch(base+'/readyz');
 assert.equal(readiness.status,503);
 const body=await readiness.json();
 assert.equal(body.accepts_game_traffic,false);
 assert.match(body.reason,/not certified/);
 assert.equal(readiness.headers.get('cache-control'),'no-store');
 for(const route of ['/', '/api/gm/join','/api/room','/village/online']) {
   const r=await fetch(base+route,{method:'GET'});
   assert.equal(r.status,503,route);
 }
 const post=await fetch(base+'/api/gm',{method:'POST',body:'{}'});
 assert.equal(post.status,503);
});

test('WebSocket upgrade is denied before DO-to-Oracle adapter exists',async t=>{
 const server=makeStagingServer();
 await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise(r=>server.close(r)));
 const response=await new Promise((resolve,reject)=>{
    const socket=connect(server.address().port,'127.0.0.1');
    let data='';
    socket.on('connect',()=>socket.write(
      'GET /api/room HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n'
    ));
    socket.on('data',chunk=>data+=chunk);
    socket.on('end',()=>resolve(data));
    socket.on('error',reject);
 });
 assert.match(response,/^HTTP\/1\.1 503 Service Unavailable/);
});

test('CLI requires explicit STAGING mode and protects public binding',()=>{
 for(const env of [
   {GMWW_ORACLE_STAGING:''},
   {GMWW_ORACLE_STAGING:'1',GMWW_ORACLE_HOST:'0.0.0.0'},
   {GMWW_ORACLE_STAGING:'1',GMWW_ORACLE_PORT:'0'}
 ]) {
   const r=spawnSync(process.execPath,['oracle-staging/server.mjs'],{env:{...process.env,...env},encoding:'utf8',timeout:3000});
   assert.equal(r.status,2,r.stderr);
 }
});

// Oracle bootstrap release isolation contract; reject expanded source edits.
test('Oracle bootstrap release isolation contract', async()=>{
 const {readFileSync}=await import('node:fs');
 const {classifyBrowserScope}=await import('../.github/scripts/ci-browser-scope.mjs');
 const files=[
  'oracle-staging/server.mjs',
  'tests/oracle-staging-bootstrap.test.mjs',
  'docs/architecture/oracle-staging-bootstrap-20261031.md',
  '.github/workflows/check-oracle-staging-bootstrap.yml',
  '.github/workflows/deploy-production.yml',
  '.github/workflows/github-runtime-ota.yml',
  '.github/workflows/check-player-web.yml',
  '.github/scripts/ci-browser-scope.mjs'
 ];
 const changes=files.map(path=>({path,status:/^(oracle-staging|tests|docs)\//.test(path)||path.endsWith('check-oracle-staging-bootstrap.yml')?'A':'M'}));
 assert.equal(classifyBrowserScope(changes),'oracle-staging-bootstrap');
 assert.equal(classifyBrowserScope([...changes,{path:'src/index.js',status:'M'}]),'full');
 const worker=readFileSync('.github/workflows/deploy-production.yml','utf8');
 const runtime=readFileSync('.github/workflows/github-runtime-ota.yml','utf8');
 assert.match(worker,/ORACLE_UNRELATED/);
 assert.match(worker,/Oracle STAGING-only bootstrap: SKIP Production Worker deploy[.]/);
 assert.match(runtime,/ORACLE_UNRELATED/);
 assert.match(runtime,/Oracle STAGING-only bootstrap: NO automatic Runtime release[.]/);
});

// Guard repair must remain a four-file CI-only update with no duplicated YAML blocks.
test('Oracle YAML release gate repair has one valid guarded block',async()=>{
 const {readFileSync}=await import('node:fs');
 const {classifyBrowserScope}=await import('../.github/scripts/ci-browser-scope.mjs');
 const files=[
  '.github/workflows/deploy-production.yml',
  '.github/workflows/github-runtime-ota.yml',
  '.github/scripts/ci-browser-scope.mjs',
  'tests/oracle-staging-bootstrap.test.mjs'
 ];
 const changes=files.map(path=>({path,status:'M'}));
 assert.equal(classifyBrowserScope(changes),'oracle-staging-bootstrap');
 assert.equal(classifyBrowserScope([...changes,{path:'src/index.js',status:'M'}]),'full');
 const worker=readFileSync(files[0],'utf8');
 const runtime=readFileSync(files[1],'utf8');
 const count=(source,token)=>source.split(token).length-1;
 assert.equal(count(worker,'ORACLE_UNRELATED='),1);
 assert.equal(count(worker,'ORACLE_REPAIR_UNRELATED='),1);
 assert.equal(count(runtime,'ORACLE_UNRELATED='),1);
 assert.equal(count(runtime,'ORACLE_REPAIR_UNRELATED='),1);
 assert.equal(count(runtime,'# Pages-only alias must never trigger a GMWW Runtime package.'),1);
 assert.match(worker,/Oracle release-guard CI repair: SKIP Production Worker deploy[.]/);
 assert.match(runtime,/Oracle release-guard repair only: NO automatic Runtime release[.]/);
 assert.match(runtime,/ORACLE_UNRELATED=\$\(printf.*mjs\)\$' \|\| true\)/);
});

// Regression: PR #678 merged a duplicate publish job that invalidated the entire push workflow.
test('Oracle local Runtime release gate has exactly one package and publish job',async()=>{
 const {readFileSync}=await import('node:fs');
 const runtime=readFileSync('.github/workflows/github-runtime-ota.yml','utf8');
 const count=(token)=>runtime.split(token).length-1;
 assert.equal(count('\n  package:\n'),1,'only one package job');
 assert.equal(count('\n  publish:\n'),1,'only one publish job');
 assert.equal(count('echo "skip_auto_release=$SKIP_AUTO_RELEASE"'),1,'only one release selector');
 assert.equal(count('ORACLE_LOCAL_UNRELATED='),1,'one Oracle local gate');
 assert.equal(count('Oracle LOCAL STAGING only: NO automatic Runtime release.'),1);
 assert.match(runtime,/infra\/oracle-staging\/start-local[.]sh/);
 assert.match(runtime,/infra\/oracle-staging\/bootstrap[.]test[.]mjs/);
 assert.ok(runtime.includes('tests/pages-online-chat-reconnect-e2e[.]mjs'));
});
