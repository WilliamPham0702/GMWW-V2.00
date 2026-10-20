import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {demoSeatCount, makeDemoPlayers} from '../src/gmww-demo-room.js';

const code='ABCDEF';
const positions=Array.from({length:30},(_,i)=>({x:10+i,y:60+i/2}));
test('Demo roster is isolated, complete and stable for 8–30 seats',()=>{
  for(const count of [8,12,24,30]){
    const players=makeDemoPlayers({roomCode:code,count,positions,
      now:new Date('2026-10-21T00:00:00Z')});
    const ids=Object.keys(players);
    assert.equal(ids.length,count);
    assert.equal(new Set(ids).size,count);
    assert.deepEqual(ids.map(k=>players[k].seatId),Array.from({length:count},(_,i)=>i+1));
    for(const row of Object.values(players)){
      assert.equal(row.demoBot,true);
      assert.equal(row.kind,'member');
      assert.equal(row.ready,true);
      assert.equal(row.reservedByGM,true);
      assert.match(row.loginId,/^dmabcdef\d{2}$/);
      assert.match(row.gameCharacterId,/^character-\d{2}$/);
      assert.ok(row.positionX>=10 && row.positionY>=60);
    }
  }
});
test('invalid Demo count or seat positions fail before roster creation',()=>{
  for(const count of [0,7,31,4.5,Infinity,'abc'])
    assert.throws(()=>demoSeatCount(count),RangeError);
  assert.throws(()=>makeDemoPlayers({roomCode:code,count:12,positions:positions.slice(0,8)}),/unavailable/);
  assert.throws(()=>makeDemoPlayers({roomCode:'LIVE',count:12,positions}),/Invalid demo room code/);
  assert.throws(()=>makeDemoPlayers({roomCode:code,count:12,
    positions:[{x:NaN,y:0},...positions]}),/Invalid demo seat point/);
});
test('Worker isolates Demo rooms from real members, result history and public joins',()=>{
  const worker=readFileSync('src/index.js','utf8');
  assert.match(worker,/DEMO_REQUIRES_SYNTHETIC_ROSTER/);
  assert.match(worker,/DEMO_ROOM_PRIVATE/);
  assert.match(worker,/room\.isDemoRoom===true\)return res/);
  assert.match(worker,/meta\.isDemoRoom===true\)continue/);
  assert.match(worker,/if\(d\?\.room\?\.isDemoRoom===true\)return/);
  assert.match(worker,/\/gm\/demo\/roster/);
  assert.match(worker,/\/gm\/demo\/gallows-vote/);
  assert.match(worker,/NOT_DEMO_BOT/);
  assert.match(worker,/DEMO_ROSTER_LOCKED/);
});
test('Demo is selectable in room picker and its running controls use the real GM APIs',()=>{
  const html=readFileSync('server-game/current/GMWW.html','utf8');
  const app=readFileSync('server-game/current/app.js','utf8');
  const reference=readFileSync('src/gmww-demo-runner.js','utf8').replace(
    'export function createDemoRunner(', 'function gmwwCreateDemoRunner(');
  assert.match(html,/id="playCreateRoomDemo"/);
  assert.match(html,/id="playDemoCount"/);
  assert.match(html,/id="battleDemoControl"/);
  assert.match(app,/\/demo\/roster/);
  assert.match(app,/\/battle-action/);
  assert.match(app,/\/day-action/);
  assert.match(app,/gmwwDemoGallowsAction/);
  assert.match(app,/\/demo\/gallows-vote/);
  assert.match(app,/\/auto/);
  assert.ok(app.includes(reference),'GM bundle and tested Demo runner have identical logic');
});
