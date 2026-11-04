import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {roomModeSwitchBlocked} from '../src/gmww-room-config-rules.js';
const read=p=>readFileSync(p,'utf8');
const setup=read('server-game/src/30-village-and-setup.part');
const between=(a,b)=>{const s=setup.indexOf(a),e=setup.indexOf(b,s+a.length);assert.ok(s>=0&&e>s,a);return setup.slice(s,e)};

// Lỗi gốc: đã gọi người vào + Chốt vị trí (hoặc vào lại sau ván) thì không đổi được Online/Offline/Demo.
test('Server: lobby đã có người/đã Chốt hoặc ván đã kết thúc được đổi DEMO',()=>{
 assert.equal(roomModeSwitchBlocked({phase:'lobby',seatsLocked:true,locked:true},[]),false);
 assert.equal(roomModeSwitchBlocked({phase:'lobby',startedAt:'t',roleDeliveredAt:'t',endedAt:'t2'},[{loginId:'a'}]),false);
 assert.equal(roomModeSwitchBlocked({phase:'lobby',startedAt:null,roleDeliveredAt:null,endedAt:null},[]),false);
});
test('Server: ván đang chạy hoặc đã Phân Vai vẫn bị khóa DEMO',()=>{
 assert.equal(roomModeSwitchBlocked({phase:'running',startedAt:'t'},[]),true);
 assert.equal(roomModeSwitchBlocked({phase:'role_delivery',roleDeliveredAt:'t'},[]),true);
 assert.equal(roomModeSwitchBlocked({phase:'lobby',roleDeliveredAt:'t'},[]),true);
 assert.equal(roomModeSwitchBlocked({phase:'lobby'},[{loginId:'a'}]),true);
 const worker=read('src/index.js');
 assert.match(worker,/if\(roomModeSwitchBlocked\(meta,assignments\)\)/);
 assert.match(worker,/\["demoLease","demoClock","demoPlan"\]\)await this\.ctx\.storage\.delete/);
});
test('GM: nút Chế độ không bị khóa bởi Chốt vị trí, chỉ khóa khi ván đang chạy',()=>{
 const btn={dataset:{},disabled:null,querySelector:()=>({}),setAttribute(){}};
 const run=room=>{vm.runInNewContext(between('function renderPlayRoomModeControl(){','function renderPlayCreateRoomSheet(){')+';renderPlayRoomModeControl()',{
  document:{getElementById:()=>btn},isLivePlayRoom:()=>true,
  playSceneRuntime:{room,busy:false},playSceneState:{roomCode:'ABCDEF',roomMode:'online'},
  playRoomUiState:{selectedCode:'ABCDEF',modeTouched:true,pendingMode:''}});return btn.disabled};
 assert.equal(run({phase:'lobby',seatsLocked:true}),false);
 assert.equal(run({phase:'running',seatsLocked:true}),true);
 assert.doesNotMatch(between('function bindPlayRoomModeButtons(){','function bindPlaySeatMoveButtons(){'),/seatsLocked/);
});
test('V3.300 Runtime đóng gói đúng nguồn, có rollback',()=>{
 const parts=['00-core-and-library.part','10-library-and-settings.part','20-members-and-roster.part','30-village-and-setup.part','40-battle-and-timeline.part','45-online-chat.part','50-roles-and-artifacts.part'];
 assert.equal(parts.map(p=>read('server-game/src/'+p)).join(''),read('server-game/current/app.js'));
 assert.equal(JSON.parse(read('package.json')).version,'3.300.0');
 assert.match(read('src/index.js'),/VERSION="V3\.300"/);
 assert.match(read('server-game/current/GMWW.html'),/<title>GMWW V3\.300<\/title>/);
 assert.match(read('docs/releases/GMWW-RUNTIME-V3.300-ROOM-MODE-20261104.md'),/Rollback[\s\S]*V3\.299/);
});
