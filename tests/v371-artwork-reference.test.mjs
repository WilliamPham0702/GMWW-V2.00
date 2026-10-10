import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {selectVerifiedRuntimeV371Delta} from '../src/gmww-ota-delta.js';

const worker=fs.readFileSync('src/index.js','utf8');
const gm=fs.readFileSync('server-game/current/app.js','utf8');
function roomMethod(from,to){
  const start=worker.indexOf(from),end=worker.indexOf(to,start);
  assert.ok(start>=0&&end>start,'room method bounds');
  return vm.runInNewContext('(class Test { '+worker.slice(start,end)+' }).prototype',{
    j:(data,status)=>({...data,...(status?{status}: {})}),
    sanitizePlayerRoleCard:x=>x,
    sanitizePlayerArtifactCard:x=>x,
    validImageDataUrl:x=>/^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(String(x||'')),
    Response,URLSearchParams,Uint8Array,
    MEMBER_STORE_NAME:'__GMWW_MEMBERS__',
  });
}
const store=()=>{const db=new Map(),writes=[];
  return {db,writes,ctx:{storage:{
    get:async k=>db.get(k),
    put:async(k,v)=>{writes.push(k);db.set(k,v)},
    list:async({prefix})=>new Map([...db].filter(([k])=>k.startsWith(prefix))),
    delete:async keys=>{for(const k of Array.isArray(keys)?keys:[keys])db.delete(k)}
  }}}};

test('Saved Vai Trò references are metadata-only, are refreshed per match, and never store an image in a room',async()=>{
  const methods=roomMethod('  async gmArtworkRefs(request,body){','  async roleAssetImage(roleId){');
  const state=store();const self={ctx:state.ctx,gmAuthorized:async()=>({ok:true})};
  const template=(id,role)=>({kind:'template',refs:[{assetId:'role:'+role,roleId:role,templateId:id,revision:3,roleCard:{name:role,version:7}}]});
  const first=await methods.gmArtworkRefs.call(self,{},template('village','wolf'));
  assert.equal(first.ready,true);assert.equal(first.mode,'reference');
  assert.deepEqual([...state.db.get('gmArtworkActiveIds')],['role:wolf']);
  assert.equal(state.db.get('artworkRef:role:wolf').templateId,'village');
  assert.equal(state.writes.some(k=>k.startsWith('artworkAsset:')),false);
  assert.equal(state.db.get('roleCatalog:wolf').roleCard.name,'wolf');
  const artifact=await methods.gmArtworkRefs.call(self,{}, {kind:'artifact',refs:[{assetId:'artifact:mirror',roleId:'mirror',signature:'a'.repeat(64),roleCard:{name:'Mirror',singleUse:true}}]});
  assert.equal(artifact.ready,true);
  assert.deepEqual([...state.db.get('gmArtworkActiveIds')],['role:wolf','artifact:mirror']);
  const manifest=await methods.gmArtworkManifest.call(self,{});
  assert.equal(manifest.mode,'reference');assert.equal(manifest.count,2);
  const newMatch=await methods.gmArtworkRefs.call(self,{},template('other','witch'));
  assert.equal(newMatch.ready,true);
  assert.deepEqual([...state.db.get('gmArtworkActiveIds')],['role:witch']);
  assert.equal(state.db.has('artworkRef:role:wolf'),false);
  assert.equal(state.db.has('artworkRef:artifact:mirror'),false);
});
test('Artwork is inaccessible before Phát Vai and delivered by signed reference afterward',async()=>{
  const api=roomMethod('  async roleAssetImage(roleId){','  async gmAssign(request,body){');
  const state=store();const fetches=[];
  state.db.set('artworkRef:role:wolf',{kind:'template',templateId:'sample',revision:2});
  state.db.set('gmArtworkActiveIds',['role:wolf']);
  state.db.set('meta',{phase:'setup'});
  const self={ctx:state.ctx,env:{ROOMS:{idFromName:x=>x,get:()=>({fetch:async url=>{fetches.push(String(url));return new Response(new Uint8Array([1,2,3]),{headers:{'content-type':'image/webp'}})}})}}};
  const hidden=await api.roleAssetImage.call(self,'role:wolf');
  assert.equal(hidden.status,404);assert.equal(fetches.length,0);
  state.db.set('meta',{phase:'role_delivery'});
  const visible=await api.roleAssetImage.call(self,'role:wolf');
  assert.equal(visible.status,200);assert.deepEqual(new Uint8Array(await visible.arrayBuffer()),new Uint8Array([1,2,3]));
  assert.match(fetches[0],/game-templates\/assets\/image\?/);
  assert.match(fetches[0],/revision=2/);
  assert.equal((await api.roleAssetImage.call(self,'role:old')).status,404);
  state.db.set('artworkRef:artifact:mirror',{kind:'artifact',signature:'b'.repeat(64)});
  state.db.set('gmArtworkActiveIds',['role:wolf','artifact:mirror']);
  assert.equal((await api.roleAssetImage.call(self,'artifact:mirror')).status,200);
  assert.match(fetches.at(-1),/artifacts\/shared\/image\?/);
  state.db.set('meta',{phase:'lobby'});
  assert.equal((await api.roleAssetImage.call(self,'role:wolf')).status,404);
});
test('Selection never encodes or uploads saved artwork again and Artifact shares one metadata batch',()=>{
  const flow=gm.slice(gm.indexOf('async function savePlayGame(){'),gm.indexOf('function playRandomInt',gm.indexOf('async function savePlayGame(){')));
  const preload=gm.slice(gm.indexOf('async function playPreloadSelectedArtwork(cfg){'),gm.indexOf('async function playDealRoles(){'));
  const server=worker.slice(worker.indexOf('async function gmPreloadSharedArtifacts(env,raw,request){'),worker.indexOf('async function roomProxy(env,raw,path,request)'));
  assert.match(flow,/assetIds:templateAssets/);
  assert.doesNotMatch(flow,/assetIds:\[templateAssets\[offset\]\]/);
  assert.match(preload,/assetIds:artifacts/);
  assert.doesNotMatch(preload,/playRoleArtworkData|playArtifactArtworkData|\/role-assets/);
  assert.match(server,/gm\/artwork-refs/);
  assert.doesNotMatch(server,/imageDataUrl|\/gm\/role-assets/);
  assert.match(worker,/Artwork is not released/);
});

test('IPA V3.70 receives only three SHA-verified V3.71 UI files without overwriting artwork',()=>{
  const origin='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.71/';
  const files=['GMWW.html','app.js','style.css'];
  const valid=()=>({releaseVersion:'3.71',runtimeVersion:'3.71',shellVersion:'3.17',releaseType:'runtime',delete:[],
    runtime:{files:files.map(path=>({path,url:origin+path,sha256:'a'.repeat(64)}))}});
  const selected=selectVerifiedRuntimeV371Delta(valid(),'3.70');
  assert.equal(selected?.upgradeMode,'verified-overlay');
  assert.deepEqual(selected?.runtime?.files.map(x=>x.path),files);
  assert.deepEqual(selected?.delete,[]);
  for(const v of ['3.17','3.69','3.71','']){
    assert.equal(selectVerifiedRuntimeV371Delta(valid(),v),null);
  }
  for(const change of [x=>{x.releaseVersion='3.70'},x=>{x.runtime.files[0].url='https://bad.example/GMWW.html'},
    x=>{x.runtime.files[1].sha256='invalid'},x=>{x.runtime.files.push({...x.runtime.files[0]})},x=>{x.delete=['artwork']}])
      {const x=valid();change(x);assert.equal(selectVerifiedRuntimeV371Delta(x,'3.70'),null)}
});
test('Template availability uses compact indexed metadata on repeat selection',async()=>{
  const methods=roomMethod('  async gameTemplateAssetsStatus(rawId){','  async gameTemplateAssetPut(body){');
  const state=store();
  state.db.set('gameTemplate:sample',{revision:2,compiledConfig:{roles:[{roleId:'wolf'}],artifacts:[]}});
  state.db.set('gameTemplateAsset:sample:role:wolf',{revision:2,imageDataUrl:'data:image/webp;base64,AAAA',package:{roleCard:{name:'Wolf'}}});
  const getCalls=[];
  const original=state.ctx.storage.get;
  state.ctx.storage.get=async k=>{getCalls.push(k);return original(k)};
  const self={ctx:state.ctx};
  const first=await methods.gameTemplateAssetsStatus.call(self,'sample');
  assert.equal(first.ready,true);
  assert.ok(getCalls.includes('gameTemplateAsset:sample:role:wolf'));
  assert.equal(state.db.get('gameTemplateAssetMeta:sample:role:wolf').verified,true);
  getCalls.length=0;
  const second=await methods.gameTemplateAssetsStatus.call(self,'sample');
  assert.equal(second.ready,true);
  assert.equal(getCalls.includes('gameTemplateAsset:sample:role:wolf'),false);
  assert.equal(second.packages['role:wolf'].roleCard.name,'Wolf');
});

test('Editing a V3.70 role package keeps the previous revision available for an existing match',async()=>{
  const methods=roomMethod('  async gameTemplateAssetPut(body){','  async gameTemplateAssetGet(rawId,rawAsset){');
  const state=store();
  const firstImage='data:image/webp;base64,QUJD',nextImage='data:image/webp;base64,REVG';
  state.db.set('gameTemplate:sample',{revision:3,compiledConfig:{roles:[{roleId:'wolf'}]}});
  state.db.set('gameTemplateAsset:sample:role:wolf',{
    revision:2,imageDataUrl:firstImage,package:{roleCard:{name:'Old Wolf'}}
  });
  const result=await methods.gameTemplateAssetPut.call({ctx:state.ctx},{
    id:'sample',assetId:'role:wolf',imageDataUrl:nextImage,
    package:{roleName:'New Wolf',roleCard:{name:'New Wolf'}}
  });
  assert.equal(result.hasImage,true);
  assert.equal(state.db.get('gameTemplateAssetRevision:sample:role:wolf:2')?.imageDataUrl,firstImage);
  assert.equal(state.db.get('gameTemplateAssetRevision:sample:role:wolf:3')?.imageDataUrl,nextImage);
  assert.equal(state.db.get('gameTemplateAsset:sample:role:wolf')?.revision,3);
});
test('Editing global Artifact preserves prior signature artwork without packaging it per room',async()=>{
  const methods=roomMethod('  async sharedArtifactPut(body){','  async sharedArtifactGet(rawId){');
  const state=store(),assetId='artifact:mirror',oldSig='a'.repeat(64),newSig='b'.repeat(64);
  const oldImage='data:image/webp;base64,QUJD',newImage='data:image/webp;base64,REVG';
  state.db.set('sharedArtifactMeta:'+assetId,{signature:oldSig,package:{roleCard:{name:'Mirror'}}});
  state.db.set('sharedArtifactData:'+assetId,oldImage);
  const result=await methods.sharedArtifactPut.call({ctx:state.ctx},{
    assetId,signature:newSig,imageDataUrl:newImage,package:{roleCard:{name:'Mirror 2'}}
  });
  assert.equal(result.cached,false);
  assert.equal(state.db.get('sharedArtifactDataVersion:'+assetId+':'+oldSig),oldImage);
  assert.equal(state.db.get('sharedArtifactDataVersion:'+assetId+':'+newSig),newImage);
  assert.equal(state.db.get('sharedArtifactData:'+assetId),newImage);
  assert.equal(state.writes.some(k=>k.startsWith('gameTemplateAsset:')),false);
});
