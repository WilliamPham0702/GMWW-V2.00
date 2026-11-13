import {gmSource as readGmGroup} from '../.github/scripts/source-groups.mjs';
import {workerSource} from '../.github/scripts/worker-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');
const gmSource=readGmGroup('00-core-and-library');
const gmBattle=readGmGroup('30-village-and-setup');
const worker=workerSource();
const village=read('assets/village/village.mjs');
const scene=read('assets/village/scene-manager.mjs');

test('Treo độc lập menu GM: vị trí đã chọn dùng chính xác và có dự phòng tương thích',()=>{
  const body=gmSource.match(/function villageGallowsPosition\(\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(body,'Mất hàm xác định tọa độ treo');
  const resolve=new Function('villageScenePublished','playSceneState','villageFirePosition',body+';return villageGallowsPosition()');
  assert.deepEqual(resolve({gallowsAnchors:{day:{x:72.2,y:31.6}}},{phase:'day'},()=>[45,58]),[72.2,31.6]);
  assert.deepEqual(resolve({gallowsAnchors:{}},{phase:'day'},()=>[45,58]),[45,43]);
  assert.deepEqual(resolve({gallowsAnchors:{day:{x:-8,y:132}}},{phase:'day'},()=>[45,58]),[0,100]);
  assert.match(gmSource,/gallowsAnchors:\{\[key\]:point\}/);
  assert.match(read('server-game/current/GMWW.html'),/id="battleGMGallowsAnchor"/);
  assert.match(readGmGroup('40-battle-and-timeline'),/villageCalibrateGallows\('day'\)/);
});

test('Worker lưu metadata tọa độ treo: phân quyền GM, kiểm tra 0–100, không reset ảnh và Seat',()=>{
  assert.match(worker,/\/api\/gm\/village-scene"&&request.method==="PUT"/);
  assert.match(worker,/gallowsAnchors:rec\?\.gallowsAnchors\|\|\{\}/);
  assert.match(worker,/INVALID_GALLOWS_ANCHOR/);
  assert.match(worker,/body\.fireAnchors\|\|body\.gallowsAnchors/);
  assert.match(worker,/gallowsAnchors:\{\.\.\.previous.gallowsAnchors,\.\.\.body.gallowsAnchors\}/);
  assert.match(worker,/if\(body\[key\]\)\{delete next.fireAnchors\[key\];delete next.gallowsAnchors\[key\];\}/);
  assert.doesNotMatch(worker.slice(worker.indexOf('async sceneSettingsPut('),worker.indexOf('async sceneSettingsReset(')),/seatOffset\s*=|seatId\s*=/);
});

test('Player Web nhận tọa độ từ bản bối cảnh chung và phát lại sau đồng bộ local',()=>{
  assert.match(scene,/gallowsAnchors:record.gallowsAnchors\|\|\{\}/);
  assert.match(scene,/globalThis.GMWW_VILLAGE_GALLOWS_ANCHORS=anchors/);
  assert.match(scene,/gmww:village-gallows-anchor/);
  assert.match(village,/gmww:village-gallows-anchor/);
  assert.match(village,/sceneAnchor=globalThis.GMWW_VILLAGE_GALLOWS_ANCHORS/);
  assert.match(village,/configured\?firePoint.y:firePoint.y-15/);
  assert.match(read('assets/village/index.html'),/scene-manager.mjs\?v=3301-fire/);
});

test('Chỉ Character treo dùng Walk sẵn có, không dựng dây/cây/nhãn trên đầu',()=>{
  const css=read('server-game/current/gallows-hanging.css');
  const villageCss=read('assets/village/village.css');
  assert.match(gmBattle,/state=hanging\?'walking'/);
  assert.match(gmBattle,/paused:effect==='dead'\|\|\(battleStatic&&!hanging&&!runTarget&&!travel\)/);
  assert.match(gmBattle,/hanging:active/);
  assert.match(village,/state=hanging\?"walking"/);
  assert.match(village,/motion=dead\?"dead":state==="sitting"\?"sit":hanging\?"walk"/);
  assert.match(village,/paused:battleStatic&&!hanging\?true:hanging\?false:base.paused/);
  assert.match(villageCss,/player:not\(\.gmww-gallows-hanging\)/);
  assert.doesNotMatch(css,/content\s*:|@keyframes|struggle/);
  assert.doesNotMatch(villageCss,/gmww-gallows-struggle|\.player\.gmww-gallows-hanging::before|\.player\.gmww-gallows-hanging::after/);
});
