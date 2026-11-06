// GĐ48 - GM chọn 2D/3D cho từng phòng; Player đi theo lựa chọn đó.
// Rủi ro của task: (1) mặc định phải là 2D (không ép ai vào 3D), (2) chỉ GM được Core xác thực mới đổi,
// (3) Player 3D không rò dữ liệu riêng khi hỏi chế độ. Test không đo gameplay.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {normalizeViewMode,parseViewModeInput,viewModePayload} from '../src/arena3d-view-mode.mjs';
import {watchViewMode} from '../assets/village/arena-3d/view-mode-watch.mjs';
import {ARENA3D_PLAYER_ENTRY_SCRIPT} from '../src/arena3d-player-entry.mjs';

const read=p=>fs.readFileSync(p,'utf8');

test('mặc định 2D; chỉ nhận đúng 2d/3d khi GM đặt',()=>{
  for(const v of [undefined,null,'',' ','x','3D!','2d'])assert.equal(normalizeViewMode(v),'2d');
  assert.equal(normalizeViewMode('3d'),'3d');assert.equal(normalizeViewMode(' 3D '),'3d');
  assert.equal(parseViewModeInput('3D'),'3d');assert.equal(parseViewModeInput('2d'),'2d');
  for(const bad of ['','4d',null,undefined,{},'3d;drop'])assert.equal(parseViewModeInput(bad),null);
  assert.deepEqual(viewModePayload(null,5),{ok:true,mode:'2d',updatedAt:0,serverTime:5});
  assert.equal(viewModePayload({mode:'3d',updatedAt:9}).mode,'3d');
});

test('Worker STAGING: POST chế độ phải qua gmAuthorized của Core, GET chỉ trả chế độ',()=>{
  const w=read('src/arena3d-stage-worker.mjs');
  const doPart=w.slice(w.indexOf("if(path==='/arena/view-mode')"),w.indexOf("if(path!=='/arena/public-gallows')"));
  assert.match(doPart,/const auth=await this\.gmAuthorized\(request\)/);
  assert.ok(doPart.indexOf('gmAuthorized')<doPart.indexOf('storage.put'),'xác thực GM trước khi ghi');
  assert.match(doPart,/INVALID_VIEW_MODE/);
  assert.match(doPart,/request\.method==='GET'\)\s*return Response\.json\(viewModePayload/);
  assert.match(w,/\/api\\\/arena-staging\\\/rooms\\\/\(\[A-Za-z0-9\]\{4,12\}\)\\\/view-mode/);
});

test('watchViewMode: chỉ báo khi đổi chế độ, nuốt lỗi mạng, dừng được',async()=>{
  const calls=[],seen=[],fakeTimers={setInterval:fn=>{fakeTimers.fn=fn;return 7},clearInterval:id=>{fakeTimers.cleared=id}};
  const modes=['2d','2d','3d'];let i=0;
  const fetchImpl=async url=>{calls.push(url);if(i>=modes.length)throw Error('net');
    return {ok:true,json:async()=>({mode:modes[i++]})}};
  const w=watchViewMode({code:'AB12',onMode:m=>seen.push(m),fetchImpl,timers:fakeTimers});
  await new Promise(r=>setTimeout(r,5));
  await fakeTimers.fn();await fakeTimers.fn();await fakeTimers.fn();
  assert.deepEqual(seen,['2d','3d']);
  assert.equal(calls[0],'/api/arena-staging/rooms/AB12/view-mode');
  w.stop();assert.equal(fakeTimers.cleared,7);
});

function runEntry(mode){
  const nav=[],store={},fetchCalls=[];let tick;
  const btn={style:{},setAttribute(){},addEventListener(){},hidden:true};
  const ctx={window:null,top:null,state:{roomCode:'ab12',participantId:'p1'},
    document:{createElement:()=>btn,body:{appendChild(){}}},
    sessionStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v},removeItem:k=>{delete store[k]}},
    location:{set href(v){nav.push(v)}},
    fetch:async u=>{fetchCalls.push(u);return {ok:true,json:async()=>({mode})}},
    setInterval:fn=>{tick=fn;return 1},encodeURIComponent,Date,Promise};
  ctx.window=ctx;ctx.top=ctx;
  vm.runInNewContext(ARENA3D_PLAYER_ENTRY_SCRIPT.replace(/^<script[^>]*>|<\/script>$/g,''),ctx);
  return {tick:async()=>{tick();await new Promise(r=>setTimeout(r,5));tick()},nav,btn,store,fetchCalls,ctx};
}
test('Player Web: phòng 2D không bị đưa sang 3D, không hiện nút 3D',async()=>{
  const r=runEntry('2d');await r.tick();
  assert.deepEqual(r.nav,[]);assert.equal(r.btn.hidden,true);
  assert.match(r.fetchCalls[0],/\/api\/arena-staging\/rooms\/AB12\/view-mode$/);
});
test('Player Web: GM chọn 3D thì Player vào làng 3D đúng một lần, nút hiện ra',async()=>{
  const r=runEntry('3d');await r.tick();await r.tick();
  assert.deepEqual(r.nav,['/village/arena-3d/player.html?room=AB12']);
  assert.equal(r.btn.hidden,false);
});

test('Player 3D: chỉ thêm đường về Player Web, vẫn không dùng storage/postMessage/quyền GM',()=>{
  const p=read('assets/village/arena-3d/player.mjs'),m=read('assets/village/arena-3d/view-mode-watch.mjs');
  assert.match(p,/watchViewMode\(\{code/);
  assert.match(read('assets/village/arena-3d/player.html'),/id="mode-2d"/);
  for(const bad of [/localStorage|sessionStorage/,/postMessage\(/,/Authorization/,/\/api\/gm\//])
    assert.doesNotMatch(m,bad);
});

test('GM live: ô chọn 2D/3D chỉ bật khi có quyền GM STAGING và gửi bằng quyền GM',()=>{
  const l=read('assets/village/arena-3d/live.mjs');
  assert.match(l,/\$\('view-mode'\)\.disabled=!gmToken\|\|productionCoreView/);
  assert.match(l,/view-mode',\{method:'POST',body:\{mode\},gm:true\}/);
  assert.match(read('assets/village/arena-3d/live.html'),/id="view-mode"[^>]*disabled/);
});
