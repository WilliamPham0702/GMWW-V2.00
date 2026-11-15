import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const move=readFileSync('src/player-web-src/20-village-and-profile/40-room-setup-and-movement.part','utf8');
const sheet=readFileSync('src/player-web-src/37-player-rooms/30-sheet-dock-and-mount.part','utf8');
const shipped=readFileSync('src/gmww-members-live.js','utf8');
const server=readFileSync('src/worker/room/player-seats.js','utf8');

test('duplicate timer and iframe movement arrivals make only one completion request',()=>{
 assert.match(move,/state\.movementCompletePending===String\(moveId\)/);
 assert.match(move,/state\.movementCompletePending=String\(moveId\)/);
 assert.match(move,/finally\{if\(state\.movementCompletePending===String\(moveId\)\)state\.movementCompletePending=null\}/);
});
test('server stale movement conflict is reconciled without exposing raw error in player toast',()=>{
 assert.match(server,/error:"MOVE_NOT_ACTIVE"/);
 assert.match(move,/code==='MOVE_NOT_ACTIVE'\|\|code==='MOVE_MISMATCH'/);
 assert.match(move,/void pollRoomState\(\)\.catch\(\(\)=>\{\}\)/);
});
test('iPhone Quick Play setup stays inside visual viewport with keyboard',()=>{
 assert.match(sheet,/function visiblePanelViewport\(\)/);
 assert.match(sheet,/window\.visualViewport/);
 assert.match(sheet,/v\.right-width-8/);
 assert.match(sheet,/v\.bottom-8/);
 assert.match(sheet,/panel\.addEventListener\('focusin',replace\)/);
 assert.match(sheet,/max-width:calc\(var\(--gmww-player-visible-width,100vw\) - 16px\)/);
 assert.match(sheet,/@media\(max-width:560px\)/);
 assert.match(sheet,/grid-column:1 \/ -1/);
});
test('background room polling must not remove focused code entry',()=>{
 assert.match(sheet,/options\?\.background&&sameView&&oldBody&&oldBody\.contains\(document\.activeElement\)/);
 assert.doesNotMatch(sheet,/options\?\.background&&sameView&&pr\.view==='game'&&\(pr\.state\?\.room\?\.quickPlay/);
});
test('source corrections are included in compiled Player Web',()=>{
 const p='export const gmwwMembersLiveScript = ';
 assert.ok(shipped.startsWith(p)&&shipped.endsWith(';\n'));
 const payload=JSON.parse(shipped.slice(p.length,-2));
 assert.ok(payload.includes(move),'movement fix must be packaged');
 assert.ok(payload.includes(sheet),'keyboard/viewport fix must be packaged');
});


test('valid shared SHA-256 audio URL is not discarded by legacy 32-hex client filter',async()=>{
 const {runInNewContext}=await import('node:vm');
 const source=readFileSync('src/player-web-src/35-online-chat/10-announcement-audio.part','utf8');
 const method=source.slice(source.indexOf('function gmwwAnnouncementUrls('),source.indexOf('// Seconds since the Server'));
 assert.ok(method.startsWith('function gmwwAnnouncementUrls('));
 const fn=runInNewContext(method+';gmwwAnnouncementUrls');
 const base='/api/rooms/73KRBR/announcement-audio?a=';
 const legacy='a'.repeat(32),shared='s'+'b'.repeat(64);
 const pending={room:'73KRBR',cue:{audio:[base+legacy,base+shared,
    base+'s'+'b'.repeat(63),'/api/rooms/OTHER/announcement-audio?a='+shared,
    base+'https://evil.invalid',base+'s'+'b'.repeat(65)]}};
 assert.deepEqual(Array.from(fn(pending)),[base+legacy,base+shared]);
 assert.deepEqual(Array.from(fn({room:'73KRBR',cue:{audioUrl:base+shared}})),[base+shared]);
});
test('manual audio control does not demand a GM upload when shared catalog is enabled',()=>{
 const source=readFileSync('src/player-web-src/37-player-rooms/30-sheet-dock-and-mount.part','utf8');
 assert.doesNotMatch(source,/Cần nạp thư viện từ GM Server/);
 assert.match(source,/kho Audio chung/);
});
