import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const worker=fs.readFileSync('src/index.js','utf8');
const config=fs.readFileSync('wrangler.jsonc','utf8');
const page=fs.readFileSync('src/gmww-members-live.js','utf8');
const live=JSON.parse(page.slice(page.indexOf(' = ')+3).trim().replace(/;$/,''));
const start=worker.indexOf('  // The Player\'s village runs inside an iframe at /village/?embed=1.');
const end=worker.indexOf('  // Serve OTA files through the same ASSETS binding',start);
assert.ok(start>0&&end>start,'village Worker route must precede the Player 404');
const route=vm.runInNewContext('(async(request,env)=>{const url=new URL(request.url);'+worker.slice(start,end)+'return null;})',
  {URL,Request,Response,Headers});

test('Village iframe /village/?embed=1 is HTML 200, never the Player 404',async()=>{
  const calls=[];
  const env={ASSETS:{fetch:async request=>{
    calls.push(new URL(request.url));
    return new Response('<!doctype html><html lang="vi"><title>Ngôi làng</title></html>',
      {status:200,headers:{'content-type':'text/html'}});
  }}};
  const result=await route(new Request('https://gmww.test/village/?embed=1&v=303'),env);
  assert.equal(result.status,200);
  assert.match(result.headers.get('content-type'),/text\/html/);
  assert.equal(result.headers.get('cache-control'),'no-store');
  assert.ok((await result.text()).includes('Ngôi làng'));
  assert.equal(calls[0].pathname,'/village/index.html');
  assert.equal(calls[0].searchParams.get('embed'),'1');
  assert.equal(calls[0].searchParams.get('v'),'303');
});
test('Village entry works without trailing slash, and other village assets keep their path',async()=>{
  const paths=[];
  const env={ASSETS:{fetch:async req=>{paths.push(new URL(req.url).pathname);
    return new Response('ok',{status:200,headers:{'content-type':'text/css'}})}}};
  const entry=await route(new Request('https://gmww.test/village'),env);
  const css=await route(new Request('https://gmww.test/village/village.css?v=303'),env);
  assert.equal(entry.status,200);assert.equal(css.status,200);
  assert.deepEqual(paths,['/village/index.html','/village/village.css']);
  assert.equal(await css.text(),'ok');
});
test('Missing village is a controlled error instead of a black 404 iframe',async()=>{
  const noAssets=await route(new Request('https://gmww.test/village/?embed=1'),{});
  assert.equal(noAssets.status,503);
  const missing=await route(new Request('https://gmww.test/village/?embed=1'),
    {ASSETS:{fetch:async()=>new Response('Missing',{status:404})}});
  assert.equal(missing.status,503);
  assert.doesNotMatch(await missing.text(),/Không tìm thấy trang/);
});
test('Cloudflare routes village requests to Worker and the Player uses the same iframe URL',()=>{
  assert.match(config,/"html_handling": "none"/);
  assert.match(config,/"\/village"/);
  assert.match(config,/"\/village\/\*"/);
  assert.match(live,/iframe\.src='\/village\/\?embed=1&v=303'/);
  assert.ok(fs.existsSync('assets/village/index.html'));
  assert.ok(fs.existsSync('assets/village/village.css'));
  assert.ok(fs.existsSync('assets/village/village.mjs'));
});
