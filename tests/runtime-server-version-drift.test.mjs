import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const js=fs.readFileSync('server-game/current/app.js','utf8');
const start=js.indexOf('function gmwwVersionParts(v)');
const end=js.indexOf('function gmwwNativePost(',start);

test('runtime/server/OTA comparison detects drift in either direction',()=>{
  assert.ok(start>=0&&end>start,'Version comparator and alignment policy must exist');
  const align=vm.runInNewContext(js.slice(start,end)+'\ngmwwUpdateAlignment');
  assert.equal(align('3.283','3.280','3.280'),'runtime_ahead');
  assert.equal(align('3.280','3.280','3.280'),'synchronized');
  assert.equal(align('3.279','3.280','3.280'),'update_available');
  assert.equal(align('3.280','3.280','3.281'),'channel_mismatch');
  assert.equal(align('bad','3.280','3.280'),'unverified');
  assert.equal(align('3.283','3.283','3.283'),'synchronized');
});

test('Settings must warn and not claim sync when installed Runtime is newer',()=>{
  const startCheck=js.indexOf('async function checkAppUpdate(');
  const endCheck=js.indexOf('window.GMWWUpdateNative=',startCheck);
  assert.ok(startCheck>=0&&endCheck>startCheck);
  const check=js.slice(startCheck,endCheck);
  assert.ok(check.includes("gmwwUpdateAlignment(gmwwRuntimeVersion(),server,latest)==='runtime_ahead'"));
  assert.ok(check.indexOf("==='runtime_ahead'")<check.indexOf('if(!newer)'));
  assert.match(check,/LỆCH PHIÊN BẢN/);
  assert.match(check,/setUpdateAction\('ahead'\)/);
  assert.match(js,/Runtime mới hơn Server — cần xác minh/);
});

test('auto OTA refuses equal or lower package versions',()=>{
  const install=js.slice(js.indexOf('async function installRuntimeUpdate(){'),js.indexOf('function downloadUpdateIPA(){'));
  assert.match(install,/gmwwVersionCompare\(target,gmwwRuntimeVersion\(\)\)<=0/);
  assert.match(install,/KHÔNG HẠ CẤP/);
});

test('ops HEALTHY CHECK requires Runtime, Server, release channel all aligned',()=>{
  const ops=js.slice(js.indexOf('const serverVersion=String(server?.data?.version||'),js.indexOf("checks.update=aligned?",js.indexOf('const serverVersion=String(server?.data?.version||'))+200);
  assert.match(ops,/gmwwUpdateAlignment\(runtime,serverVersion,updateVersion\)==='synchronized'/);
  assert.doesNotMatch(ops,/const aligned=manifest\?\.ok&&server\?\.ok&&serverVersion===updateVersion/);
});
