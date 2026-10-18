import test from 'node:test';
import assert from 'node:assert/strict';
import {characterV605Enabled,characterV605PreviewHost,characterV605PreviewCatalog,characterV605PreviewRoute} from '../src/gmww-character-v605-gateway.js';

const stage='https://gmww-character21-v605-staging.williampham0702.workers.dev';
const prod='https://gmww-v2-00.williampham0702.workers.dev';
const enabled={GMWW_CHAR21_STAGING:'1'};
const mocked={
 ASSETS:{async fetch(request){
  const p=new URL(request.url).pathname;
  if(p.endsWith('/avatar.webp'))return new Response('avatar-binary');
  if(p.endsWith('/skin.glb'))return new Response('skinned-glb');
  if(p.endsWith('/renderer.html'))return new Response('<html>WebGL real renderer</html>');
  return new Response('not found',{status:404});
 }}
};
test('No Production access even if preview flag is accidentally set',async()=>{
 assert.equal(characterV605PreviewHost('gmww-v2-00.williampham0702.workers.dev'),false);
 assert.equal(characterV605PreviewHost('example.com'),false);
 assert.equal(characterV605PreviewHost('gmww-character21-v605-staging.williampham0702.workers.dev'),true);
 assert.equal(characterV605Enabled(enabled,new URL(prod)),false);
 assert.equal(characterV605Enabled({},new URL(stage)),false);
 let res=await characterV605PreviewRoute(new Request(prod+'/api/character-v605/catalog'),{...mocked,...enabled});
 assert.equal(res.status,404);
 res=await characterV605PreviewRoute(new Request(stage+'/api/character-v605/catalog'),mocked);
 assert.equal(res.status,404);
});
test('Staging catalog admits Character 21 alone; no member mutations',async()=>{
 const r=await characterV605PreviewRoute(new Request(stage+'/api/character-v605/catalog'),{...enabled,...mocked});
 assert.equal(r.status,200);
 assert.equal(r.headers.get('cache-control'),'no-store');
 const j=await r.json();
 assert.equal(j.totalApproved,1);
 assert.equal(j.characters.length,1);
 assert.equal(j.characters[0].id,'character-21');
 assert.equal(j.characters[0].imageUrl,'/api/character-v605/character-21/avatar');
 assert.equal(j.characters[0].modelUrl,'/api/character-v605/character-21/skin');
 assert.equal(j.characters[0].productionEnabled,false);
 assert.deepEqual(j.characters[0].actions,['Idle','Walk','Run','Result']);
 assert.equal(j.characters[0].directions,8);
});
test('Staging Worker serves correct avatar and GLB content-types and rejects writes',async()=>{
 for(const [route,type,body] of [['avatar','image/webp','avatar-binary'],['skin','model/gltf-binary','skinned-glb'],['renderer','text/html; charset=utf-8','<html>WebGL real renderer</html>']]){
  const r=await characterV605PreviewRoute(new Request(stage+'/api/character-v605/character-21/'+route),{...enabled,...mocked});
  assert.equal(r.status,200);
  assert.equal(r.headers.get('content-type'),type);
  assert.equal(r.headers.get('x-gmww-character-id'),'character-21');
  assert.equal(await r.text(),body);
 }
 const bad=await characterV605PreviewRoute(new Request(stage+'/api/character-v605/character-22/avatar'),{...enabled,...mocked});
 assert.equal(bad.status,404);
 const write=await characterV605PreviewRoute(new Request(stage+'/api/character-v605/catalog',{method:'POST'}),{...enabled,...mocked});
 assert.equal(write.status,405);
 assert.equal(await characterV605PreviewRoute(new Request(stage+'/api/game-characters'),enabled),null);
});
test('GM and Player source only alter explicitly opted-in Character 21',async()=>{
 const fs=await import('node:fs');
 const gm=fs.readFileSync(new URL('../server-game/src/20-members-and-roster.part',import.meta.url),'utf8');
 const web=fs.readFileSync(new URL('../src/player-web-src/20-village-and-profile.part',import.meta.url),'utf8');
 assert.match(gm,/MEMBER_CHARACTER_V605_PREVIEW/);
 assert.match(gm,/memberCharacterV605Avatar/);
 assert.match(web,/GMWW_CHARACTER_V605_STAGING/);
 assert.match(web,/characterV605ImageUrl/);
 assert.match(web,/\/api\/character-v605\/catalog/);
 assert.match(web,/GMWW_CHARACTER_V605_MODEL/);
 assert.match(gm,/gmwwCharacterV605SkinnedPreview/);
 assert.match(gm,/character-21\/renderer\?embed=1/);
 assert.match(web,/characterV605PlayerRenderer/);
 assert.match(web,/character-21\/renderer\?embed=1/);
 assert.ok(gm.includes("character-21")&&web.includes("character-21"));
 assert.equal(characterV605PreviewCatalog().characters.length,1);
});
