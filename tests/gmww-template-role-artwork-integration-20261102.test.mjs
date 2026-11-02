import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fetchCanonicalRoleArtwork} from '../src/gmww-template-artwork-source.js';

// Use the Worker template-packaging implementation with synthetic member storage,
// real repository WebP bytes, and Cloudflare's env.ASSETS fetch contract.
const source = fs.readFileSync('src/index.js','utf8');
const from = source.indexOf('async function gmPackageCanonicalTemplateRole(');
const to = source.indexOf('async function gmPreloadTemplateAssets(',from);
assert.ok(from > 0 && to > from);

function makeHarness(role) {
  const bytes = fs.readFileSync('assets/updates/runtime/V3.119/assets/role-artwork-v251/original/' + role + '.webp');
  const assetReads=[],stored=[];
  const env={ASSETS:{fetch:async request=>{
    const path=new URL(request.url).pathname;
    assetReads.push(path);
    return path === '/updates/runtime/V3.119/assets/role-artwork-v251/original/' + role + '.webp'
      ? new Response(bytes,{status:200,headers:{'content-type':'image/webp'}})
      : new Response(null,{status:404});
  }}};
  const member={fetch:async input=>{
    const path=new URL(typeof input==='string'?input:input.url).pathname;
    if(path.endsWith('/status'))return Response.json({assets:['role:'+role],missing:['role:'+role]});
    if(path.endsWith('/assets')){
      stored.push(await input.json());
      return Response.json({ok:true,hasImage:true});
    }
    return Response.json({ok:false},{status:404});
  }};
  const context={
    bearer:()=> 'synthetic-auth',GM_SYNC_TOKEN:'synthetic-auth',
    safeJson:request=>request.json(),memberStore:()=>member,
    fetchCanonicalRoleArtwork,btoa,Uint8Array,Request,Response,URL,
    validImageDataUrl:value=>/^data:image\/webp;base64,/.test(value),
    j:(value,status=200)=>Response.json(value,{status})
  };
  const fn=vm.runInNewContext(source.slice(from,to)+'\ngmPackageCanonicalTemplateRole',context);
  return {fn,env,bytes,assetReads,stored};
}
for(const role of ['role_wolf','role_villager','role_seer']){
  test('AUTO 3 Ván Mẫu packages exact original '+role+' with synthetic storage',async()=>{
    const h=makeHarness(role);
    const request=new Request('https://synthetic.invalid/api/gm/game-templates/test/assets/canonical',{
      method:'POST',body:JSON.stringify({assetId:'role:'+role,package:{roleCard:{name:role}}})
    });
    const response=await h.fn(h.env,'synthetic-template',request);
    const result=await response.json();
    assert.equal(response.status,200,JSON.stringify(result));
    assert.equal(result.ok,true);
    assert.equal(result.hasImage,true);
    assert.equal(result.source,'canonical_server_artwork');
    assert.deepEqual(h.assetReads.map(p=>p.match(/\/runtime\/(V[0-9.]+)\//)?.[1]),['V3.289','V3.119']);
    assert.equal(h.stored.length,1);
    assert.equal(h.stored[0].assetId,'role:'+role);
    assert.deepEqual(Buffer.from(h.stored[0].imageDataUrl.split(',')[1],'base64'),h.bytes);
  });
}
