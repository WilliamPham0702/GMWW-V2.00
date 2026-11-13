import {workerSource} from '../.github/scripts/worker-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {playerRoomOccupied,nextEmptySince,playerRoomEmptyDue,PLAYER_ROOM_EMPTY_TTL_MS,PLAYER_ROOM_CHECK_MS} from '../src/gmww-player-room-policy.js';

const source=workerSource();
const NOW=Date.parse('2026-11-09T01:00:00Z'),iso=ms=>new Date(ms).toISOString();
const ROOM_IDLE_TTL=72*60*60*1000;

// ---- pure policy ----
test('present means a heartbeat within 70 seconds; offline seats do not keep the room alive',()=>{
  assert.equal(playerRoomOccupied({},NOW),false);
  assert.equal(playerRoomOccupied({a:{lastHeartbeatAt:NOW-10000}},NOW),true);
  assert.equal(playerRoomOccupied({a:{lastSeenAt:iso(NOW-60000)}},NOW),true);
  assert.equal(playerRoomOccupied({a:{lastHeartbeatAt:NOW-71000},b:{lastSeenAt:iso(NOW-3600000)}},NOW),false);
  assert.equal(playerRoomOccupied({a:{}},NOW),false);
});
test('empty clock starts once, is kept while empty, and resets when someone returns',()=>{
  const t0=iso(NOW);
  assert.equal(nextEmptySince({},false,NOW),t0);
  assert.equal(nextEmptySince({emptySince:iso(NOW-600000)},false,NOW),iso(NOW-600000),'keeps the original start');
  assert.equal(nextEmptySince({emptySince:iso(NOW-600000)},true,NOW),null,'someone present resets');
  assert.equal(nextEmptySince({emptySince:'garbage'},false,NOW),t0);
});
test('empty due is 30 minutes after emptySince, only for player rooms',()=>{
  assert.equal(PLAYER_ROOM_EMPTY_TTL_MS,30*60*1000);assert.equal(PLAYER_ROOM_CHECK_MS,5*60*1000);
  assert.equal(playerRoomEmptyDue({playerRoom:true,emptySince:iso(NOW)}),NOW+30*60*1000);
  assert.equal(playerRoomEmptyDue({playerRoom:true}),null);
  assert.equal(playerRoomEmptyDue({emptySince:iso(NOW)}),null,'GM rooms never use the empty clock');
});

// ---- real Durable Object methods ----
const from=source.indexOf('  roomExpiryDue(meta){'),to=source.indexOf('  nightRuntimeKey(',from),sFrom=source.indexOf('  async syncPlayerRoomEmpty(meta){'),sTo=source.indexOf('  async gmDelete(request){',sFrom);
assert.ok(from>0&&to>from&&sFrom>0&&sTo>sFrom,'find real roomExpiryDue/syncPlayerRoomEmpty');
const Methods=new Function('ROOM_IDLE_TTL','playerRoomEmptyDue','playerRoomOccupied','nextEmptySince','return class M {\n'+source.slice(from,to)+source.slice(sFrom,sTo)+'\n}')(ROOM_IDLE_TTL,playerRoomEmptyDue,playerRoomOccupied,nextEmptySince);
function room(meta,players={}){
  const data=new Map([['meta',structuredClone(meta)],['players',players]]);
  const m=new Methods();m.ctx={storage:{get:async k=>data.get(k),put:async(k,v)=>{data.set(k,structuredClone(v))}}};m.data=data;return m;
}
const base={createdAt:iso(NOW-3600000),updatedAt:iso(NOW-3600000),lastUsedAt:iso(NOW-3600000)};

test('GM rooms keep the 72h idle expiry and are never touched by the empty sync',async()=>{
  const m=room({...base});
  assert.equal(m.roomExpiryDue(m.data.get('meta')),NOW-3600000+ROOM_IDLE_TTL);
  const meta=await m.syncPlayerRoomEmpty(m.data.get('meta'));
  assert.equal('emptySince' in meta,false);assert.equal('emptySince' in m.data.get('meta'),false);
});
test('a fresh player room expires 30 minutes after creation if nobody ever shows up',async()=>{
  const created=iso(NOW);
  const m=room({playerRoom:true,createdAt:created,updatedAt:created,lastUsedAt:created,emptySince:created});
  assert.equal(m.roomExpiryDue(m.data.get('meta')),NOW+30*60*1000);
});
test('presence clears the clock; leaving starts it again; expiry follows the empty start',async()=>{
  const t=Date.now();
  const meta={playerRoom:true,createdAt:iso(t-7200000),updatedAt:iso(t),lastUsedAt:iso(t),emptySince:iso(t-3600000)};
  const m=room(meta,{a:{lastHeartbeatAt:t-5000}});
  await m.syncPlayerRoomEmpty(m.data.get('meta'));
  assert.equal('emptySince' in m.data.get('meta'),false,'player returned: clock cleared');
  m.data.set('players',{a:{lastHeartbeatAt:t-200000}});
  const after=await m.syncPlayerRoomEmpty(m.data.get('meta'));
  assert.ok(Math.abs(Date.parse(after.emptySince)-t)<5000,'everyone offline: clock starts now');
  assert.ok(m.roomExpiryDue(after)-t>29*60*1000&&m.roomExpiryDue(after)-t<=30*60*1000+5000);
  after.emptySince=iso(t-31*60*1000);
  assert.ok(m.roomExpiryDue(after)<=Date.now(),'31 minutes empty is expired');
});
test('a busy player room is never cut short by the empty rule',async()=>{
  const t=Date.now(),meta={playerRoom:true,createdAt:iso(t-9e6),updatedAt:iso(t-1000),lastUsedAt:iso(t-1000)};
  const m=room(meta,{a:{lastHeartbeatAt:t-1000},b:{lastHeartbeatAt:t-2000}});
  const after=await m.syncPlayerRoomEmpty(m.data.get('meta'));
  assert.equal(m.roomExpiryDue(after),t-1000+ROOM_IDLE_TTL);
});

// ---- wiring guards (real source) ----
test('alarm wiring: sync first, auto-advance cannot keep an expired empty room alive, directory cleaned',()=>{
  const a=source.indexOf('  async roomAlarm(){'),b=source.indexOf('  async gmDelete(',a),alarm=source.slice(a,b);
  assert.ok(source.indexOf('  async syncPlayerRoomEmpty(meta){')>a&&source.indexOf('  async syncPlayerRoomEmpty(meta){')<b);
  assert.ok(alarm.includes('meta=await this.syncPlayerRoomEmpty(meta);const playerExpired=meta.playerRoom===true&&this.roomExpiryDue(meta)<=Date.now();'));
  assert.ok(alarm.includes('if(!playerExpired){\n        if(typeof this.dayCountdownCue==="function"&&await this.dayCountdownCue(meta)){await this.scheduleRoomAlarm(meta);return}\n        if(await this.runAutoAdvanceIfDue(meta))return;\n      }'));
  assert.ok(alarm.includes('async syncPlayerRoomEmpty(meta){')||source.slice(b).startsWith('  async gmDelete'),'sync method sits inside the alarm method range');
  const w=source.indexOf('  async wipeRoom(meta,reason="ROOM_EXPIRED"){'),wipe=source.slice(w,source.indexOf('  async ownerState(request){',w));
  assert.ok(alarm.includes('await this.wipeRoom(meta,"ROOM_EXPIRED")'),'alarm deletes expired rooms through the shared wipeRoom');
  assert.ok(wipe.includes('"https://member.internal/directory/rooms/delete"')&&wipe.includes('if(meta.playerRoom===true)'),'expired player room is removed from the directory');
  assert.ok(source.includes('presenceDue=meta.playerRoom===true?Date.now()+PLAYER_ROOM_CHECK_MS:0'),'player rooms sample presence at least every 5 minutes');
  assert.equal((source.match(/setAlarm\(Date\.now\(\)\+\(meta&&meta\.playerRoom===true\?PLAYER_ROOM_CHECK_MS:ROOM_IDLE_TTL\)\)/g)||[]).length,4,'all idle alarms use the player-room delay');
  assert.equal(source.includes('setAlarm(Date.now()+ROOM_IDLE_TTL)}catch(_){}'),false);
});
