import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const realtime=readFileSync('src/player-web-src/30-rooms-and-realtime.part','utf8');
const village=readFileSync('src/player-web-src/20-village-and-profile.part','utf8');
const chat=readFileSync('src/player-web-src/35-online-chat.part','utf8');

test('confirmed status refresh is debounced and authoritative, including cleared effects',async()=>{
 const begin=realtime.indexOf('let gmwwPublicStatusRefreshTimer=null;');
 const end=realtime.indexOf('function connectWS(){',begin);
 assert.ok(begin>=0&&end>begin,'status refresh lives in realtime source');
 const pending=[],observed=[];
 let payload={room:{matchId:'M'},players:[
  {participantId:'member:a',statusTags:[{statusId:'dead'}]},
  {participantId:'member:b',statusTags:[{statusId:'marked'}]}
 ]};
 const state={roomCode:'ROOM',participantId:'member:a',room:{matchId:'M'},players:[
  {participantId:'member:a',statusTags:[]},
  {participantId:'member:b',statusTags:[{statusId:'expelled'}]}
 ]};
 const scope={state,console:{warn(){}},encodeURIComponent,
  setTimeout(fn){pending.push(fn);return pending.length},
  api:async path=>{observed.push(path);return payload},
  syncVillageFrame:()=>observed.push('render'),
  gmwwChatRefresh:()=>observed.push('chat')
 };
 vm.runInNewContext(realtime.slice(begin,end)+'globalThis.refresh=schedulePublicRoomSnapshot;',scope);
 scope.refresh();scope.refresh();assert.equal(pending.length,1,'one GET per burst');
 await pending.shift()();
 assert.deepEqual(Array.from(state.players[0].statusTags,x=>x.statusId),['dead']);
 assert.deepEqual(Array.from(state.players[1].statusTags,x=>x.statusId),['marked']);
 assert.equal(observed.filter(x=>x==='/api/rooms/ROOM').length,1);
 assert.ok(observed.includes('render')&&observed.includes('chat'));
 payload={room:{matchId:'M'},players:[
  {participantId:'member:a',statusTags:[]},{participantId:'member:b',statusTags:[]}
 ]};
 scope.refresh();await pending.shift()();
 assert.equal(state.players[0].statusTags.length,0,'revived player clears stale death tag');
 assert.equal(state.players[1].statusTags.length,0,'removed mark clears correctly');
 state.room.matchId='new-match';
 payload={room:{matchId:'old-match'},players:[
  {participantId:'member:a',statusTags:[{statusId:'dead'}]}
 ]};
 scope.refresh();await pending.shift()();
 assert.equal(state.players[0].statusTags.length,0,'stale match may not overwrite new match');
});

test('Player Web renders marked labels and keeps battle avatars stationary',()=>{
 assert.match(village,/statusId==='marked'\)\?'BỊ ĐÁNH DẤU'/);
 assert.match(village,/battleStatic=playerScenePolicy\(state\.room\)\.mode==='battle'/);
 assert.match(village,/movementStatus:battleStatic\?'idle'/);
 assert.match(village,/villageActivity:battleStatic\?'idle'/);
 assert.match(village,/moveStartedAt:battleStatic\?null/);
 assert.match(realtime,/schedulePublicRoomSnapshot\(\)/);
 assert.match(realtime,/d\.type==='player_status_changed'/);
});

test('Day chat can grow threefold while night height and outside-tap dismissal stay',()=>{
 assert.match(chat,/#gmwwOnlineFooter\.gmww-chat-day\{height:auto!important;max-height:min\(74dvh/);
 assert.match(chat,/#gmwwChatPanel\.open #gmwwChatLines\{display:block;height:90px/);
 assert.match(chat,/\.gmww-chat-day #gmwwChatPanel\.open #gmwwChatLines\{height:min\(270px/);
 assert.match(chat,/if\(panel\?\.contains\(event\.target\)\)return/);
 assert.match(chat,/item\.isGM===true\|\|item\.system===true\?'#ff5353'/);
 assert.match(chat,/replace\(\/\^member:\/,'\'\)/);
});
