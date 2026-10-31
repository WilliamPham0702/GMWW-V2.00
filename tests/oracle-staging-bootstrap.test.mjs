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


import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {snapshotFixture,verifySnapshot,simulateFailover,fixtureStore,ROOM_SNAPSHOT_SCHEMA} from '../oracle-staging/room-adapter.mjs';
const fixture={code:'ABC234',revision:4,phase:'lobby',sourceSha:'a'.repeat(40),engineVersion:'V3.280',data:{players:{a:{seat:1}},meta:{phase:'lobby'}}};

test('Oracle adapter snapshot canonical SHA-256 and tamper detection',()=>{
 const first=snapshotFixture(fixture),second=snapshotFixture({...fixture,data:{meta:{phase:'lobby'},players:{a:{seat:1}}}});
 assert.equal(first.schema,ROOM_SNAPSHOT_SCHEMA);
 assert.equal(first.digest,second.digest);
 assert.equal(first.digest.length,64);
 assert.ok(verifySnapshot(first));
 assert.equal(verifySnapshot({...first,revision:5}),false);
});
test('Oracle adapter rejects malformed room, revision or source version',()=>{
 assert.throws(()=>snapshotFixture({...fixture,code:'../foo'}),/INVALID_ROOM_CODE/);
 assert.throws(()=>snapshotFixture({...fixture,sourceSha:'V3.280'}),/INVALID_SOURCE_SHA/);
 assert.throws(()=>snapshotFixture({...fixture,revision:-1}),/INVALID_REVISION/);
});
test('Oracle failover simulation never authorizes a live backend switch',()=>{
 const stable=snapshotFixture(fixture);
 assert.deepEqual(simulateFailover({primary:stable,standby:stable}).blockers,['GM_APPROVAL_REQUIRED']);
 const ok=simulateFailover({primary:stable,standby:stable,gmApproved:true});
 assert.equal(ok.simulationPass,true);
 assert.equal(ok.productionSwitchAllowed,false);
 assert.ok(simulateFailover({primary:stable,standby:stable,gmApproved:true,activeSockets:1}).blockers.includes('CONNECTED_CLIENTS'));
 const playing=snapshotFixture({...fixture,phase:'night',activeMatch:true});
 assert.ok(simulateFailover({primary:playing,standby:playing,gmApproved:true}).blockers.includes('MATCH_ACTIVE'));
 const diverged=snapshotFixture({...fixture,sourceSha:'b'.repeat(40)});
 assert.ok(simulateFailover({primary:stable,standby:diverged,gmApproved:true}).blockers.includes('MISMATCH_SOURCESHA'));
});
test('Oracle snapshot fixture storage requires isolated marker and refuses stale or modified state',async()=>{
 const root=await mkdtemp(join(tmpdir(),'gmww-oracle-adapter-'));
 const oldStaging=process.env.GMWW_ORACLE_STAGING,oldFixture=process.env.GMWW_ORACLE_FIXTURE_ONLY;
 try{
  delete process.env.GMWW_ORACLE_STAGING;delete process.env.GMWW_ORACLE_FIXTURE_ONLY;
  await assert.rejects(fixtureStore(root),/STAGING_FIXTURE_OPT_IN_REQUIRED/);
  process.env.GMWW_ORACLE_STAGING='1';process.env.GMWW_ORACLE_FIXTURE_ONLY='1';
  await assert.rejects(fixtureStore(root),/ENOENT/);
  await writeFile(join(root,'.gmww-oracle-staging-only'),'GMWW-ORACLE-STAGING-ONLY\n');
  const store=await fixtureStore(root),snap=snapshotFixture(fixture);
  assert.equal(await store.read(fixture.code),null);
  await store.write(snap);
  assert.deepEqual(await store.read(fixture.code),snap);
  assert.deepEqual(await store.write(snap),snap);
  await assert.rejects(store.write(snapshotFixture({...fixture,data:{other:1}})),/STALE_OR_CONFLICTING_REVISION/);
  await store.write(snapshotFixture({...fixture,revision:5}));
  const path=join(root,fixture.code+'.json'),modified=JSON.parse(await readFile(path,'utf8'));
  modified.digest='0'.repeat(64);
  await writeFile(path,JSON.stringify(modified));
  await assert.rejects(store.read(fixture.code),/FIXTURE_CHECKSUM_MISMATCH/);
 }finally{
  if(oldStaging===undefined)delete process.env.GMWW_ORACLE_STAGING;else process.env.GMWW_ORACLE_STAGING=oldStaging;
  if(oldFixture===undefined)delete process.env.GMWW_ORACLE_FIXTURE_ONLY;else process.env.GMWW_ORACLE_FIXTURE_ONLY=oldFixture;
  await rm(root,{recursive:true,force:true});
 }
});
