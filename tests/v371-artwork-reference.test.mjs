import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const worker=fs.readFileSync('src/index.js','utf8');
const gm=fs.readFileSync('server-game/current/app.js','utf8');
function roomMethod(from,to){
  const start=worker.indexOf(from),end=worker.indexOf(to,start);
  assert.ok(start>=0&&end>start,'room method bounds');
  return vm.runInNewContext('(class Test { '+worker.slice(start,end)+' }).prototype',{
    j:(data,status)=>({...data,...(status?{status}: {})}),
    sanitizePlayerRoleCard:x=>x,
    sanitizePlayerArtifactCard:x=>x,
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
