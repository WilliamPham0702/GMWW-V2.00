import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const gmCss=fs.readFileSync('server-game/current/style.css','utf8');
const villageCss=fs.readFileSync('assets/village/village.css','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const server=fs.readFileSync('src/index.js','utf8');
const manifest=JSON.parse(fs.readFileSync('assets/updates/latest.json','utf8'));

test('V3.10 GM empty seats use tropical leaf mats with a central plus',()=>{
  assert.match(gmCss,/V3\.10 — tropical leaf seat markers/);
  assert.match(gmCss,/\.play-player-token\.is-empty \.play-player-avatar::before/);
  assert.match(gmCss,/border-radius:92% 16% 92% 16%/);
  assert.match(gmCss,/linear-gradient\(145deg,#7ce7a7/);
  assert.match(gmCss,/\.play-position-plus\{[\s\S]*radial-gradient\(circle at 36% 30%,#fffbe0/);
});

test('V3.10 Player Web seats use the same tropical leaf visual language',()=>{
  assert.match(villageCss,/V3\.10 — tropical leaf seat markers shared by Player Web/);
  assert.match(villageCss,/\.seat-empty \.seat-dot::after/);
  assert.match(villageCss,/border-radius:92% 16% 92% 16%/);
  assert.match(villageCss,/\.seat-empty \.seat-dot::before\{[\s\S]*content:"\+"/);
  assert.match(villageCss,/\.seat-empty\.selected \.seat-dot::before\{content:"✓"/);
  assert.match(villageCss,/\.seat-empty\.reserved \.seat-dot::before\{content:"➜"/);
});

test('V3.10 is a runtime update on the V3.09 native shell',()=>{
  assert.match(html,/<title>GMWW V3\.10<\/title>/);
  assert.match(app,/const VERSION='3\.10'/);
  assert.match(server,/VERSION="V3\.10",NATIVE_SHELL_VERSION="3\.09",UPDATE_CHANNEL_REV="runtime-310"/);
  assert.equal(manifest.releaseVersion,'3.10');
  assert.equal(manifest.releaseType,'runtime');
  assert.equal(manifest.shellVersion,'3.09');
  assert.equal(manifest.runtimeVersion,'3.10');
  assert.equal(manifest.ipa,null);
  assert.ok(manifest.runtime.files.some(x=>x.path==='style.css'));
  assert.ok(manifest.runtime.files.some(x=>x.path==='character-renderer.js'));
});
