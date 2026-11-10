import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gmwwMembersLiveScript as script} from '../src/gmww-members-live.js';

const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const part=read('../src/player-web-src/37-player-rooms.part');
const rooms=read('../src/player-web-src/30-rooms-and-realtime.part');
const village=read('../src/player-web-src/20-village-and-profile.part');
const worker=read('../src/index.js');

test('Phòng page no longer embeds the chat box; Box Chat is its own floating page',()=>{
  assert.doesNotMatch(part,/gmww-pr-chatbox|CHAT PHÒNG/);
  assert.match(part,/id='gmwwPrChat'/);assert.match(part,/function openChat\(\)/);assert.match(part,/playChatTop'\)\.addEventListener\('click',\(\)=>\{[\s\S]*?openChat\(\)/);
  assert.ok(script.includes('gmwwPrChat'));
});
test('floating pages drag by grip/title, snap to the top/bottom menu within 32px and close on outside pointerdown',()=>{
  assert.match(part,/SNAP_PX=32/);assert.match(part,/function snapFor\(/);assert.match(part,/function floatPage\(/);
  assert.match(part,/closest\('\.gmww-pr-grip,\.gmww-pr-head'\)/);assert.match(part,/gmww-dock-near/);assert.match(part,/gmww-dock-snapped/);
  assert.match(part,/addEventListener\('pointerdown',dismissOutside,true\)/);assert.match(part,/stopImmediatePropagation/);
  assert.match(part,/#gmwwStageStrip,#gmwwOwnerDock/);
  // the catcher behind the pages is visible for the sheet AND the chat page (the village iframe swallows taps otherwise)
  assert.match(part,/back\.hidden=!\(pr\.open\|\|pr\.chatOpen\|\|pr\.holdBack\)/);
});
test('typed room code survives panel re-renders and failures are shown inside the page',()=>{
  assert.match(part,/inp\.addEventListener\('input',\(\)=>\{pr\.joinCode=inp\.value\}\)/);assert.match(part,/joinByCode\(pr\.joinCode\)/);
  assert.doesNotMatch(part,/joinByCode\(document\.getElementById/);
  assert.match(part,/Không tìm thấy phòng /);assert.match(rooms,/state\.lastJoinError=/);
  assert.match(village,/position:fixed;z-index:9700;left:50%;top:0/);
});
test('owner can delete the room: UI button, Worker + Room route, running match blocked, players are told',()=>{
  assert.match(part,/btn\('Xoá phòng',deleteRoom,'gmww-pr-danger'\)/);assert.match(part,/callOwner\('close','POST',\{\}\)/);
  assert.match(worker,/\|start\|end\|stage\|close\)\$/);assert.match(worker,/"stage","close"\]\.includes\(action\)/);
  assert.match(worker,/if\(action==="close"\)return this\.ownerClose\(meta\)/);
  assert.match(worker,/async ownerClose\(meta\)\{[\s\S]*?"ROOM_RUNNING"[\s\S]*?this\.wipeRoom\(meta,"ROOM_CLOSED"\)/);
  assert.match(worker,/await this\.wipeRoom\(meta,"ROOM_EXPIRED"\)/);
  assert.match(worker,/ws\.close\(1000,reason\)/);
  assert.match(rooms,/e\?\.reason==='ROOM_CLOSED'/);
});
test('a deleted room cannot be joined any more',()=>{
  assert.match(worker,/async join\(body\)\{\s*const meta=await this\.ctx\.storage\.get\("meta"\);if\(!meta\|\|String\(meta\.phase\|\|""\)\.toLowerCase\(\)==="deleted"\)return j\(\{ok:false,error:"ROOM_NOT_FOUND"/);
});
test('owner hears about each new arrival',()=>{
  assert.match(part,/function noteJoins\(st\)/);assert.match(part,/đã vào phòng\./);
});
