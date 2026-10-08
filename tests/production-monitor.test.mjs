import test from 'node:test';
import assert from 'node:assert/strict';
import {assertGmwwHealth,probeGmwwProduction} from '../tools/monitor-production.mjs';

const health={ok:true,project:'GMWW-V2.00',version:'V3.21'};
const deep={ok:true,version:'V3.21',checks:{memberStorage:'ready'}};
const manifest={releaseVersion:'3.21',releaseType:'runtime'};
const sync={ok:true};

test('Monitoring requires Worker, storage, update manifest and web-sync in agreement',()=>{
  assert.equal(assertGmwwHealth(health,deep,manifest,sync).version,'V3.21');
  assert.throws(()=>assertGmwwHealth({...health,version:'V3.22'},deep,manifest,sync),/versions differ/);
  assert.throws(()=>assertGmwwHealth(health,{...deep,checks:{memberStorage:'unavailable'}},manifest,sync),/storage readiness/);
  assert.throws(()=>assertGmwwHealth(health,deep,{releaseVersion:'3.18'},sync),/not aligned/);
  assert.throws(()=>assertGmwwHealth(health,deep,manifest,{ok:false}),/sync/);
});

test('Production monitor reads only public GET endpoints and accepts expected assets',async()=>{
  const paths=[];
  const json={'/api/health':health,'/api/health/deep':deep,'/api/update/manifest':manifest,'/api/web-sync':sync};
  const mock=async(url,opts)=>{
    const path=new URL(url).pathname;paths.push([path,opts.method]);
    if(path in json)return Response.json(json[path]);
    if(path==='/')return new Response('<html>GMWW PLAYER</html>');
    if(path==='/village/seat-leaf.webp'||path==='/gm/gm-white-wolf.webp')
      return new Response('webp',{headers:{'content-type':'image/webp'}});
    return new Response('not found',{status:404});
  };
  const state=await probeGmwwProduction('https://gmww.example.test',mock);
  assert.equal(state.seatLeaf,'ready');
  assert.equal(state.gmArtwork,'ready');
  assert.equal(paths.length,7);
  assert.ok(paths.every(([,method])=>method==='GET'));
});

test('Production monitor rejects insecure origins and corrupted assets',async()=>{
  await assert.rejects(probeGmwwProduction('http://gmww.example.test'),/requires HTTPS/);
  const broken=async()=>new Response('Error',{status:503});
  await assert.rejects(probeGmwwProduction('https://gmww.example.test',broken),/failed/);
});
