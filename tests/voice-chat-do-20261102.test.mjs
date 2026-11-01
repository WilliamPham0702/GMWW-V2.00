import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {
 gmwwVoiceDecode,gmwwVoiceReadJson,gmwwVoiceStorageKey,VOICE_MAX_MS,
 VOICE_MAX_BYTES,VOICE_ROOM_MAX,VOICE_TTL_MS,gmwwVoicePublicMeta
} from '../src/gmww-chat-voice.js';
import {chatStorageScope} from '../src/gmww-online-chat-policy.js';

const mp4=Buffer.concat([Buffer.from([0,0,0,24]),Buffer.from('ftyp'),Buffer.alloc(128)]);
const webm=Buffer.concat([Buffer.from([0x1a,0x45,0xdf,0xa3]),Buffer.alloc(128)]);
const voice=(bytes=mp4,mime='audio/mp4',durationMs=2_000)=>({base64:bytes.toString('base64'),mime,durationMs});
test('voice decoder accepts short MP4/WebM with magic bytes and rejects spoofed or oversized media',()=>{
 assert.equal(gmwwVoiceDecode(voice(mp4))?.bytes.length,mp4.length);
 assert.equal(gmwwVoiceDecode(voice(webm,'audio/webm'))?.mime,'audio/webm');
 assert.equal(gmwwVoiceDecode(voice(mp4,'audio/ogg')),null);
 assert.equal(gmwwVoiceDecode(voice(mp4,'audio/mp4',30001)),null);
 assert.equal(gmwwVoiceDecode(voice(mp4,'audio/mp4',1)),null);
 assert.equal(gmwwVoiceDecode(voice(Buffer.alloc(VOICE_MAX_BYTES+1))),null);
 assert.equal(gmwwVoiceDecode({...voice(),base64:'@@@@'}),null);
 assert.equal(VOICE_MAX_MS,30000);
});
test('voice body reader enforces size even without valid Content-Length',async()=>{
 const valid=new Request('https://example.test',{method:'POST',body:JSON.stringify(voice())});
 assert.equal((await gmwwVoiceReadJson(valid)).mime,'audio/mp4');
 const tooLarge=new Request('https://example.test',{method:'POST',body:'x'.repeat(710001)});
 assert.equal(await gmwwVoiceReadJson(tooLarge),null);
 const malformed=new Request('https://example.test',{method:'POST',body:'broken'});
 assert.equal(await gmwwVoiceReadJson(malformed),null);
});
function roomHarness(){
 const source=readFileSync('src/index.js','utf8');
 const start=source.indexOf('  async chatVoicePersist('),end=source.indexOf('  async gmChatRead(request){',start);
 assert.ok(start>0&&end>start,'Test actual voice DO methods');
 const storage=new Map(),events=[];
 const Room=vm.runInNewContext('(class Room {'+source.slice(start,end)+'})',{
  crypto:webcrypto,Response,Date,Uint8Array,Number,String,Math,chatStorageScope,
  gmwwVoiceStorageKey,gmwwVoicePublicMeta,gmwwVoiceReadJson,gmwwVoiceDecode,
  VOICE_TTL_MS,VOICE_ROOM_MAX,
  normalizeLoginId:x=>String(x||'').toLowerCase(),
  j:(x,status=200)=>Response.json(x,{status}),
 });
 const room=new Room(),meta={phase:'running',cyclePhase:'morning',matchId:'M1',cycleKey:'day1'};
 room.ctx={storage:{
  get:async key=>storage.get(key),
  put:async (key,value)=>storage.set(key,value),
  delete:async key=>storage.delete(key),
  list:async({prefix,limit})=>new Map([...storage].filter(([k])=>k.startsWith(prefix)).slice(0,limit))
 }};
 room.broadcast=e=>events.push(e);
 let allow=true,read=true,channel='day';
 room.chatAccess=async(id,requested)=>({meta,
  players:{'member:a':{displayName:'A'}},
  permission:requested==='gm'
   ?{canRead:read,canSend:allow,channel:'gm:a',scope:'gm',reason:'CHAT_BLOCKED'}
   :{canRead:read,canSend:allow,channel,scope:'village',reason:'CHAT_BLOCKED'}
 });
 room.gmAuthorized=async()=>({ok:true,meta});
 return {room,storage,events,meta,setAccess:(a,r=true,c='day')=>{allow=a;read=r;channel=c}};
}
test('room DO stores clip bytes outside chat, never broadcasts private voice payload',async()=>{
 const {room,storage,events}=roomHarness(),clip=voice();
 const sent=await room.playerChatVoiceSend({...clip,loginId:'a',channel:'room'});
 assert.equal(sent.status,200);
 const id=(await sent.json()).id;
 const history=storage.get('onlineChat:M1:day');
 assert.equal(history.length,1);
 assert.equal(history[0].voice.durationMs,2_000);
 assert.equal(history[0].base64,undefined);
 assert.equal(history[0].bytes,undefined);
 assert.equal(storage.get(gmwwVoiceStorageKey(id)).bytes.length,mp4.length);
 assert.deepEqual(events.map(x=>x.type),['chat_tick']);
 assert.ok(!JSON.stringify(events).includes('base64'));
 const read=await room.playerChatVoiceRead({loginId:'a',channel:'room',id});
 assert.equal(read.status,200);
 assert.equal(read.headers.get('cache-control'),'private, no-store');
 assert.deepEqual(Buffer.from(await read.arrayBuffer()),mp4);
});
test('denied room/channel, unauthorized GM and expired clips cannot be played',async()=>{
 const {room,storage,setAccess,meta}=roomHarness();
 const resp=await room.playerChatVoiceSend({...voice(),loginId:'a',channel:'room'});
 const id=(await resp.json()).id;
 setAccess(false,false);
 assert.equal((await room.playerChatVoiceRead({loginId:'a',channel:'room',id})).status,403);
 assert.equal((await room.playerChatVoiceSend({...voice(),loginId:'a',channel:'room'})).status,403);
 setAccess(true,true,'night:wolf');
 assert.equal((await room.playerChatVoiceRead({loginId:'a',channel:'room',id})).status,404,'A changed secret channel cannot read old audio');
 setAccess(true,true);
 room.gmAuthorized=async()=>({ok:false,response:Response.json({error:'UNAUTHORIZED'},{status:401})});
 assert.equal((await room.gmChatVoiceRead(new Request('https://test'),id)).status,401);
 room.gmAuthorized=async()=>({ok:true,meta});
 storage.get(gmwwVoiceStorageKey(id)).expiresAt=Date.now()-1;
 assert.equal((await room.gmChatVoiceRead(new Request('https://test'),id)).status,404);
});
test('delivery is attached to authenticated chat endpoints and iPhone UI includes explicit preview',()=>{
 const worker=readFileSync('src/index.js','utf8'),player=readFileSync('src/player-web-src/35-online-chat.part','utf8'),
  gm=readFileSync('server-game/src/45-online-chat.part','utf8');
 assert.match(worker,/playerRoomVoiceUpload\(env/);
 assert.match(worker,/members\/session/);
 assert.match(worker,/async gmChatVoiceRead\(/);
 assert.match(worker,/this\.chatAccess\(/);
 assert.doesNotMatch(worker,/broadcast\(\{type:\s*['"]chat_voice/);
 for(const source of [player,gm]){
  assert.match(source,/getUserMedia/);
  assert.match(source,/MediaRecorder/);
  assert.match(source,/30_?000|30000/);
  assert.match(source,/512\*1024/);
  assert.match(source,/new Blob\(/);
  assert.match(source,/new Audio|createElement\('audio'\)/);
  assert.match(source,/chat\/voice/);
 }
 assert.match(player,/gmwwVoiceShowDraft/);
 assert.match(gm,/gmwwGmVoiceShowDraft/);
});
