import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {characterV605PreviewRoute} from '../src/gmww-character-v605-gateway.js';
import portraits from '../assets/characters/overhaul-v600/portraits-22-30-v606-staging.json' with {type:'json'};
import release from '../assets/characters/overhaul-v600/manifest.json' with {type:'json'};
const idList=Array.from({length:9},(_,i)=>'character-'+String(i+22).padStart(2,'0'));
const hash=b=>createHash('sha256').update(b).digest('hex');
test('nine distinct owner-approved costume WebP files are real and byte-for-byte source verified',()=>{
 assert.deepEqual(portraits.characters.map(c=>c.id),idList);
 const seen=new Set();
 for(const row of portraits.characters){
  const file=new URL('../assets'+row.avatar,import.meta.url);
  const buf=readFileSync(file);
  assert.equal(buf.length,row.bytes,row.id);
  assert.equal(buf.toString('ascii',0,4),'RIFF',row.id);
  assert.equal(buf.toString('ascii',8,12),'WEBP',row.id);
  assert.equal(hash(buf),row.sha256,row.id);
  assert.ok(!seen.has(row.sha256),row.id+' duplicate image');
  seen.add(row.sha256);
  assert.equal(row.status,'PORTRAIT_ONLY_NOT_RIGGED');
  assert.equal(row.availableGLB,false);
  assert.deepEqual(row.availableActions,[]);
  assert.equal(existsSync(new URL('../assets/characters/overhaul-v600/'+row.id+'/skin.glb',import.meta.url)),false);
 }
});
test('new portraits never change 21 V6.05 approval or permit any main/production deploy',()=>{
 assert.equal(portraits.readyForMain,false);
 assert.equal(portraits.ownerApproved3DSkin,false);
 assert.equal(portraits.ownerApprovedFourActions,false);
 assert.equal(release.readyForMain,false);
 assert.equal(release.character21Approval.approvedOnIphone,true);
 assert.equal(release.character21Approval.previewOnly,true);
});
test('staging exposes only an actual avatar for each of 22–30, not 4-motion model',async()=>{
 const origin='https://gmww-character21-v605-staging.williampham0702.workers.dev';
 const assets={ASSETS:{async fetch(req){
  const p=new URL(req.url).pathname;
  const file=new URL('../assets'+p,import.meta.url);
  if(!existsSync(file))return new Response('not found',{status:404});
  return new Response(readFileSync(file));
 }}};
 for(const id of idList){
  const avatar=await characterV605PreviewRoute(new Request(origin+'/api/character-v605/'+id+'/avatar'),{GMWW_CHAR21_STAGING:'1',...assets});
  assert.equal(avatar.status,200);
  assert.equal(avatar.headers.get('content-type'),'image/webp');
  assert.equal(avatar.headers.get('x-gmww-character-status'),'portrait-only');
  const c=portraits.characters.find(x=>x.id===id);
  assert.equal(hash(Buffer.from(await avatar.arrayBuffer())),c.sha256);
  for(const endpoint of ['skin','renderer']){
   const bad=await characterV605PreviewRoute(new Request(origin+'/api/character-v605/'+id+'/'+endpoint),{GMWW_CHAR21_STAGING:'1',...assets});
   assert.equal(bad.status,404,id+'/'+endpoint);
  }
  const prod=await characterV605PreviewRoute(new Request('https://gmww-v2-00.williampham0702.workers.dev/api/character-v605/'+id+'/avatar'),{GMWW_CHAR21_STAGING:'1',...assets});
  assert.equal(prod.status,404);
 }
});
