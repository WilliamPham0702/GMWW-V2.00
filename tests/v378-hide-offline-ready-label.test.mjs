import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const gm=fs.readFileSync('server-game/current/app.js','utf8');
const village=fs.readFileSync('assets/village/village.mjs','utf8');
const live=JSON.parse(fs.readFileSync('src/gmww-members-live.js','utf8').split(' = ').slice(1).join(' = ').trim().replace(/;$/,''));
const start=village.indexOf('export function safeText('),end=village.indexOf('export function reconcileVillageChildren(',start);
assert.ok(start>=0&&end>start);

test('Player village removes the OFFLINE READY chip without changing presence or important statuses',()=>{
  const api=vm.runInNewContext(village.slice(start,end).replaceAll('export function ','function ')+';({visibleVillagePlayerStatus})');
  const label=api.visibleVillagePlayerStatus;
  for(const statusLabel of ['', 'OFFLINE', 'OFFLINE • READY', 'OFFLINE · READY', 'OFFLINE • CHƯA READY','READY']){
    assert.equal(label({online:false,ready:true,statusLabel}), '',statusLabel);
  }
  assert.equal(label({online:true,ready:true,statusLabel:'READY'}),'READY');
  assert.equal(label({online:false,statusLabel:'ĐÃ CHẾT'}),'ĐÃ CHẾT');
  assert.equal(label({online:false,statusLabel:'ĐÓNG BĂNG'}),'ĐÓNG BĂNG');
  assert.equal(label({online:false,statusLabel:''},{moving:true}),'ĐANG DI CHUYỂN');
  assert.equal(label({online:true,statusLabel:''},{gm:true}),'GM ONLINE');
  assert.match(village,/status\.hidden=!status\.textContent/);
  assert.match(village,/status\.hidden=!label/);
});

test('GM removes offline-ready chip but retains name, roles, presence and online status',()=>{
  const start=gm.indexOf('function renderPlayPlayers(){');
  const end=gm.indexOf('function ',start+25);
  assert.ok(start>0&&end>start);
  const render=gm.slice(start,end);
  assert.match(render,/m\.online\?\('ONLINE • '/);
  assert.match(render,/statusLabel\?'<small>'\+playEsc\(statusLabel\)/);
  assert.match(render,/el\.setAttribute\('aria-label',name\+\(statusLabel\?/);
  assert.doesNotMatch(render,/\(m\.online\?'ONLINE':'OFFLINE'\)/);
  assert.match(render,/const assignment=m\?gmAssignments\.find/);
});

test('Player preserves actual online flags and hides offline status for both initial and realtime frames',()=>{
  assert.match(live,/p\?\.online===false\?'':p\?\.ready\?'READY':'ONLINE'/);
  assert.match(live,/online:p\?\.online!==false/);
  assert.equal((village.match(/visibleVillagePlayerStatus\(data,\{moving:/g)||[]).length,3);
});
