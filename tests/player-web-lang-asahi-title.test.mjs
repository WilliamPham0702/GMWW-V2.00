import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const live=fs.readFileSync(new URL('../src/gmww-members-live.js',import.meta.url),'utf8');

test('Player Web village header stays Làng Asahi inside rooms',()=>{
  assert.ok(live.includes("const title=$('#game .page-title');if(title)title.textContent='Làng Asahi';"));
  assert.ok(!live.includes("title.textContent=state.room?.roomName||('Phòng '+state.roomCode)"));
});
