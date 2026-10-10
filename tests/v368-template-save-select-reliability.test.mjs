import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {selectVerifiedRuntimeV368Delta} from '../src/gmww-ota-delta.js';

const app=fs.readFileSync('server-game/current/app.js','utf8');
const worker=fs.readFileSync('src/index.js','utf8');

test('Repeated Ván Mẫu save keeps revision and already packaged artwork; real change invalidates it',async()=>{
  const start=worker.indexOf('  async gameTemplateUpsert(body){');
  const end=worker.indexOf('  // Artifact artwork is a reusable server-wide catalog',start);
  assert.ok(start>0&&end>start);
  const api=vm.runInNewContext('({'+worker.slice(start,end)+'})',{sanitizeGameConfig:x=>x,j:x=>x});
  const store=new Map(),storage={get:async key=>store.get(key),put:async(key,value)=>{store.set(key,value)}};
  const ctx={ctx:{storage}};
  const input={id:'gm-test',gameConfig:{id:'gm-test',name:'GM Test',playerCount:3,roles:[{roleId:'wolf',count:1},{roleId:'witch',count:1},{roleId:'seer',count:1}],artifacts:[]}};
  const first=await api.gameTemplateUpsert.call(ctx,input);
  assert.equal(first.template.revision,1);
  store.set('gameTemplateAsset:gm-test:role:wolf',{revision:1,imageDataUrl:'artwork-packaged'});
  const retry=await api.gameTemplateUpsert.call(ctx,input);
  assert.equal(retry.template.revision,1);
  assert.equal(store.get('gameTemplateAsset:gm-test:role:wolf').revision,retry.template.revision);
  const changed=await api.gameTemplateUpsert.call(ctx,{...input,gameConfig:{...input.gameConfig,name:'GM Test mới'}});
  assert.equal(changed.template.revision,2);
});

test('Choosing a saved Ván Mẫu never auto-activates local ★ Artifact cards',async()=>{
  const start=app.indexOf('async function applyPlayGameTemplate(id){');
  const end=app.indexOf('async function openPlayGameSheet()',start);
  assert.ok(start>0&&end>start);
  const cfg={name:'GM Test',roles:[{roleId:'wolf',count:1,order:1}],artifacts:[],timing:{defaultActionSec:30}};
  const ctx={playSceneState:{rolePlan:{},roleOrders:{},roleDurations:{},gameTiming:{}},playSceneRuntime:{},
    gmApi:async()=>({template:{compiledConfig:cfg}}),playFavoriteArtifacts:()=>[{id:'starred-artifact'}],
    document:{getElementById:()=>null},savePlayScene:()=>{},updatePlayArtifactToggle:()=>{},
    renderPlayGameRoles:async()=>{},renderPlayGameRoleTimings:()=>{},updatePlayGameRoleCount:()=>{},
    playFlashError:e=>{throw e}};
  await vm.runInNewContext(app.slice(start,end)+';applyPlayGameTemplate("gm-test")',ctx);
  assert.equal(ctx.playSceneState.artifactsEnabled,false);
  assert.equal(ctx.playSceneState.artifactIds.length,0);
  assert.equal(ctx.playSceneState.rolePlan.wolf,1);
  cfg.artifacts=[{artifactId:'persisted-artifact'}];
  await vm.runInNewContext(app.slice(start,end)+';applyPlayGameTemplate("gm-test")',ctx);
  assert.equal(ctx.playSceneState.artifactsEnabled,true);
  assert.equal(ctx.playSceneState.artifactIds[0],'persisted-artifact');
});

test('Runtime selection preload uses single image requests and delayed server config',()=>{
  const start=app.indexOf('async function savePlayGame(){');
  const end=app.indexOf('function playRandomInt',start);
  const flow=app.slice(start,end);
  assert.match(flow,/assetIds:\[templateAssets\[offset\]\]/);
  assert.match(flow,/timeoutMs:60000/);
  assert.ok(flow.indexOf("await playPreloadSelectedArtwork(configured)")<flow.indexOf("await playRoomApi('/config'"));
  assert.match(flow,/playSceneState\.gameTemplateId=String\(cached\?\.template\?\.id\|\|templateId\);[\s\S]*?await playEnsureTemplateAssets/);
  assert.match(app,/const \{timeoutMs=10000,\.\.\.requestOptions\}=opts/);
  assert.match(app,/await gmApi\(endpoint,\{method:'PUT',timeoutMs:60000/);
  assert.match(app,/if\(sel\.value\)await applyPlayGameTemplate\(sel\.value\)/);
});

test('V3.68 OTA carries only verified GM files and fails closed',()=>{
  const origin='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.68/';
  const paths=['GMWW.html','app.js','style.css'];
  const manifest=()=>({releaseVersion:'3.68',runtimeVersion:'3.68',shellVersion:'3.17',releaseType:'runtime',delete:[],runtime:{files:paths.map(path=>({path,url:origin+path,sha256:'b'.repeat(64)}))}});
  const patch=selectVerifiedRuntimeV368Delta(manifest(),'3.67');
  assert.equal(patch?.upgradeMode,'verified-overlay');
  assert.deepEqual(patch?.runtime?.files.map(x=>x.path),paths);
  assert.deepEqual(patch?.delete,[]);
  for(const from of ['3.66','3.68','3.17',''])assert.equal(selectVerifiedRuntimeV368Delta(manifest(),from),null);
  const bad=manifest();bad.runtime.files[1].sha256='oops';
  assert.equal(selectVerifiedRuntimeV368Delta(bad,'3.67'),null);
  for(const ref of ['versioned','manifest'])assert.ok(worker.includes('selectVerifiedRuntimeV368Delta('+ref+',url.searchParams.get("current"))||selectVerifiedRuntimeV367Delta'));
});
