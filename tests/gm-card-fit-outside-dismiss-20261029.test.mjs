import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const library=fs.readFileSync('server-game/src/10-library-and-settings.part','utf8');
const ui=fs.readFileSync('server-game/src/50-roles-and-artifacts.part','utf8');
const bundle=fs.readFileSync('server-game/current/app.js','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');

test('Long Artifact and role names wrap inside the card, with enough badge clearance',()=>{
  assert.match(css,/\.player-title\{[^}]*white-space:normal/);
  assert.match(css,/\.player-title\{[^}]*overflow-wrap:anywhere/);
  assert.match(css,/\.card-zone-head\{[^}]*padding:6px 44px 6px 12px/);
  assert.match(library,/title\.scrollHeight>available\+1/);
  assert.match(library,/title\.textContent!==expected/);
  assert.ok(bundle.includes(library.slice(library.indexOf('function fitPlayerCardTitle()'),library.indexOf('function fitPlayerCardInformation()'))));
});

test('Artifact gutter detector ignores bright specks rather than shifting valid artwork',()=>{
  const head=library.slice(library.indexOf('function artifactArtworkSideMargins('),library.indexOf('function alignArtifactPreviewArtwork('));
  const detect=vm.runInNewContext(head+'\nartifactArtworkSideMargins');
  const w=240,h=200,left=17,pixels=new Uint8ClampedArray(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const p=(y*w+x)*4,art=x>=left,noise=!art&&y%7===0;
    pixels[p]=art||noise?185:4;pixels[p+1]=art||noise?85:6;
    pixels[p+2]=art||noise?145:9;pixels[p+3]=255;
  }
  const result=detect(pixels,w,h);
  assert.ok(result&&result.left>.06&&result.left<.09);
  assert.equal(result.right,0);
  assert.ok(bundle.includes(head));
});

test('Every Server sheet has a safe outside close path; no action is automatically submitted',()=>{
  const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
  const ids=[...html.matchAll(/<div class="sheet(?: [^"]*)?" id="([^"]+)"/g)].map(m=>m[1]);
  assert.ok(ids.length>=9);
  const handler=ui.slice(ui.indexOf('function gmwwDismissOutsidePointer('),ui.indexOf('function gmwwBindOutsideDismiss('));
  for(const id of ids)assert.match(handler,new RegExp('\\b'+id+':'));
  assert.match(handler,/sheet\.querySelector\('\.sheet-card'\)\?\.contains\(target\)/);
  assert.match(handler,/event\.stopImmediatePropagation\?\.\(\)/);
  assert.doesNotMatch(handler,/savePlayGame\(|confirmPlayEndGame\(|deleteEntity\(/);
  assert.ok(bundle.includes(handler));
});

test('Outside handler preserves editable back-face, non-primary mouse, and game navigation',()=>{
  const handler=ui.slice(ui.indexOf('function gmwwDismissOutsidePointer('),ui.indexOf('function gmwwBindOutsideDismiss('));
  assert.match(handler,/event\.pointerType==='mouse'&&event\.button!==0/);
  assert.match(handler,/entityFront'\)\?\.classList\.contains\('active'\)/);
  assert.match(handler,/!target\.closest\('#playerCard,\.editor-bar,#bottomNav'\)/);
  assert.match(ui,/function initPlayScene\(\)\{\s*gmwwBindOutsideDismiss\(\)/);
  assert.match(handler,/gmwwGMChatPanel/);
  assert.match(handler,/gmwwCloudflarePanel/);
  assert.match(handler,/assignmentPanelDismissed=true/);
});
