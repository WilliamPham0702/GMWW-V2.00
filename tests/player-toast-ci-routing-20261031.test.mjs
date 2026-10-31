import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classifyBrowserScope} from '../.github/scripts/ci-browser-scope.mjs';

const source=readFileSync('src/player-web-src/20-village-and-profile.part','utf8');
const bundle=readFileSync('src/gmww-members-live.js','utf8');
const baseline=JSON.parse(bundle.slice(bundle.indexOf('=')+1).trim().replace(/;$/,''));
const begin=source.indexOf('let toastTimer;');
const end=source.indexOf('window.toast=toast;',begin)+'window.toast=toast;'.length;
assert.ok(begin>=0&&end>begin);
const old=source.slice(begin,end);
const newer=old
  .replace('let toastTimer;', "let toastTimer;\nfunction gmwwToastTop(){return document.getElementById('gmwwPlayerTopMenu').getBoundingClientRect().bottom+10}")
  .replace('bottom:24px','top:0;bottom:auto;pointer-events:none')
  .replace("t.textContent=text||'';", "t.style.top=gmwwToastTop()+'px';t.textContent=text||'';");
const packed=s=>'export const gmwwMembersLiveScript = '+JSON.stringify(s)+';\n';
const approved=[
  {status:'M',path:'src/player-web-src/20-village-and-profile.part',before:source,after:source.slice(0,begin)+newer+source.slice(end)},
  {status:'M',path:'src/gmww-members-live.js',before:bundle,after:packed(baseline.replace(old,newer))},
  {status:'A',path:'tests/player-toast-above-chat-20261031.test.mjs',after:'Player toast appears directly below\nOnline Chat remains an unchanged bottom dock'}
];
const ciOnly=[
  {status:'M',path:'.github/scripts/ci-browser-scope.mjs',after:'function isPlayerToastNoticeScope(changes)\nfunction isPlayerToastCiRoutingScope(changes)'},
  {status:'M',path:'.github/workflows/check-player-web.yml',after:"steps.scope.outputs.mode == 'player-toast-notice'\nsteps.scope.outputs.mode == 'player-toast-ci-routing'"},
  {status:'A',path:'tests/player-toast-ci-routing-20261031.test.mjs',after:'CI routing fails closed on extra gameplay changes'},
  {status:'A',path:'docs/releases/GMWW-PLAYER-TOAST-CI-20261031.md',after:'CI scope isolation'}
];
test('PR702 exact Player Web toast source/bundle/test uses focused verification',()=>{
  assert.equal(classifyBrowserScope(approved),'player-toast-notice');
});
test('CI routing fails closed on extra gameplay changes',()=>{
  assert.equal(classifyBrowserScope([...approved,{path:'src/index.js',status:'M',before:'x',after:'y'}]),'full');
  assert.equal(classifyBrowserScope(approved.map(c=>c.path==='src/gmww-members-live.js'?{...c,after:packed(baseline+'evil')}:c)),'full');
  assert.equal(classifyBrowserScope(approved.map(c=>c.path==='src/player-web-src/20-village-and-profile.part'?{...c,after:c.after+'unreviewed'}:c)),'full');
});
test('CI-only repair never changes Player Web source or Worker',()=>{
  assert.equal(classifyBrowserScope(ciOnly),'player-toast-ci-routing');
  assert.equal(classifyBrowserScope([...ciOnly,{status:'M',path:'src/index.js',before:'x',after:'y'}]),'full');
});
