// Thông báo iPhone cho GM khi người chơi tạo phòng (Bark).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GM_PUSH_BARK_ENDPOINT,buildRoomCreatedPush,buildTestPush,maskBarkKey,normalizeBarkKey} from '../src/gmww-gm-push-rules.js';
import {gmSource} from '../.github/scripts/source-groups.mjs';

test('Bark key: accepts bare key or official link, rejects anything else',()=>{
  assert.equal(normalizeBarkKey(' AbCd1234EfGh5678 '),'AbCd1234EfGh5678');
  assert.equal(normalizeBarkKey('https://api.day.app/AbCd1234EfGh5678/Tieu%20de/Noi%20dung'),'AbCd1234EfGh5678');
  for(const bad of ['','short','https://evil.example/AbCd1234EfGh5678','AbCd1234/../x','key with space 123','javascript:alert(1)'])assert.equal(normalizeBarkKey(bad),'',bad);
  assert.equal(maskBarkKey('AbCd1234EfGh5678'),'••••5678');assert.equal(maskBarkKey(''),'');
});
test('room-created push names the owner and room and deep-links to Quản lý phòng',()=>{
  const p=buildRoomCreatedPush('AbCd1234EfGh5678',{code:'56ATN8',roomName:'Phòng 56ATN8',ownerName:'  Tí  \n Sún '});
  assert.equal(p.device_key,'AbCd1234EfGh5678');assert.equal(p.url,'gmww://rooms');
  assert.match(p.body,/^Tí Sún vừa tạo phòng 56ATN8\./);
  assert.match(buildRoomCreatedPush('AbCd1234EfGh5678',{code:'56ATN8',roomName:'Làng vui'}).body,/Một người chơi vừa tạo phòng 56ATN8 \(Làng vui\)/);
  assert.equal(buildRoomCreatedPush('',{code:'56ATN8'}),null);assert.equal(buildRoomCreatedPush('AbCd1234EfGh5678',{}),null);
  assert.equal(buildTestPush('bad'),null);assert.equal(GM_PUSH_BARK_ENDPOINT,'https://api.day.app/push');
});
test('Worker: push settings are GM-only and creation notifies without blocking on failure',async()=>{
  const router=fs.readFileSync('src/worker/http/router.js','utf8'),rooms=fs.readFileSync('src/worker/http/player-room-api.js','utf8');
  for(const route of ['/api/gm/push-settings','/api/gm/push-test']){const at=router.indexOf('"'+route+'"');assert.ok(at>0,route);assert.match(router.slice(at,at+260),/bearer\(request\)!==GM_SYNC_TOKEN/)}
  assert.match(rooms,/await syncRoomDirectory\(env,code\);const createdName=[^;]+;await notifyGmPlayerRoomCreated\(env,\{code,roomName:createdName/);
  const {notifyGmPlayerRoomCreated,gmPushSettingsPut}=await import('../src/worker/http/gm-push-api.js');
  const calls=[],realFetch=globalThis.fetch;let stored='';
  const env={ROOMS:{idFromName:x=>x,get:()=>({fetch:async(u,init)=>{if(init?.method==='PUT'){stored=JSON.parse(init.body).barkKey;return Response.json({ok:true})}return Response.json({ok:true,barkKey:stored})}})}};
  try{
    globalThis.fetch=async(u,init)=>{calls.push([u,JSON.parse(init.body)]);return Response.json({code:200})};
    assert.equal((await notifyGmPlayerRoomCreated(env,{code:'56ATN8',ownerName:'Tí'})).error,'PUSH_NOT_CONFIGURED');assert.equal(calls.length,0);
    const bad=await gmPushSettingsPut(env,new Request('https://x/',{method:'PUT',body:'{"barkKey":"https://evil.example/k"}'}));assert.equal(bad.status,400);
    const ok=await gmPushSettingsPut(env,new Request('https://x/',{method:'PUT',body:'{"barkKey":"https://api.day.app/AbCd1234EfGh5678/"}'}));
    assert.deepEqual(await ok.json(),{ok:true,enabled:true,barkKeyMasked:'••••5678'});
    assert.deepEqual(await notifyGmPlayerRoomCreated(env,{code:'56ATN8',ownerName:'Tí'}),{ok:true});
    assert.equal(calls[0][0],'https://api.day.app/push');assert.equal(calls[0][1].device_key,'AbCd1234EfGh5678');
    globalThis.fetch=async()=>{throw new Error('offline')};
    assert.equal((await notifyGmPlayerRoomCreated(env,{code:'56ATN8'})).error,'PUSH_UNREACHABLE');
  }finally{globalThis.fetch=realFetch}
});
test('GM Server: settings card, deep-link handler inside the app scope, bundle in sync',()=>{
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8'),app=fs.readFileSync('server-game/current/app.js','utf8'),roles=gmSource('30-village-and-setup');
  for(const id of ['gmPushCard','gmPushKey','gmPushSave','gmPushTest','gmPushOff','gmPushStatus'])assert.ok(html.includes('id="'+id+'"'),id);
  assert.match(roles,/function initGmPushAndDeepLink\(\)\{window\.GMWWDeepLink=gmwwHandleDeepLink;bindGmPushCard\(\)\}/);
  assert.match(roles,/openPlayCreateRoomSheet\(\);void loadPlayerRooms\(\)/);
  assert.ok(app.includes('bindPlayerRoomsCard();initGmPushAndDeepLink();'));
  // The part must stay declarations-only: other tests evaluate slices of this group without a DOM.
  const part=fs.readFileSync('server-game/src/30-village-and-setup/45-gm-push-and-deep-link.part','utf8');
  for(const line of part.split('\n'))assert.match(line,/^(\/\/|async function |function |  |\}|$)/,line.slice(0,60));
});
