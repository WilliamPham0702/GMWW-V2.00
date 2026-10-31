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

test('Only the exact isolated Pages/CI change set can select pages-alias',async()=>{
  const {classifyBrowserScope}=await import('../.github/scripts/ci-browser-scope.mjs');
  const paths=[
    'infra/pages/gamemasoi/_redirects',
    'infra/pages/gamemasoi/index.html',
    'docs/releases/GMWW-GAMEMASOI-PAGES-LINK-20261031.md',
    'tests/gamemasoi-pages-link.test.mjs',
    '.github/workflows/deploy-gamemasoi-pages.yml',
    '.github/workflows/deploy-production.yml',
    '.github/workflows/github-runtime-ota.yml',
    '.github/workflows/check-player-web.yml',
    '.github/scripts/ci-browser-scope.mjs'
  ];
  const changes=paths.map(path=>({path,status:path.startsWith('infra/')||path.startsWith('docs/')||path.startsWith('tests/')||path.endsWith('deploy-gamemasoi-pages.yml')?'A':'M'}));
  assert.equal(classifyBrowserScope(changes),'pages-alias');
  assert.equal(classifyBrowserScope([...changes,{path:'src/index.js',status:'M'}]),'full');
  assert.equal(classifyBrowserScope(changes.filter(c=>c.path!=='infra/pages/gamemasoi/_redirects')),'full');
});

test('Pages retry restores full Git ancestry and includes both CI-only selector paths',()=>{
  const pages=read('.github/workflows/deploy-gamemasoi-pages.yml');
  const runtime=read('.github/workflows/github-runtime-ota.yml');
  assert.match(pages,/fetch-depth: 0/);
  assert.match(pages,/git fetch --no-tags origin main/);
  assert.doesNotMatch(pages,/git fetch origin main --depth=1/);
  assert.match(pages,/ci-browser-scope[.]mjs/);
  assert.match(pages,/check-player-web[.]yml/);
  assert.match(runtime,/ci-browser-scope[.]mjs/);
  assert.match(runtime,/check-player-web/);
});
test('Retry scope rejects any game or backend source change',async()=>{
  const {classifyBrowserScope}=await import('../.github/scripts/ci-browser-scope.mjs');
  const retry=[
    'infra/pages/gamemasoi/_redirects',
    '.github/workflows/deploy-gamemasoi-pages.yml',
    '.github/workflows/github-runtime-ota.yml',
    '.github/scripts/ci-browser-scope.mjs',
    'tests/gamemasoi-pages-link.test.mjs',
    'docs/releases/GMWW-GAMEMASOI-PAGES-LINK-20261031.md'
  ].map(path=>({path,status:'M'}));
  assert.equal(classifyBrowserScope(retry),'pages-alias');
  assert.equal(classifyBrowserScope([...retry,{path:'src/index.js',status:'M'}]),'full');
  assert.equal(classifyBrowserScope(retry.filter(x=>x.path!=='infra/pages/gamemasoi/_redirects')),'full');
});
