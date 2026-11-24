// V3.329: một bản chung cho mọi máy GM — danh sách phòng GM lấy thêm từ server (PC + iPhone mở cùng phòng).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src=fs.readFileSync('server-game/src/30-village-and-setup/40-room-registry-and-player-rooms.part','utf8');
const pick=name=>{const i=src.indexOf('function '+name+'(');assert.ok(i>=0,name);let d=0,j=src.indexOf('){',i)+1;for(;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'&&--d===0)break}return src.slice(i,j+1)};

function ctx(initial=[]){
  const store={GMWW_ROOMS:JSON.stringify(initial)};
  const c={PLAY_ROOM_REGISTRY_KEY:'GMWW_ROOMS',localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v}},
    playReadableRoomName:n=>String(n||'Làng'),playRoomModeOf:r=>r?.demo===true?'demo':r?.roomMode==='offline'?'offline':'online',
    document:{getElementById:()=>null},playSceneState:{seatCount:12},store};
  vm.runInNewContext([pick('playRoomRegistry'),pick('savePlayRoomRegistry'),pick('rememberPlayRoom'),pick('mergeServerRoomsIntoRegistry')].join('\n')+';this.api={playRoomRegistry,rememberPlayRoom,mergeServerRoomsIntoRegistry}',c);
  return c;
}

test('PC sees the GM rooms created on iPhone (Offline included), not player rooms', () => {
  const c=ctx([{roomCode:'AAAAAA',gmToken:'tok',roomName:'Local'}]);
  const added=c.api.mergeServerRoomsIntoRegistry([
    {code:'BBBBBB',roomName:'Làng Asahi',roomMode:'offline',seatCount:24,phase:'running'},
    {code:'AAAAAA',roomName:'dup'},
    {code:'CCCCCC',playerRoom:true,roomName:'Làng của An'},
    {code:'DDDDDD',phase:'deleted'},
    {code:'bad'}
  ]);
  assert.equal(added,1);
  const rows=c.api.playRoomRegistry();
  assert.equal(rows.map(r=>r.roomCode).join(','),'AAAAAA,BBBBBB');
  assert.equal(rows[1].roomMode,'offline');
  assert.equal(rows[0].gmToken,'tok');
});

test('a shared room without its own gmToken is remembered and keeps an existing token', () => {
  const c=ctx([{roomCode:'AAAAAA',gmToken:'tok'}]);
  c.api.rememberPlayRoom('BBBBBB','',{roomName:'Từ iPhone',roomMode:'offline'});
  c.api.rememberPlayRoom('AAAAAA','',{roomName:'Local'});
  const rows=c.api.playRoomRegistry();
  assert.equal(rows.find(r=>r.roomCode==='BBBBBB').gmToken,'');
  assert.equal(rows.find(r=>r.roomCode==='AAAAAA').gmToken,'tok');
});

test('room list refreshes from the server at most every 15s; idle auto-restore skips shared rows', () => {
  assert.match(src,/Date\.now\(\)-sharedRoomRegistry\.at<15000/);
  assert.match(src,/void syncSharedRoomRegistry\(\);/);
  const editor=fs.readFileSync('server-game/src/30-village-and-setup/70-room-editor-and-sync.part','utf8');
  assert.match(editor,/if\(!saved\.roomCode\|\|!saved\.gmToken\|\|/);
});
