import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('30-player smoke can only write to an isolated localhost Worker',()=>{
  const source=readFileSync(new URL('../tools/smoke-30-players.mjs',import.meta.url),'utf8');
  assert.match(source,/const ORIGIN='http:\/\/127\.0\.0\.1:8787'/);
  assert.match(source,/DESTRUCTIVE SIMULATION BLOCKED/);
  assert.match(source,/PLAYERS_PER_ROOM=30/);
  assert.match(source,/ROOM_MODES=\['online','offline'\]/);
  assert.match(source,/view\.connections,PLAYERS_PER_ROOM/);
  assert.match(source,/cleared\.players\.length,0/);
  assert.doesNotMatch(source,/williampham0702\.workers\.dev/);
});
