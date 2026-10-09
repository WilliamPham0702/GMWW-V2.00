import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');

test('OTA confirmation dialogs render actual newlines, not backslash characters',()=>{
  const names=['installRuntimeUpdate','downloadUpdateIPA','syncPlayerWebUpdate'];
  for(const name of names){
    const match=app.match(new RegExp('if\\(confirm\\(([^;\\n]*?)\\)\\)'+name+'\\(\\)'));
    assert.ok(match, name+' popup not found');
    const message=vm.runInNewContext(match[1],{latest:'3.58',gmwwReleaseNotesText:()=> 'Đổi mới giao diện',manifest:{}});
    assert.match(message,/\n\n/,'native dialog needs paragraph spacing');
    assert.ok(!message.includes(String.raw`\n`), 'must not display literal slash-n');
  }
});

test('Room reset dialog has legible newlines too',()=>{
  const match=app.match(/if\(!confirm\(('Trở về SẢNH CHỜ\?[^;\n]*?')\)\)return false/);
  assert.ok(match,'Room reset confirmation not found');
  const message=vm.runInNewContext(match[1]);
  assert.match(message,/\n/);
  assert.ok(!message.includes(String.raw`\n`));
});

test('V3.62 is a distinct downloadable Runtime on IPA shell V3.17',()=>{
  const server=fs.readFileSync('src/index.js','utf8');
  const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
  assert.equal(pkg.version,'3.62.0');
  assert.match(html,/<title>GMWW V3\.62<\/title>/);
  assert.match(app,/const VERSION='3\.62'/);
  assert.match(server,/VERSION="V3\.62",NATIVE_SHELL_VERSION="3\.17",UPDATE_CHANNEL_REV="runtime-362"/);
});
