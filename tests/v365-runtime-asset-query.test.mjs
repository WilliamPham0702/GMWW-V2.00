import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const worker=fs.readFileSync('src/index.js','utf8');

test('Immutable OTA routes strip only query cache busters before Cloudflare asset lookup',()=>{
 const source=worker.slice(worker.indexOf('if((url.pathname.startsWith("/updates/runtime/")'),worker.indexOf('const admissionPolicy=',worker.indexOf('if((url.pathname.startsWith("/updates/runtime/")')));
 assert.match(source,/const canonicalUrl=new URL\(request\.url\);canonicalUrl\.search=""/);
 assert.match(source,/const canonicalRequest=new Request\(canonicalUrl\.toString\(\),request\)/);
 assert.match(source,/return env\.ASSETS\.fetch\(canonicalRequest\)/);
 assert.match(source,/request\.method==="GET"\|\|request\.method==="HEAD"/);
 const url=new URL('https://example.workers.dev/updates/runtime/V3.65/gm/gm-white-wolf.webp?verify=123');
 assert.equal(url.pathname,'/updates/runtime/V3.65/gm/gm-white-wolf.webp');
 url.search='';
 assert.equal(url.toString(),'https://example.workers.dev/updates/runtime/V3.65/gm/gm-white-wolf.webp');
});
test('Asset normalization is scoped to OTA not game routes and remains strictly read-only',()=>{
 assert.match(worker,/url\.pathname==="\/updates\/latest\.json"/);
 assert.match(worker,/if\(!env\.ASSETS\)return new Response\("Runtime assets unavailable",\{status:503\}\)/);
 assert.match(worker,/const canonicalUrl=new URL\(request\.url\)/);
});
