import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyBrowserScope} from '../.github/scripts/ci-browser-scope.mjs';

// PR702 postmerge exact CI-only scope: no change to Player Web/GM/Worker data.
const paths=[
  ['.github/scripts/ci-browser-scope.mjs','M'],
  ['.github/workflows/check-player-web.yml','M'],
  ['tests/player-toast-postmerge-20261031.test.mjs','A'],
  ['docs/releases/GMWW-PR702-POSTMERGE-CI-20261031.md','A']
];
const changes=paths.map(([path,status])=>({path,status,after:readFileSync(path,'utf8')}));

test('PR702 postmerge exact CI-only scope is focused, after reviewed merge ancestor',()=>{
  assert.equal(classifyBrowserScope(changes),'player-toast-postmerge');
});

test('Postmerge scope fails closed for Worker, game, IPA, version, or unknown changes',()=>{
  for(const path of ['src/index.js','src/gmww-members-live.js','server-game/current/app.js','package.json','server-game/GMWW-Server/GameView.swift']){
    assert.equal(classifyBrowserScope([...changes,{path,status:'M',after:'unreviewed'}]),'full',path);
  }
  assert.equal(classifyBrowserScope(changes.slice(1)),'full','missing CI selector');
  assert.equal(classifyBrowserScope([...changes,changes[0]]),'full','duplicate file');
  assert.equal(classifyBrowserScope(changes.map(c=>c.path.endsWith('check-player-web.yml')?{...c,after:'unreviewed'}:c)),'full','removed workflow gate');
});

test('Merged PR702 toast is present in source and served Player bundle without bottom dock overlap',()=>{
  const source=readFileSync('src/player-web-src/20-village-and-profile.part','utf8');
  const bundle=readFileSync('src/gmww-members-live.js','utf8');
  assert.match(source,/function gmwwToastTop\(\)/);
  assert.match(source,/t\.style\.top=gmwwToastTop\(\)/);
  assert.match(bundle,/gmwwToastTop/);
  assert.doesNotMatch(source.slice(source.indexOf('let toastTimer;'),source.indexOf('window.toast=toast;')),/bottom:24px/);
});
