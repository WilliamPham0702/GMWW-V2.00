import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const worker=fs.readFileSync('src/index.js','utf8');
const gm=fs.readFileSync('server-game/src/45-online-chat.part','utf8');
const player=fs.readFileSync('src/player-web-src/35-online-chat.part','utf8');
const compiledGM=fs.readFileSync('server-game/current/app.js','utf8');
const compiledPlayer=fs.readFileSync('src/gmww-members-live.js','utf8');

function roomMethods(first,last,extra={}){
 const begin=worker.indexOf(first),end=worker.indexOf(last,begin+first.length);
 assert.ok(begin>=0&&end>begin);
 const scope={
   crypto:{randomUUID:()=> '12345678-1234-1234-1234-123456789012'},
   j:(value,status=200)=>({...value,status}),Date,
   normalizeLoginId:id=>String(id||'').toLowerCase(),
   chatNormalizeText:s=>typeof s==='string'?s.trim():'',
   chatStorageScope:()=> 'MATCH',
   ...extra
 };
 return vm.runInNewContext('(class VoiceRoom{'+worker.slice(begin,end)+'})',scope);
}
const makeStore=()=>{
 const data=new Map();
 const storage={
   get:async k=>data.get(k),
   put:async(k,v)=>{data.set(k,v)},
   delete:async k=>{data.delete(k)},
   list:async ({prefix})=>new Map([...data].filter(([k])=>k.startsWith(prefix)))
 };
 return {data,storage};
};

test('Voice notes require valid audio and a duration not above 30 seconds',async()=>{
 const Room=roomMethods('  async chatVoiceStore(', '  async playerChatRead(');
 const {data,storage}=makeStore(),room=new Room();
 room.ctx={storage};room.chatAccess=async()=>({
   players:{'member:bob':{loginId:'bob'}},
   permission:{canRead:true,channel:'gm:bob'}
 });
 const base64='aGVsbG8=';
 await assert.rejects(()=>room.chatVoiceStore('MATCH','gm:bob',{mime:'audio/mp4',durationMs:30001,base64}));
 const result=await room.chatVoiceStore('MATCH','gm:bob',{mime:'audio/mp4',durationMs:30000,base64});
 assert.equal(result.kind,'voice');assert.equal(result.durationMs,30000);
 assert.ok(data.has('onlineChatVoice:MATCH:'+result.voiceId+':meta'));
 const read=await room.chatVoiceRead({loginId:'bob'},result.voiceId);
 assert.equal(read.base64,base64);assert.equal(read.mime,'audio/mp4');
 const wrong=await room.chatVoiceRead({loginId:'alice'},result.voiceId);
 assert.equal(wrong.status,403,'DM cannot be read by unrelated participants');
 await room.chatVoiceClear();
 assert.ok(![...data.keys()].some(k=>k.startsWith('onlineChatVoice:')));
 const gone=await room.chatVoiceRead({loginId:'bob'},result.voiceId);
 assert.equal(gone.status,404);
});

test('Game end, postgame reset and hard reset clear recorded voice, not ordinary text',()=>{
 assert.match(worker,/async gmEnd\([\s\S]*?await this\.chatVoiceClear\(\)/);
 assert.match(worker,/if\(softPostGame\)\{\s*await this\.chatVoiceClear\(\)/);
 assert.match(worker,/await this\.chatVoiceClear\(\);\s*const oldPlayers=/);
 assert.match(worker,/messages\.filter\(m=>m\?\.kind!=='voice'\)/);
});

test('GM can proactively select a player or the whole village and send in any phase',async()=>{
 const Room=roomMethods('  async gmChatSend(request,body){','  async gmChatModerate(request,body){');
 for(const phase of ['lobby','waiting','role_delivery','running']){
  const room=new Room(),{data,storage}=makeStore();room.ctx={storage};
  room.gmAuthorized=async()=>({ok:true,meta:{phase,matchId:'MATCH'}});
  room.broadcast=()=>{};
  let ret=await room.gmChatSend({}, {channel:'room',text:'Thông báo GM'});
  assert.equal(ret.ok,true,phase);
  assert.equal(data.get('onlineChat:MATCH:gm:all')?.[0]?.text,'Thông báo GM');
  data.delete('gmChatRate:MATCH:gm:bob');
  ret=await room.gmChatSend({}, {loginId:'bob',text:'Nhắn riêng'});
  assert.equal(ret.ok,false,'unknown player fails closed');
 }
 assert.match(gm,/id="gmwwGMChatTarget"/);
 assert.match(gm,/target==='room'\?\{channel:'room',text\}:\{loginId:target,text\}/);
 assert.doesNotMatch(gm,/playSceneState\.phase!=='day'\)return/);
 assert.match(gm,/playRoomApi\('\/chat\/audio\/'/);
});

test('GM village broadcasts reach Player without leaking private group chats through public events',()=>{
 assert.match(worker,/const broadcasts=players\["member:"\+loginId\]/);
 assert.match(player,/Array\.isArray\(result\.broadcasts\)/);
 assert.match(worker,/this\.broadcast\(\{type:"chat_tick",serverTime/);
 assert.doesNotMatch(worker,/this\.broadcast\(\{type:"chat_message"/);
});

test('Both runtimes include their updated source components',()=>{
 assert.ok(compiledGM.includes(gm));
 const match=compiledPlayer.match(/^export const gmwwMembersLiveScript = (.*);\s*$/s);
 assert.ok(match);
 const built=JSON.parse(match[1]);
 assert.ok(built.includes(player));
 assert.match(gm,/gmwwGMVoiceToggle/);
 assert.match(player,/gmwwChatVoiceToggle/);
});
