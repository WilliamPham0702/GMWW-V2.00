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
