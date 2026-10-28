import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('Sói Con double target is bound from Server turn metadata in GM UI and emitted bundle',()=>{
 for(const p of ['server-game/src/40-battle-and-timeline.part','server-game/current/app.js']){
  const s=fs.readFileSync(p,'utf8');
  assert.ok(s.includes("if(turn?.kind==='wolf-pack-bite'&&action.actionId==='action_wolf_bite')"));
  assert.ok(s.includes("action={...action,targetCount:Number(turn.targetCount||1)}"));
 }
});
