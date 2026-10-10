import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const gmCss=fs.readFileSync('server-game/current/style.css','utf8');
const villageCss=fs.readFileSync('assets/village/village.css','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const server=fs.readFileSync('src/index.js','utf8');
const manifest=JSON.parse(fs.readFileSync('assets/updates/latest.json','utf8'));

test('V3.17 GM empty seats use the supplied fantasy leaf artwork and no plus marker',()=>{
  assert.match(gmCss,/V3\.14 — user fantasy leaf artwork replaces the empty-seat plus marker/);
  assert.match(gmCss,/seat-leaf\.webp\?v=318/);
  assert.match(gmCss,/\.play-position-plus\{display:none!important/);
  assert.match(app,/play-seat-leaf-art[^\n]+seat-leaf\.webp\?v=320/);
  assert.doesNotMatch(app,/<span class="play-position-plus">＋<\/span>/);
});

test('V3.17 Player Web uses the supplied fantasy leaf artwork and removes generated plus/check arrows',()=>{
  assert.match(villageCss,/V3\.14 — user fantasy leaf artwork replaces the empty-seat plus marker/);
  assert.match(villageCss,/seat-leaf\.webp\?v=314/);
  assert.match(villageCss,/\.seat-empty \.seat-dot::before,\.seat-empty \.seat-dot::after\{content:none!important/);
});

test('V3.17 runtime is aligned with native shell V3.17',()=>{
  assert.match(html,/<title>GMWW V3\.63<\/title>/);
  assert.match(app,/const VERSION='3\.63'/);
  assert.match(server,/VERSION="V3\.63",NATIVE_SHELL_VERSION="3\.17",UPDATE_CHANNEL_REV="runtime-363"/);
  assert.ok(['3.10','3.11','3.12','3.13','3.17'].includes(manifest.releaseVersion));
  assert.ok(['native','runtime'].includes(manifest.releaseType));
  assert.ok(['3.09','3.11','3.17'].includes(manifest.shellVersion));
  assert.ok(['3.10','3.11','3.12','3.17'].includes(manifest.runtimeVersion));
  if(manifest.releaseType==='native')assert.ok(manifest.ipa?.url);
  assert.ok(manifest.runtime.files.some(x=>x.path==='style.css'));
  assert.ok(manifest.runtime.files.some(x=>x.path==='character-renderer.js'));
});
