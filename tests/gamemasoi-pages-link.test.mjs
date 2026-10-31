import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import proxy from '../infra/pages/gamemasoi/_worker.js';
const read=p=>readFileSync(p,'utf8');
const url='https://gamemasoi.pages.dev';
const old='https://gmww-v2-00.williampham0702.workers.dev';
test('no Pages 302 redirects',()=>{
  assert.deepEqual(read('infra/pages/gamemasoi/_redirects').split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('#')),[]);
});
test('same-origin HTML and API requests preserve headers, bodies and paths',async()=>{
  const req=new Request(url+'/api/health',{headers:{Cookie:'sid=1'}});
  const expected=new Response('{"ok":true}',{headers:{'content-type':'application/json'}});
  let seen; const result=await proxy.fetch(req,{GMWW_SERVER:{fetch:async r=>(seen=r,expected)}});
  assert.equal(result,expected);assert.equal(seen,req);assert.equal(seen.headers.get('cookie'),'sid=1');
  const post=new Request(url+'/api/rooms/A/chat?x=1',{method:'POST',headers:{Authorization:'Bearer dummy'},body:'{"x":1}'});
  const res=await proxy.fetch(post,{GMWW_SERVER:{fetch:async r=>{assert.equal(r,post);assert.equal(r.headers.get('authorization'),'Bearer dummy');assert.equal(await r.text(),'{"x":1}');return new Response('OK')}}});
  assert.equal(res.status,200);
});
test('WebSocket Upgrade forwarded on the same hostname',async()=>{
  const req=new Request(url+'/ws/ABCD?participantId=xyz',{headers:{Upgrade:'websocket'}});
  const answer=new Response('Upgrade required',{status:426});let seen;
  assert.equal(await proxy.fetch(req,{GMWW_SERVER:{fetch:async r=>(seen=r,answer)}}),answer);
  assert.equal(seen,req);assert.equal(seen.headers.get('upgrade'),'websocket');assert.equal(new URL(seen.url).host,'gamemasoi.pages.dev');
});
test('only legacy Worker redirects rewritten; no external redirect hijacking',async()=>{
  const req=new Request(url+'/');
  const v=await proxy.fetch(req,{GMWW_SERVER:{fetch:async()=>new Response(null,{status:302,headers:{Location:old+'/signin?x=1'}})}});
  assert.equal(v.headers.get('location'),url+'/signin?x=1');
  const other=new Response(null,{status:302,headers:{location:'https://github.com/'}});
  assert.equal(await proxy.fetch(req,{GMWW_SERVER:{fetch:async()=>other}}),other);
});
test('fail closed when binding missing or offline',async()=>{
  const req=new Request(url+'/');
  for(const env of [{},{GMWW_SERVER:{fetch:async()=>{throw Error('secret')}}}]){
    const res=await proxy.fetch(req,env);
    assert.ok([502,503].includes(res.status));assert.equal(res.headers.has('location'),false);assert.doesNotMatch(await res.text(),/secret|workers.dev/);
  }
});
test('Pages CI and deployments isolated from Production Worker/IPA',()=>{
  const w=read('.github/workflows/deploy-gamemasoi-pages.yml'),ota=read('.github/workflows/github-runtime-ota.yml'),prod=read('.github/workflows/deploy-production.yml');
  assert.match(w,/wrangler pages deploy infra\/pages\/gamemasoi/);
  assert.match(w,/GMWW_SERVER/);assert.match(w,/api\/health/);assert.match(w,/ 426/);
  assert.match(w,/Check Player Web Worker/);assert.doesNotMatch(w,/wrangler (deploy|publish|versions deploy)|publish_ipa=true/);
  assert.match(prod,/infra\/pages\/gamemasoi\/\*/);assert.match(ota,/_worker\[\.\]js/);assert.match(ota,/SKIP_AUTO_RELEASE=true/);
});
test('Pages proxy exact-scope CI; any game change requires full CI',async()=>{
  const {classifyBrowserScope}=await import('../.github/scripts/ci-browser-scope.mjs');
  const changes=[
    ['infra/pages/gamemasoi/_redirects','M'],['infra/pages/gamemasoi/_worker.js','A'],
    ['tests/gamemasoi-pages-link.test.mjs','M'],['.github/workflows/deploy-gamemasoi-pages.yml','M'],
    ['.github/workflows/github-runtime-ota.yml','M'],['.github/scripts/ci-browser-scope.mjs','M'],
    ['docs/releases/GMWW-GAMEMASOI-PAGES-LINK-20261031.md','M']
  ].map(([path,status])=>({path,status}));
  assert.equal(classifyBrowserScope(changes),'pages-alias');
  assert.equal(classifyBrowserScope([...changes,{path:'src/index.js',status:'M'}]),'full');
  // Removing the new file leaves the previously approved Pages-only retry scope.
  assert.equal(classifyBrowserScope(changes.filter(x=>x.path!=='infra/pages/gamemasoi/_worker.js')),'pages-alias');
});
