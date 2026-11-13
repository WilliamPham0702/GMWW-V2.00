import {workerSource} from '../.github/scripts/worker-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {projectPublicTurnClock} from '../src/gmww-public-turn-clock.js';
import {readFileSync} from 'node:fs';

const active={cursor:0,queue:[{id:'role-private',durationSec:30,startedAt:'2026-11-02T12:00:00.000Z'}],deadlineAt:'2026-11-02T12:00:30.000Z'};
test('Server public night clock counts down, without private actor or target data',()=>{
 const t=projectPublicTurnClock(active,Date.parse('2026-11-02T12:00:07.000Z'));
 assert.deepEqual(t,{remainingMs:23000,serverTime:Date.parse('2026-11-02T12:00:07.000Z'),paused:false});
 assert.equal(JSON.stringify(t).includes('role-private'),false);
 assert.equal(projectPublicTurnClock({...active,completed:true}),null);
});
test('Clock respects paused GM and authoritative deadline even when duration is absent',()=>{
 assert.equal(projectPublicTurnClock({...active,autoAdvance:false,autoPausedRemainingMs:12650}).remainingMs,12650);
 assert.equal(projectPublicTurnClock({...active,queue:[{id:'no-duration'}]},Date.parse('2026-11-02T12:00:29.000Z')).remainingMs,1000);
});
test('Player clock consumes public clock in the same timeline, with elapsed monotonic time',()=>{
 const player=readFileSync('src/player-web-src/35-online-chat.part','utf8');
 const timeline=readFileSync('src/player-web-src/20-village-and-profile.part','utf8');
 const server=workerSource();
 assert.match(server,/clock:projectPublicTurnClock\(wolfRuntime\)/);
 assert.match(timeline,/gmwwSharedTimelineReceivedAt=performance.now\(\)/);
 assert.match(player,/gmwwSharedTimeline\?\.clock/);
 assert.match(player,/gmwwSharedTimelineReceivedAt/);
});
