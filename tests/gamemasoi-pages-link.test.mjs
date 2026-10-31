import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(path)=>readFileSync(path,'utf8');
const origin='https://gmww-v2-00.williampham0702.workers.dev/';
test('Pages uses exactly two HTTPS 302 redirects to the existing Worker',()=>{
  const rules=read('infra/pages/gamemasoi/_redirects').split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('#'));
  assert.deepEqual(rules,['/ '+origin+' 302','/* '+origin+':splat 302']);
});
test('Pages fallback has no game backend, script or credentials',()=>{
  const page=read('infra/pages/gamemasoi/index.html');
  assert.match(page,/<html lang="vi">/);
  assert.match(page,/<meta name="robots" content="noindex,nofollow">/);
  assert.match(page,/href="https:\/\/gmww-v2-00\.williampham0702\.workers\.dev\/"/);
  assert.doesNotMatch(page,/<script|WebSocket|fetch\s*\(/i);
});
test('Pages workflow and legacy deployment guards are isolated',()=>{
  const pages=read('.github/workflows/deploy-gamemasoi-pages.yml');
  const worker=read('.github/workflows/deploy-production.yml');
  const ota=read('.github/workflows/github-runtime-ota.yml');
  assert.match(pages,/wrangler pages deploy infra\/pages\/gamemasoi/);
  assert.match(pages,/git diff --name-only HEAD\^1 HEAD/);
  assert.match(pages,/Check Player Web Worker/);
  assert.doesNotMatch(pages,/wrangler (deploy|publish|versions deploy)|publish_ipa=true/);
  assert.match(worker,/infra\/pages\/gamemasoi\/\*/);
  assert.match(ota,/PAGES_UNRELATED/);
  assert.match(ota,/SKIP_AUTO_RELEASE=true/);
});
