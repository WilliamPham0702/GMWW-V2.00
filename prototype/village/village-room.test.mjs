import assert from "node:assert/strict";
import {validateRoomCode,normalizePublicRoomState,mergeStableSeats,createPublicRoomPoller} from "./village-room.mjs";
assert.equal(validateRoomCode(" ab12 "),"AB12");
for(const code of ["../api","abc","AB-12",""])assert.equal(validateRoomCode(code),"");
assert.throws(()=>normalizePublicRoomState({ok:true,players:{}}),/INVALID_PUBLIC_ROOM_STATE/);
assert.equal(normalizePublicRoomState({ok:true,players:[],room:{}}).players.length,0);
const prev=[{id:"b",displayName:"B"},{id:"a",displayName:"A"}];
const next=[{id:"a",displayName:"New A"},{id:"c",displayName:"C"},{id:"b",displayName:"New B"},{id:"c",displayName:"Duplicate"}];
assert.deepEqual(mergeStableSeats(prev,next).map(p=>p.id),["b","a","c"]);
assert.equal(mergeStableSeats(prev,next)[0].displayName,"New B");
assert.equal(mergeStableSeats([],Array.from({length:35},(_,i)=>({id:String(i)}))).length,30);
let observed=[],requests=0;
const stop=createPublicRoomPoller({
 roomCode:"AB12",
 fetchImpl:async(url,opts)=>{requests++;assert.equal(url,"/api/rooms/AB12");assert.equal(opts.cache,"no-store");return{ok:true,json:async()=>({ok:true,players:[{id:"a"}]})};},
 onState:s=>observed.push(s),intervalMs:10000
});
await new Promise(r=>setTimeout(r,20));stop();
assert.equal(requests,1);assert.equal(observed.length,1);
let callbacks=0;
let unblock;
const pending=new Promise(resolve=>{unblock=resolve});
const stopPending=createPublicRoomPoller({
 roomCode:"AB12",fetchImpl:async()=>{await pending;return{ok:true,json:async()=>({ok:true,players:[]})}},
 onState:()=>callbacks++
});
stopPending();unblock();await new Promise(r=>setTimeout(r,20));
assert.equal(callbacks,0);
console.log("Village public-room polling and stable seats: PASS");
