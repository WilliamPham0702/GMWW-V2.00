import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createPublicRendererFrame,rendererCommands,projectAuthorizedVisualEvents} from '../assets/village/dual-renderer-core.mjs';
import worker from '../assets/village/arena-3d/preview-worker.mjs';

test('Arena Preview: 6/12/20/30 synthetic characters use one read-only Core frame',()=>{
  for(const count of [6,12,20,30]){
    const frame=createPublicRendererFrame({room:{code:'DEMOPR',seatCount:count,matchId:'simulated'},players:Array.from({length:count},(_,i)=>({
      participantId:'mock-'+i,seatId:i+1,positionX:20+i*0.8,positionY:60,gameCharacterId:'character-'+String(i+1).padStart(2,'0')
    }))});
    const twoD=rendererCommands(frame,'2d'),threeD=rendererCommands(frame,'3d');
    assert.equal(threeD.players.length,count);
    assert.deepEqual(twoD.players.map(x=>x.seatId),threeD.players.map(x=>x.seatId));
    assert.equal(threeD.players.every(x=>Number.isFinite(x.position.x)&&Number.isFinite(x.position.z)),true);
  }
});

test('Arena Preview: unreleased secret effects never project to public renderer',()=>{
  const events=[
    {eventId:'wolf-target',kind:'attack',visibility:'public',released:false,matchId:'m1',targetId:'victim',actorId:'wolf'},
    {eventId:'public-vote',kind:'vote',visibility:'public',released:true,matchId:'m1',targetId:'candidate'}
  ];
  const visible=projectAuthorizedVisualEvents(events,{matchId:'m1'});
  assert.deepEqual(visible.map(x=>x.eventId),['public-vote']);
  assert.equal(JSON.stringify(visible).includes('wolf'),false);
});

test('Arena Preview: fixed whitelist excludes Production routes and POST operations',async()=>{
  const noAssets={ASSETS:{fetch:()=>{throw Error('MUST_NOT_READ_ASSETS')}}};
  for(const path of ['/api/rooms/ABCDE','/updates/latest.json','/admin','/rooms','/village/village.mjs']){
    const out=await worker.fetch(new Request('https://arena.example'+path),noAssets);
    assert.equal(out.status,404,path);
  }
  const post=await worker.fetch(new Request('https://arena.example/village/arena-3d/',{method:'POST'}),noAssets);
  assert.equal(post.status,405);
  const health=await worker.fetch(new Request('https://arena.example/api/health'),noAssets);
  assert.equal(health.status,200);
  assert.equal((await health.json()).durableObjects,false);
});

test('Arena Preview: build outputs only 3D HTML, modules and existing vendored Three.js',()=>{
  const result=spawnSync(process.execPath,['assets/village/arena-3d/build-preview.mjs'],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const manifest=JSON.parse(readFileSync('.arena3d-preview-assets/arena-manifest.json','utf8'));
  assert.equal(manifest.isolated,true);
  assert.equal(manifest.assetPaths.length,5);
  for(const path of manifest.assetPaths)assert.ok(existsSync('.arena3d-preview-assets/'+path),path);
  const preview=readFileSync('.arena3d-preview-assets/village/arena-3d/main.mjs','utf8');
  assert.match(preview,/gmwwArenaFps/);
  assert.match(preview,/gmwwArenaReady/);
  assert.doesNotMatch(preview,/fetch\s*\(|new WebSocket|\/api\/rooms|localStorage|sessionStorage/);
});
