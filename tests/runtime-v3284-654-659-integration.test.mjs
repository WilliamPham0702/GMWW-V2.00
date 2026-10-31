import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>fs.readFileSync(p,'utf8');
const app=read('server-game/current/app.js');
const src=read('src/index.js');

test('V3.284 candidate version is aligned across Worker, GM, HTML, package and lock',()=>{
  const pkg=JSON.parse(read('package.json')),lock=JSON.parse(read('package-lock.json'));
  assert.equal(pkg.version,'3.284.0');
  assert.equal(lock.version,'3.284.0');
  assert.equal(lock.packages[''].version,'3.284.0');
  assert.match(src,/VERSION="V3[.]284"/);
  assert.match(app,/const VERSION='3[.]284'/);
  assert.match(read('server-game/current/GMWW.html'),/<title>GMWW V3[.]284<\/title>/);
  assert.match(read('.github/scripts/prepare-update-channel.mjs'),/V3[.]284 PR654\+PR659/);
});

test('PR654 audio and PR659 drift policy coexist in exact assembled GM bundle',()=>{
  const modules=['00-core-and-library.part','10-library-and-settings.part','20-members-and-roster.part','30-village-and-setup.part','40-battle-and-timeline.part','45-online-chat.part','50-roles-and-artifacts.part'];
  assert.equal(modules.map(x=>read('server-game/src/'+x)).join(''),app);
  assert.match(app,/data-audio-name-play/);
  assert.match(app,/data-audio-upload-name/);
  assert.match(app,/gmwwOpenRoleAudioReplace/);
  assert.match(app,/gmwwUpdateAlignment\(gmwwRuntimeVersion\(\),server,latest\)==='runtime_ahead'/);
  assert.match(app,/KHÔNG HẠ CẤP/);
});

test('V3.283 installed on V3.280 Server is never falsely synchronized',()=>{
  const from=app.indexOf('function gmwwVersionParts(v)');
  const to=app.indexOf('function gmwwNativePost(',from);
  assert.ok(from>=0&&to>from);
  const f=vm.runInNewContext(app.slice(from,to)+'\ngmwwUpdateAlignment');
  assert.equal(f('3.283','3.280','3.280'),'runtime_ahead');
  assert.equal(f('3.284','3.284','3.284'),'synchronized');
  assert.equal(f('3.283','3.284','3.284'),'update_available');
  assert.equal(f('3.284','3.280','3.284'),'channel_mismatch');
});

test('GitHub-first OTA refuses stale release and keeps same-tag assets immutable',()=>{
  const w=read('.github/workflows/github-runtime-ota.yml');
  assert.match(w,/RELEASE_MAX=/);
  assert.match(w,/sort -V/);
  assert.match(w,/Runtime V\$VERSION must be NEWER/);
  assert.match(w,/sha256sum --check/);
  assert.match(w,/cmp "\$NAME[.]sha256"/);
  assert.doesNotMatch(w,/gh release upload[^\n]*--clobber/);
});

test('PR654 QA / PR659 changes do not touch the native IPA or Durable Object schema',()=>{
  assert.match(read('docs/releases/GMWW-V3.284-PR654-PR659-INTEGRATION-20261031.md'),/Không làm IPA mới/);
  assert.match(read('server-game/current/app.js'),/const VERSION='3[.]284'/);
});
