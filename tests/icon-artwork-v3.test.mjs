import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
const source=fs.readFileSync('server-game/current/action-icon-library.js','utf8');
function api(saved){const ctx={window:{},document:{readyState:'loading',addEventListener(){}},localStorage:{getItem:k=>k==='GMWW_ACTION_ICON_LIBRARY_V5'&&saved?JSON.stringify(saved):null}};vm.createContext(ctx);new vm.Script(source).runInContext(ctx);return ctx.window.GMWWActionIconLibrary;}
test('All 49 default pictures resolve to illustrated v3 assets',()=>{const a=api();assert.equal(a.get().length,49);for(const x of a.get())assert.match(a.image(x),/^action-icons\/v3\/\d{2}_[a-z_]+\.webp$/);});
test('V5 names, mappings and custom uploaded images survive',()=>{const saved=JSON.parse(JSON.stringify(api().get()));saved[0].name='Tên riêng';saved[0].actions=['my-action'];saved[0].image='data:image/png;base64,aGVsbG8=';const a=api(saved),x=a.resolve('my-action');assert.equal(x.name,'Tên riêng');assert.equal(a.image(x),saved[0].image);assert.match(a.image(a.get()[1]),/^action-icons\/v3\//);});
test('50 distinct transparent packaged images match both delivery copies and hashes',()=>{const m=JSON.parse(fs.readFileSync('assets/action-icons/v3/manifest.json'));assert.equal(m.icons.length,50);assert.equal(new Set(m.icons.map(x=>x.sha256)).size,50);assert.equal(new Set(m.icons.map(x=>x.sourceSha256)).size,50);for(const x of m.icons){const b=fs.readFileSync('assets/action-icons/v3/'+x.file);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),x.sha256);assert.deepEqual(b,fs.readFileSync('server-game/current/action-icons/v3/'+x.file));assert.equal(x.size,512);assert.equal(x.transparent,true);assert.ok(b.length<250000);if(x.number<=19)assert.equal(x.approval,'user-approved-2026-10-26');}});
