// Khóa điều khiển GM theo thiết bị: acquire / takeover / release / hết hạn.
import test from 'node:test';
import assert from 'node:assert/strict';
import {RoomHttpDispatchMethods} from '../src/worker/room/http-dispatch.js';

function fakeRoom(){
  const data=new Map();
  return {ctx:{storage:{get:async k=>data.get(k),put:async(k,v)=>{data.set(k,v)},delete:async k=>{data.delete(k)}}},data,gmDeviceLease:RoomHttpDispatchMethods.prototype.gmDeviceLease};
}
const A='device-aaaaaaaa-phone', B='device-bbbbbbbb-pc';
const body=async r=>r.json();

test('free room: device A acquires, device B is refused', async () => {
  const room=fakeRoom();
  const a=await body(await room.gmDeviceLease({deviceId:A,label:'iPhone',action:'acquire'}));
  assert.equal(a.mine,true);
  const bRes=await room.gmDeviceLease({deviceId:B,label:'PC',action:'acquire'});
  assert.equal(bRes.status,409);
  const b=await body(bRes);
  assert.equal(b.error,'GM_DEVICE_LEASE_OWNED');
  assert.equal(b.owner,'iPhone');
});

test('takeover moves the lease; release frees it', async () => {
  const room=fakeRoom();
  await room.gmDeviceLease({deviceId:A,label:'iPhone',action:'acquire'});
  const t=await body(await room.gmDeviceLease({deviceId:B,label:'PC',action:'takeover'}));
  assert.equal(t.mine,true);
  await room.gmDeviceLease({deviceId:B,label:'PC',action:'release'});
  const a=await body(await room.gmDeviceLease({deviceId:A,label:'iPhone',action:'acquire'}));
  assert.equal(a.mine,true);
});

test('release by a non-owner does not free the lease', async () => {
  const room=fakeRoom();
  await room.gmDeviceLease({deviceId:A,label:'iPhone',action:'acquire'});
  await room.gmDeviceLease({deviceId:B,label:'PC',action:'release'});
  assert.equal(room.data.get('gmDeviceLease').owner,A);
});

test('expired lease is treated as free', async () => {
  const room=fakeRoom();
  await room.gmDeviceLease({deviceId:A,label:'iPhone',action:'acquire'});
  room.data.get('gmDeviceLease').until=Date.now()-1;
  const b=await body(await room.gmDeviceLease({deviceId:B,label:'PC',action:'acquire'}));
  assert.equal(b.mine,true);
});

test('owner renews by acquiring again', async () => {
  const room=fakeRoom();
  await room.gmDeviceLease({deviceId:A,label:'iPhone',action:'acquire'});
  const first=room.data.get('gmDeviceLease').until;
  await new Promise(r=>setTimeout(r,5));
  await room.gmDeviceLease({deviceId:A,label:'iPhone',action:'acquire'});
  assert.ok(room.data.get('gmDeviceLease').until>=first);
});

test('short or missing device id is rejected', async () => {
  const room=fakeRoom();
  const r=await room.gmDeviceLease({deviceId:'x',action:'acquire'});
  assert.equal(r.status,400);
});
