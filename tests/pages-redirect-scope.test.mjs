import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {isPagesOnlyChange, pagesOnlyPaths} from '../.github/scripts/pages-redirect-scope.mjs';

const script='.github/scripts/pages-redirect-scope.mjs';
const safe=[...pagesOnlyPaths];
test('Pages-only changes are isolated',()=> {
  for(const path of safe) assert.equal(isPagesOnlyChange([path]),true,path);
  assert.equal(isPagesOnlyChange([
    'sites/gamemasoi-pages/index.html',
    'sites/gamemasoi-pages/_redirects',
    'tests/gamemasoi-pages-redirect.test.mjs'
  ]),true);
});
test('unknown game source, deploy secret and mixed changes fail closed',()=> {
  for(const path of ['src/index.js','server-game/current/GMWW.html','package.json',
     'wrangler.jsonc','assets/village/index.html','.github/workflows/deploy-player-receipt-hotfix.yml',
     'sites/gamemasoi-pages/other-file.html','../index.html']) {
    assert.equal(isPagesOnlyChange([path]),false,path);
    assert.equal(isPagesOnlyChange(['sites/gamemasoi-pages/index.html',path]),false,path);
  }
  assert.equal(isPagesOnlyChange([]),false);
  assert.equal(isPagesOnlyChange(['sites/gamemasoi-pages/index.html','sites/gamemasoi-pages/index.html']),false);
});
test('CLI really separates safe and unsafe changes',()=> {
 const ok=spawnSync('node',[script],{input:'sites/gamemasoi-pages/index.html\n',encoding:'utf8'});
 assert.equal(ok.status,0,ok.stderr);
 const denied=spawnSync('node',[script],{input:'sites/gamemasoi-pages/index.html\nsrc/index.js\n',encoding:'utf8'});
 assert.equal(denied.status,1);
});
test('both downstream publish paths explicitly invoke fail-closed classifier',()=> {
 const w=readFileSync('.github/workflows/deploy-production.yml','utf8');
 const r=readFileSync('.github/workflows/github-runtime-ota.yml','utf8');
 assert.match(w,/BEGIN GMWW_PAGES_ALIAS_NO_PRODUCTION/);
 assert.match(w,/git diff --name-only HEAD\^1 HEAD \| node \.github\/scripts\/pages-redirect-scope\.mjs/);
 assert.match(r,/BEGIN GMWW_PAGES_ALIAS_NO_RUNTIME/);
 assert.match(r,/printf '%s\\n' "\$CHANGED" \| node \.github\/scripts\/pages-redirect-scope\.mjs/);
});
