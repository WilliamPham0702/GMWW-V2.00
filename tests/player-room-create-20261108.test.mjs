import {workerSource,workerModuleSource} from '../.github/scripts/worker-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluatePlayerRoomCreate,isActivePlayerRoom,PLAYER_ROOM_MAX_ACTIVE,PLAYER_ROOM_STALE_MS} from '../src/gmww-player-room-policy.js';
import {normalizeLoginId} from '../src/gmww-player-identity-rules.js';
import {normalizeSeatCount} from '../src/gmww-room-config-rules.js';

const source=workerSource();
const NOW=Date.parse('2026-11-08T12:00:00Z');
const iso=ms=>new Date(ms).toISOString();
const room=(code,owner,extra={})=>({code,playerRoom:true,ownerLoginId:owner,phase:'lobby',enabled:true,updatedAt:iso(NOW-60000),...extra});

// ---- policy (pure) ----
test('policy allows a first room and counts only active player rooms',()=>{
  const rows=[room('AAAAAA','u1'),room('BBBBBB','u2',{phase:'ended'}),room('CCCCCC','u3',{updatedAt:iso(NOW-PLAYER_ROOM_STALE_MS-1)}),{code:'GMRRMN',phase:'running',enabled:true,updatedAt:iso(NOW)}];
  assert.equal(isActivePlayerRoom(rows[0],NOW),true);
  assert.equal(isActivePlayerRoom(rows[1],NOW),false,'ended room does not count');
  assert.equal(isActivePlayerRoom(rows[2],NOW),false,'stale room does not count');
  assert.equal(isActivePlayerRoom(rows[3],NOW),false,'GM-created room does not count');
  assert.deepEqual(evaluatePlayerRoomCreate(rows,'u9',NOW),{ok:true,active:1});
});
test('policy blocks a second room for the same owner and returns the existing code',()=>{
  const v=evaluatePlayerRoomCreate([room('AAAAAA','u1')],'u1',NOW);
  assert.equal(v.ok,false);assert.equal(v.status,409);assert.equal(v.error,'OWNER_ALREADY_HAS_ROOM');assert.equal(v.roomCode,'AAAAAA');
});
test('policy blocks the sixth concurrent player room',()=>{
  assert.equal(PLAYER_ROOM_MAX_ACTIVE,5);
  const five=['u1','u2','u3','u4','u5'].map((o,i)=>room('R'+i,o));
  assert.equal(evaluatePlayerRoomCreate(five.slice(0,4),'u9',NOW).ok,true);
  const v=evaluatePlayerRoomCreate(five,'u9',NOW);
  assert.equal(v.ok,false);assert.equal(v.status,429);assert.equal(v.error,'PLAYER_ROOM_LIMIT');
});
test('policy rejects a missing owner',()=>assert.equal(evaluatePlayerRoomCreate([],'',NOW).status,400));

// ---- member-store Durable Object method (real source) ----
const mFrom=source.indexOf('  async playerRoomReserve(body){'),mTo=source.indexOf('  async memberLogout(request){',mFrom);
assert.ok(mFrom>0&&mTo>mFrom,'find real playerRoomReserve');
const ROOM_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',isValidRoomCode=c=>new RegExp(`^[${ROOM_ALPHABET}]{6}$`).test(c);
const j=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
const Reserve=new Function('j','normalizeRoomCode','isValidRoomCode','normalizeLoginId','normalizeRoomName','normalizeSeatCount','evaluatePlayerRoomCreate','ROOM_DIRECTORY_LEASE',
  'return class Reserve {\n'+source.slice(mFrom,mTo)+'\n}')(j,v=>String(v||'').trim().toUpperCase(),isValidRoomCode,normalizeLoginId,v=>String(v||'').trim().replace(/\s+/g,' ').slice(0,40),normalizeSeatCount,evaluatePlayerRoomCreate,180000);
function store(){
  const data=new Map();
  const list=async({prefix})=>new Map([...data].filter(([k])=>k.startsWith(prefix)).sort(([a],[b])=>a<b?-1:1));
  const o=new Reserve();o.ctx={storage:{get:async k=>data.get(k),put:async(k,v)=>{data.set(k,structuredClone(v))},list}};o.data=data;return o;
}
// The real route wraps the call in ctx.blockConcurrencyWhile, which runs calls one at a time.
const reserve=(o,body)=>{const run=()=>o.playerRoomReserve(body);o.queue=(o.queue||Promise.resolve()).then(run,run);return o.queue};

test('reserve stores a player room and keeps the owner login out of the public directory record',async()=>{
  const o=store(),res=await reserve(o,{code:'ABCDEF',ownerLoginId:'Nam01',roomName:'  Phòng   Nam ',seatCount:99});
  assert.equal(res.status,201);
  const rec=o.data.get('roomdir:ABCDEF');
  assert.equal(rec.playerRoom,true);assert.equal(rec.roomMode,'online');assert.equal(rec.seatCount,30,'seats capped at 30');assert.equal(rec.roomName,'Phòng Nam');
  assert.equal(JSON.stringify(rec).includes('nam01'),false,'owner not exposed in directory record');
  assert.equal(o.data.get('playerroom:ABCDEF').ownerLoginId,'nam01');
});
test('reserve enforces one room per owner and five rooms in total, also for parallel calls',async()=>{
  const o=store();
  const results=await Promise.all(['u1','u2','u3','u4','u5','u6','u7'].map((u,i)=>reserve(o,{code:'AAAAA'+'BCDEFGH'[i],ownerLoginId:u})));
  assert.deepEqual(results.map(r=>r.status).sort(),[201,201,201,201,201,429,429]);
  const dup=await reserve(o,{code:'ZZZZZZ',ownerLoginId:'u1'});
  assert.equal(dup.status,409);assert.equal((await dup.json()).error,'OWNER_ALREADY_HAS_ROOM');
});
test('reserve refuses a code that already exists so a GM room can never be overwritten',async()=>{
  const o=store();o.data.set('roomdir:GMRRMN',{code:'GMRRMN',phase:'running'});
  const res=await reserve(o,{code:'GMRRMN',ownerLoginId:'u1'});
  assert.equal(res.status,409);assert.equal((await res.json()).error,'CODE_TAKEN');
  assert.deepEqual(o.data.get('roomdir:GMRRMN'),{code:'GMRRMN',phase:'running'});
});
test('reserve rejects invalid code or owner',async()=>{
  const o=store();
  assert.equal((await reserve(o,{code:'bad',ownerLoginId:'u1'})).status,400);
  assert.equal((await reserve(o,{code:'ABCDEF',ownerLoginId:''})).status,400);
});

// ---- Worker function createPlayerRoom (real source) ----
const playerRoomApi=workerModuleSource('http/player-room-api.js');
const fFrom=playerRoomApi.indexOf('async function createPlayerRoom(env,url,request){'),fTo=playerRoomApi.length;
assert.ok(fFrom>0&&fTo>fFrom,'find real createPlayerRoom');
const sha256=async v=>'h:'+v;
function build({session={ok:true,loginId:'Nam01'},reserveStatuses=[201],initStatuses=[201]}={}){
  const calls={reserve:[],init:[],del:[],sync:[]};let codeN=0;
  const memberFetch=async(input,init={})=>{
    const u=typeof input==='string'?input:input.url;
    if(u.endsWith('/members/session'))return session.ok?j({ok:true,member:{loginId:session.loginId}}):j({ok:false,error:'UNAUTHORIZED'},401);
    if(u.endsWith('/directory/player-rooms/reserve')){calls.reserve.push(JSON.parse(init.body));const e=reserveStatuses.shift()??201,[s,err]=Array.isArray(e)?e:[e,e===409?'CODE_TAKEN':e===429?'PLAYER_ROOM_LIMIT':'X'];return s===201?j({ok:true},201):j({ok:false,error:err},s)}
    if(u.endsWith('/directory/rooms/delete')){calls.del.push(JSON.parse(init.body));return j({ok:true})}
    throw new Error('unexpected member call '+u);
  };
  const env={};
  const fn=new Function('memberStore','j','normalizeLoginId','safeJson','randomToken','sha256','generateRoomCode','roomStub','syncRoomDirectory','normalizeRoomName','notifyGmPlayerRoomCreated',
    playerRoomApi.slice(fFrom,fTo)+'\nreturn createPlayerRoom;')(()=>({fetch:memberFetch}),j,normalizeLoginId,async r=>r.json().catch(()=>null),()=>'OWNERTOKEN',sha256,()=>'CODE'+String(++codeN).padStart(2,'0'),
    ()=>({fetch:async(u,init)=>{calls.init.push(JSON.parse(init.body));const s=initStatuses.shift()??201;return s===201?j({ok:true,room:{roomName:'Phòng X'},gmToken:'SECRET-GM-TOKEN'},201):j({ok:false},s)}}),
    async(_env,c)=>{calls.sync.push(c)},v=>String(v||'').trim().replace(/\s+/g,' ').slice(0,40),async()=>({ok:false,error:'PUSH_NOT_CONFIGURED'}));
  const call=(body={roomName:'Phòng X'})=>fn(env,new URL('https://gm.example/api/player-rooms'),new Request('https://gm.example/api/player-rooms',{method:'POST',headers:{authorization:'Bearer t','content-type':'application/json'},body:JSON.stringify(body)}));
  return {call,calls};
}
test('create requires a member session',async()=>{
  const t=build({session:{ok:false}}),res=await t.call();
  assert.equal(res.status,401);assert.equal(t.calls.init.length,0);
});
test('create never returns the GM token and hands the owner only an owner token',async()=>{
  const t=build(),res=await t.call(),text=await res.clone().text(),body=await res.json();
  assert.equal(res.status,201);
  assert.equal(body.ownerToken,'OWNERTOKEN');assert.equal(body.roomCode,'CODE01');
  assert.equal('gmToken' in body,false);assert.equal(text.includes('SECRET-GM-TOKEN'),false);
  assert.equal(body.joinUrl,'https://gm.example/CODE01');assert.equal(body.websocketUrl,'wss://gm.example/ws/CODE01');
  const init=t.calls.init[0];
  assert.equal(init.playerRoom,true);assert.equal(init.ownerLoginId,'nam01');assert.equal(init.roomMode,'online');assert.equal(init.demo,false);
  assert.equal(init.ownerTokenHash,'h:OWNERTOKEN','only the hash is stored');assert.equal(JSON.stringify(init).includes('"OWNERTOKEN"'),false);
  assert.deepEqual(t.calls.sync,['CODE01']);
});
test('create cannot be turned into a demo or GM-privileged room by the request body',async()=>{
  const t=build(),res=await t.call({roomName:'X',demo:true,roomMode:'offline',enabled:false,gmToken:'x',playerRoom:false,ownerLoginId:'victim'});
  assert.equal(res.status,201);
  const init=t.calls.init[0];
  assert.equal(init.demo,false);assert.equal(init.roomMode,'online');assert.equal(init.enabled,true);assert.equal(init.playerRoom,true);assert.equal(init.ownerLoginId,'nam01');
});
test('create passes limit errors straight through and creates nothing',async()=>{
  for(const [entry,status,error] of [[429,429,'PLAYER_ROOM_LIMIT'],[[409,'OWNER_ALREADY_HAS_ROOM'],409,'OWNER_ALREADY_HAS_ROOM']]){
    const t=build({reserveStatuses:[entry]}),res=await t.call();
    assert.equal(res.status,status);assert.equal((await res.json()).error,error);
    assert.equal(t.calls.init.length,0);
  }
});
test('create retries on a taken code and releases its reservation when the room already exists',async()=>{
  const t=build({reserveStatuses:[409,201,201],initStatuses:[409,201]}),res=await t.call();
  assert.equal(res.status,201);assert.equal((await res.json()).roomCode,'CODE03');
  assert.deepEqual(t.calls.del,[{code:'CODE02'}],'only our own failed reservation is released');
});

// ---- guards: GM flow untouched ----
test('GM-created rooms keep their old behaviour',()=>{
  assert.ok(source.includes('if(url.pathname==="/api/rooms"&&request.method==="POST")return createRoom(env,url,request);'));
  assert.ok(source.includes('return this.ctx.blockConcurrencyWhile(async()=>this.playerRoomReserve(await safeJson(request)));'),'check + reserve runs inside blockConcurrencyWhile');
  const c=source.slice(source.indexOf('async function createRoom('),source.indexOf('async function createPlayerRoom('));
  assert.ok(c.includes('gmToken:data.gmToken'),'GM flow still receives gmToken');
  assert.ok(source.includes('gmTokenHash:await sha256(gmToken),...(b?.playerRoom===true?{playerRoom:true'),'player fields are added only when playerRoom is true');
  assert.ok(source.includes('...((body?.playerRoom===true||old?.playerRoom===true)?{playerRoom:true}:{})'),'directory record unchanged for GM rooms');
});
