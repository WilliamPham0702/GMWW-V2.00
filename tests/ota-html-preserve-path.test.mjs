import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Immutable Runtime HTML is served without Cloudflare canonical redirect',()=>{
  const config=JSON.parse(fs.readFileSync('wrangler.jsonc','utf8'));
  assert.equal(config.assets.html_handling,'none',
    'Cloudflare must serve /updates/runtime/V3.82/GMWW.html with .html extension intact');
  assert.ok(config.assets.run_worker_first.includes('/updates/runtime/*'));
  const src=fs.readFileSync('src/index.js','utf8');
  assert.match(src,/url\.pathname\.startsWith\("\/updates\/runtime\/"\)/);
  assert.match(src,/return env\.ASSETS\.fetch\(request\)/);
});
test('Player Web root stays dynamically generated with existing room code routing',()=>{
  const src=fs.readFileSync('src/index.js','utf8');
  assert.match(src,/if\(url\.pathname==="\/"&&request\.method==="GET"\)return playerPage\("?"?\)/);
  assert.match(src,/function playerPage\(code\)\{return new Response\(gmwwMembersPage\(code\)/);
  assert.doesNotMatch(src,/url\.pathname==="\/"[\s\S]{0,160}ASSETS\.fetch/);
});
