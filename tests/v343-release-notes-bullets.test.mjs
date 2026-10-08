import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const worker=fs.readFileSync('src/index.js','utf8');
const prep=fs.readFileSync('.github/scripts/prepare-update-channel.mjs','utf8');
test('release notes display a semantic list instead of a long line',()=>{
 assert.match(html,/<section class="update-release-notes" id="updateReleaseNotes"[^>]*><b class="update-release-title">Có gì mới<\/b><ul class="update-release-list">/);
 assert.match(app,/function gmwwRenderReleaseNotes\(manifest\)/);
 assert.match(app,/box\.replaceChildren\(title,list\)/);
 assert.match(app,/item\.textContent=note/);
 assert.match(app,/gmwwRenderReleaseNotes\(manifest\)/);
 assert.doesNotMatch(app,/notesElement\.textContent='Có gì mới:/);
 assert.match(css,/#settings #updateReleaseNotes \.update-release-list\{/);
 assert.match(css,/max-height:166px;overflow-y:auto/);
});
test('V3.43 OTA manifest publishes a new runtime on shell V3.17',()=>{
 assert.match(html,/<title>GMWW V3\.43<\/title>/);
 assert.match(app,/const VERSION='3\.43'/);
 assert.match(worker,/VERSION="V3\.43",NATIVE_SHELL_VERSION="3\.17",UPDATE_CHANNEL_REV="runtime-343"/);
 assert.match(prep,/Mục Có gì mới tách từng thay đổi thành gạch đầu dòng/);
});
