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
