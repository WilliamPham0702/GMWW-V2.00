import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const worker=fs.readFileSync('src/index.js','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const method=(from,to)=>vm.runInNewContext('(class Tester {'+worker.slice(worker.indexOf(from),worker.indexOf(to,worker.indexOf(from)))+'}).prototype',
  {sanitizePlayerArtifactCard:x=>x,validImageDataUrl:x=>typeof x==='string'&&x.startsWith('data:image/'),j:x=>x});
test('Ván Mẫu packages only Vai Trò, never selected Artifact',async()=>{
  const api=method('  async gameTemplateAssetsStatus(rawId){','  async gameTemplateAssetPut(body){');
  const state=new Map([
    ['gameTemplate:gm-test',{revision:1,compiledConfig:{roles:[{roleId:'wolf'}],artifacts:[{artifactId:'mirror'}]}}],
    ['gameTemplateAsset:gm-test:role:wolf',{revision:1,imageDataUrl:'data:image/webp;base64,AAAA'}]
  ]);
  const ctx={ctx:{storage:{get:async id=>state.get(id)}}};
  const result=await api.gameTemplateAssetsStatus.call(ctx,'gm-test');
  assert.equal(result.ready,true);
  assert.deepEqual(Array.from(result.assets),['role:wolf']);
  assert.equal(result.total,1);
  const start=app.indexOf('function playTemplateAssetIds(cfg){');
  const end=app.indexOf('const playSharedArtifactUploads=',start);
  const fn=vm.runInNewContext(app.slice(start,end)+';({playTemplateAssetIds,playMatchArtifactAssetIds})');
  const cfg={roles:[{roleId:'wolf'},{roleId:'wolf'}],artifacts:[{artifactId:'mirror'},{artifactId:'freeze'}]};
  assert.deepEqual(Array.from(fn.playTemplateAssetIds(cfg)),['role:wolf']);
  assert.deepEqual(Array.from(fn.playMatchArtifactAssetIds(cfg)),['artifact:mirror','artifact:freeze']);
});
test('Server-wide Artifact pool is persisted once and reused across templates',async()=>{
  const methods=method('  async sharedArtifactStatus(){','  // A Ván Mẫu only packages');
  const db=new Map(),writes=[];
  const storage={get:async k=>db.get(k),put:async(k,v)=>{writes.push(k);db.set(k,v)},list:async({prefix})=>new Map([...db].filter(([k])=>k.startsWith(prefix)))};
  const self={ctx:{storage}},id='artifact:mirror',payload={assetId:id,signature:'a'.repeat(64),
    imageDataUrl:'data:image/webp;base64,AAAABBBB',package:{roleCard:{name:'Mirror',singleUse:false}}};
  const first=await methods.sharedArtifactPut.call(self,payload);
  assert.equal(first.ok,true);
  assert.equal(first.cached,false);
  const again=await methods.sharedArtifactPut.call(self,payload);
  assert.equal(again.cached,true);
  assert.equal(writes.filter(k=>k.startsWith('sharedArtifactData:')).length,1);
  const status=await methods.sharedArtifactStatus.call(self);
  assert.deepEqual(Array.from(status.artifacts,x=>x.assetId),[id]);
  const saved=await methods.sharedArtifactGet.call(self,id);
  assert.equal(saved.package.imageDataUrl,payload.imageDataUrl);
  assert.equal(saved.package.artworkAssetId,id);
});
test('Room receives Artifact from central server, never via Ván Mẫu package or mobile re-encode',()=>{
  assert.match(worker,/function gmPreloadSharedArtifacts\(env,raw,request\)/);
  assert.match(worker,/member\.internal\/artifacts\/shared\/status/);
  assert.match(worker,/kind:"artifact",refs/);
  assert.match(worker,/gm\/artwork-refs/);
  assert.match(worker,/SHARED_ARTIFACT_VERIFY_FAILED/);
  assert.match(app,/playScheduleSharedArtifactLibrarySync\(\)/);
  const preload=app.slice(app.indexOf('async function playPreloadSelectedArtwork(cfg){'),app.indexOf('async function playDealRoles(){'));
  assert.match(preload,/await playEnsureSharedArtifactPool\(cfg\)/);
  assert.match(preload,/playRoomApi\('\/shared-artifacts'/);
  assert.doesNotMatch(preload,/playArtifactArtworkData\(/);
  const save=app.slice(app.indexOf('async function savePlayGame(){'),app.indexOf('function playRandomInt',app.indexOf('async function savePlayGame(){')));
  assert.match(save,/await playEnsureTemplateAssets\(id,base\)/);
  assert.doesNotMatch(save,/playArtifactArtworkData\(/);
  assert.match(worker,/Artwork is not released/);
});
