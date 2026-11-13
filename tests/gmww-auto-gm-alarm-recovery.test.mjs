import {workerSource} from '../.github/scripts/worker-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=workerSource();
const from=source.indexOf('  async autoAdvanceDue(meta){');
const to=source.indexOf('  async gmTurn(',from);
assert.ok(from>0&&to>from,'Find actual Durable Object scheduler methods');
const ClockMethods=new Function('return class ClockMethods {\n'+source.slice(from,to)+'\n}')();

function fixture({enabled=true,expired=true}={}){
  const now=Date.now(),meta={phase:'running',autoGM:enabled,cyclePhase:'night',cycleNight:1,matchId:'synthetic'};
  const runtime={queue:[{id:'first',kind:'role',startedAt:new Date(now-(expired?8000:1000)).toISOString(),durationSec:5},{id:'second',kind:'role',durationSec:10}],cursor:0,currentId:'first',completed:false,deadlineAt:null};
  class Mock extends ClockMethods {
    constructor(){
      super();this.meta=meta;this.runtime=runtime;this.alarm=null;this.ctx={storage:{
        get:async key=>key==='meta'?this.meta:null,
        getAlarm:async()=>this.alarm,
        setAlarm:async value=>{this.alarm=value},
      }};
    }
    roomExpiryDue(){return now+86400000}
    async getNightRuntime(){return this.runtime}
    async advanceNightRuntime(){
      this.runtime.cursor++;this.runtime.currentId='second';
      this.runtime.queue[1].startedAt=new Date(now).toISOString();
      this.runtime.deadlineAt=new Date(now+10000).toISOString();
      return this.runtime;
    }
    async applyCycle(){throw new Error('Must not end the night before second turn')}
  }
  return new Mock();
}

test('advances an expired role even when the stored deadline is missing',async()=>{
  const room=fixture();
  assert.ok((await room.autoAdvanceDue(room.meta))<=Date.now());
  assert.equal(await room.runAutoAdvanceIfDue(room.meta),true);
  assert.equal(room.runtime.cursor,1);
  assert.ok(room.alarm>Date.now()&&room.alarm<Date.now()+11000);
});

test('does not advance before the authoritative deadline',async()=>{
  const room=fixture({expired:false});
  assert.equal(await room.runAutoAdvanceIfDue(room.meta),false);
  assert.equal(room.runtime.cursor,0);
});

test('Auto GM OFF disables the turn scheduler',async()=>{
  const room=fixture({enabled:false});
  assert.equal(await room.autoAdvanceDue(room.meta),0);
  assert.equal(await room.runAutoAdvanceIfDue(room.meta),false);
});

test('live-room alarm is not replaced by an idle-room TTL',()=>{
  assert.match(source,/const meta=await this\.ctx\.storage\.get\("meta"\);\s*if\(meta&&String\(meta\.phase/);
  // Room reset/end still use their original idle expiry; only LIVE writes must protect the turn alarm.
  assert.match(source,/async heartbeat\(body\)\{[^\n]*scheduleRoomAlarm\(meta\)/);
  assert.match(source,/async gmRename\(request,body\)\{[^\n]*scheduleRoomAlarm\(meta\)/);
});

test('only authenticated GM state catches up and repairs missing alarms',()=>{
  assert.match(source,/if\(path==="\/gm\/state"&&request\.method==="GET"\)return this\.ctx\.blockConcurrencyWhile/);
  assert.match(source,/async gmState\(request\)\{\s*const auth=await this\.gmAuthorized\(request\);if\(!auth\.ok\)return auth\.response;/);
  assert.match(source,/const alarmAt=await this\.ctx\.storage\.getAlarm\(\);/);
  assert.match(source,/if\(advanced\)meta=await this\.ctx\.storage\.get\("meta"\)\|\|meta;/);
});