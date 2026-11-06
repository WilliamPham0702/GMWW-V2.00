// 06/11/2026 — Player Web: audio lượt vai trò lúc phát lúc không dù Server vẫn phát.
// Chỉ kiểm tra 2 nguyên nhân gốc trong 35-online-chat.part (chạy hàm thật trong vm):
//  1) cue cũ từ /me (poll chậm) đến sau cue mới từ WebSocket → ghi đè và cắt audio lượt mới;
//  2) cue đến muộn sau khi clip đã hết trên Server → bị bỏ qua im lặng dù lượt vẫn đang chạy.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {gmwwMembersLiveScript as live} from '../src/gmww-members-live.js';

const a='/api/rooms/R/announcement-audio?a=',h=c=>c.repeat(32);
const sliceCode=(from,to)=>{const i=live.indexOf(from),j=live.indexOf(to,i);assert.ok(i>=0&&j>i,from+' missing');return live.slice(i,j)};

async function harness(){
  const starts=[],stops=[];
  const ctx={state:'running',currentTime:0,resume:async()=>{},
    decodeAudioData:(data,ok)=>ok({duration:4}),
    createGain:()=>({gain:{value:0},connect(){}}),
    createBufferSource:()=>({connect(){},start(at,off){starts.push(off)},stop(){stops.push(1)}})};
  const sandbox={state:{roomCode:'R',participantId:'p',serverClockOffsetMs:0},starts,stops,
    updatePlayerTopMenu(){},auth:()=>({}),localStorage:{getItem:()=>null},
    document:{addEventListener(){}},URL,AbortController,Date,Promise,
    fetch:async()=>({ok:true,blob:async()=>({type:'audio/mpeg',size:10,arrayBuffer:async()=>new ArrayBuffer(8)})})};
  const code=
    'var gmwwPlayerCueKey="";var gmwwAudioMaster={};function gmwwAudio(){return __ctx}\n'+
    sliceCode('const gmwwChatAudioOff=','function gmwwChatAudioButton')+
    '\nthis.api={announce:gmwwChatAnnounce,pending:()=>gmwwAnnouncementPending,played:()=>gmwwPlayerCueKey};';
  sandbox.__ctx=ctx;vm.createContext(sandbox);vm.runInContext(code,sandbox);
  return sandbox;
}
const settle=()=>new Promise(r=>setTimeout(r,40));
const cue=(id,ago)=>({key:'m:n1:'+id,label:id,startedAt:Date.now()-ago*1000,audio:[a+h('a')],audioUrl:a+h('a')});

test('1. cue cũ đến muộn (poll /me) không ghi đè cue lượt mới của WebSocket',async()=>{
  const s=await harness();
  s.api.announce(cue('turn2',0.5));await settle();
  s.api.announce(cue('turn1',9));await settle();
  assert.equal(s.api.pending().key,'R:m:n1:turn2','lượt mới vẫn là lượt đang chờ/đang phát');
  assert.equal(s.stops.length,0,'audio lượt mới không bị cắt');
});

test('2. cue đến muộn nhưng lượt còn đang chạy → vẫn phát audio vai trò (từ đầu)',async()=>{
  const s=await harness();
  s.api.announce(cue('turn1',6));await settle(); // clip 4s đã hết trên Server 2s trước
  assert.deepEqual(s.starts,[0],'phát từ đầu thay vì im lặng');
  assert.equal(s.api.played(),'R:m:n1:turn1');
});

test('3. cue đến rất muộn (người vào lại) → không phát lại audio đã qua từ lâu',async()=>{
  const s=await harness();
  s.api.announce(cue('turn1',60));await settle();
  assert.deepEqual(s.starts,[]);
  assert.equal(s.api.played(),'R:m:n1:turn1','đánh dấu đã xử lý, không lặp lại ở lần poll sau');
});

test('4. vào giữa clip → vẫn vào đúng vị trí của Server (hành vi cũ giữ nguyên)',async()=>{
  const s=await harness();
  s.api.announce(cue('turn1',1.5));await settle();
  assert.equal(s.starts.length,1);
  assert.ok(s.starts[0]>1.3&&s.starts[0]<2.2,'offset ≈ 1.5s, thực tế '+s.starts[0]);
});
