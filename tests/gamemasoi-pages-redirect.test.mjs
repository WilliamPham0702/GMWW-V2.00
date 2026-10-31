import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const base='sites/gamemasoi-pages/';
const target='https://gmww-v2-00.williampham0702.workers.dev/';
const redirects=readFileSync(base+'_redirects','utf8');
const html=readFileSync(base+'index.html','utf8');
const workflow=readFileSync('.github/workflows/check-gamemasoi-pages.yml','utf8');
test('all paths redirect temporarily to SAME Cloudflare Worker, no extra proxy',()=>{
  assert.match(redirects, /^\/\* https:\/\/gmww-v2-00\.williampham0702\.workers\.dev\/:splat 302$/m);
  const lines=redirects.split(/\r?\n/).filter(line=>line.trim()&&!line.startsWith('#'));
  assert.equal(lines.length,1);
  assert.doesNotMatch(redirects,/\s(200|301|308)\s*$/m);
});
test('HTML fallback cannot leak room data or introduce a new backend',()=>{
 assert.ok(html.includes(target));
 assert.match(html,/<meta name="robots" content="noindex,nofollow">/);
 assert.match(html,/<meta http-equiv="refresh" content="0;url=https:\/\/gmww-v2-00\.williampham0702\.workers\.dev\/">/);
 assert.doesNotMatch(html,/<script\b|WebSocket|fetch\(|localStorage|oracle/i);
});
test('deployment is isolated to Pages project and only main',()=>{
 assert.match(workflow,/--project-name gamemasoi/);
 assert.match(workflow,/github\.event_name == 'push'/);
 assert.match(workflow,/branches: \[main\]/);
 assert.doesNotMatch(workflow,/wrangler deploy\b|gmww-v2-00 --|git push.*main|gh release create|publish_ipa/);
});
