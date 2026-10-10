import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app=fs.readFileSync('server-game/current/app.js','utf8');
const worker=fs.readFileSync('src/index.js','utf8');

test('Server packages role_guard canonical image without asking iOS WKWebView to fetch local artwork',async()=>{
  const start=worker.indexOf('async function gmPackageCanonicalTemplateRole(env,raw,request){');
  const end=worker.indexOf('async function gmPreloadTemplateAssets(env,raw,request){',start);
  assert.ok(start>0&&end>start);
  const webp=new Uint8Array(120);
  for(let i=0;i<webp.length;i++)webp[i]=i%256;
  webp.set([82,73,70,70],0);webp.set([87,69,66,80],8);
  const events={files:[],puts:[],status:0};
  const store={
    fetch:async request=>{
      const url=typeof request==='string'?request:request.url;
      if(url.includes('assets/status')){
        events.status++;
        return new Response(JSON.stringify({ok:true,assets:['role:role_guard'],missing:events.puts.length?[]:['role:role_guard']}),{headers:{'content-type':'application/json'}});
      }
      if(url.endsWith('/game-templates/assets')){
        const body=await request.json();
        events.puts.push(body);
        return new Response(JSON.stringify({ok:true,hasImage:true}),{headers:{'content-type':'application/json'}});
      }
      throw Error('Unexpected '+url);
    }
  };
  const env={ASSETS:{fetch:async req=>{events.files.push(req.url);return new Response(webp,{headers:{'content-type':'image/webp'}})}}};
  const scope={bearer:()=> 'token',GM_SYNC_TOKEN:'token',safeJson:async req=>req.payload,
    memberStore:()=>store,j:obj=>obj,VERSION:'V3.72',Request,Response,URL,Uint8Array,btoa,
    validImageDataUrl:v=>typeof v==='string'&&v.startsWith('data:image/webp;base64,')&&v.length<1900000};
  const fn=vm.runInNewContext(worker.slice(start,end)+';gmPackageCanonicalTemplateRole',scope);
  const req={url:'https://gmww-v2-00.williampham0702.workers.dev/api/gm/game-templates/test/assets/canonical',
    payload:{assetId:'role:role_guard',package:{roleId:'role_guard',roleCard:{name:'Bảo Vệ'}}}};
  const result=await fn(env,'test',req);
  assert.equal(result.ok,true);
  assert.equal(result.source,'canonical_server_artwork');
  assert.equal(events.puts.length,1);
  assert.equal(events.puts[0].assetId,'role:role_guard');
  assert.equal(events.puts[0].package.roleCard.name,'Bảo Vệ');
  assert.ok(events.puts[0].imageDataUrl.startsWith('data:image/webp;base64,'));
  assert.match(events.files[0],/\/updates\/runtime\/V3\.72\/assets\/role-artwork-v251\/original\/role_guard\.webp$/);
  const cached=await fn(env,'test',req);
  assert.equal(cached.cached,true);
  assert.equal(events.files.length,1);
});

test('Canonical role preloading has a server-only path and custom roles keep their own artwork',()=>{
  const start=app.indexOf('async function playEnsureTemplateAssets(id,cfg){');
  const end=app.indexOf('async function playPreloadSelectedArtwork(cfg){',start);
  const code=app.slice(start,end);
  assert.match(code,/if\(builtinRoleArtwork\(rawId,'display'\)\)/);
  assert.match(code,/gmApi\(endpoint\+'\/canonical',\{method:'POST'/);
  assert.match(code,/else\{[\s\S]*?playRoleArtworkData\(model\)/);
  assert.match(worker,/gmCanonicalTemplateRole&&request\.method==="POST"/);
  assert.match(worker,/CANONICAL_ROLE_ARTWORK_MISSING/);
});

test('No 44-card Artwork startup flood: 1 per 30 seconds only while idle outside rooms',()=>{
  const startup=app.slice(app.indexOf('function initPlayScene(){'));
  assert.doesNotMatch(startup,/setTimeout\(\(\)=>\{void playSyncSharedArtifactLibrary\(\)/);
  assert.match(startup,/playScheduleSharedArtifactLibrarySync\(\)/);
  const start=app.indexOf('function playScheduleSharedArtifactLibrarySync(');
  const end=app.indexOf('async function playEnsureSharedArtifactPool(',start);
  const code=app.slice(start,end);
  assert.match(code,/playSceneRuntime\.busy\|\|isLivePlayRoom\(\)/);
  assert.match(code,/document\.visibilityState/);
  assert.match(code,/playSharedArtifactBackgroundCursor\+\+/);
  assert.match(code,/playSyncSharedArtifactLibrary\(\{onlyIds:\[id\]\}\)/);
  assert.match(code,/playScheduleSharedArtifactLibrarySync\(30000\)/);
  assert.doesNotMatch(code,/playSyncSharedArtifactLibrary\(\)/);
});
