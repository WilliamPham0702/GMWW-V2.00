import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const server=fs.readFileSync('src/index.js','utf8');
const raw=fs.readFileSync('src/gmww-members-live.js','utf8');
const live=JSON.parse(raw.slice(raw.indexOf(' = ')+3).trim().replace(/;$/,''));
const start=live.indexOf('let gmRoomCallWatchBusy=false');
const end=live.indexOf('async function enterVillage()',start);
assert.ok(start>=0&&end>start,'autojoin watcher should be present in live Player Web');
const watcher=live.slice(start,end);
const memberStart=server.indexOf('  async memberPresenceInternal(body){');
const memberEnd=server.indexOf('  async memberRecordResult(body){',memberStart);
assert.ok(memberStart>=0&&memberEnd>memberStart,'member presence handler should be present');

function memberHarness(){
  const record={loginId:'chrome',currentRoomCode:null,gmCalledRoomCode:null,presenceAt:0,ready:false};
  const storage=new Map([['member:chrome',record]]);
  const context={
    normalizeLoginId:v=>String(v||'').toLowerCase(),
    normalizeRoomCode:v=>String(v||'').toUpperCase(),
    isValidRoomCode:v=>/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(String(v||'')),
    directoryMember:v=>({...v}),
    j:o=>o,Date
  };
  vm.runInNewContext('class Harness {constructor(storage){this.ctx={storage}}'+server.slice(memberStart,memberEnd)+'};globalThis.Harness=Harness;',context);
  return{record,storage,actor:new context.Harness({get:key=>Promise.resolve(storage.get(key)),put:(key,value)=>{storage.set(key,value);return Promise.resolve()}})};
}
test('GM reservation remains authoritative across null lobby heartbeats and clears on leave',async()=>{
  const {actor,storage}=memberHarness();
  await actor.memberPresenceInternal({loginId:'chrome',roomCode:'ABCDEF',ready:true,calledByGM:true});
  assert.equal(storage.get('member:chrome').gmCalledRoomCode,'ABCDEF');
  await actor.memberPresenceInternal({loginId:'chrome',roomCode:null,ready:false,preserveGmCall:true});
  assert.equal(storage.get('member:chrome').currentRoomCode,'ABCDEF');
  assert.equal(storage.get('member:chrome').ready,true);
  await actor.memberPresenceInternal({loginId:'chrome',roomCode:null,ready:false});
  assert.equal(storage.get('member:chrome').currentRoomCode,null);
  assert.equal(storage.get('member:chrome').gmCalledRoomCode,null);
});
test('Late disband cannot clear someone who was reassigned to a different room',async()=>{
  const {actor,storage}=memberHarness();
  await actor.memberPresenceInternal({loginId:'chrome',roomCode:'ABCDEF',ready:true,calledByGM:true});
  await actor.memberPresenceInternal({loginId:'chrome',roomCode:'JKLMNP',ready:true,calledByGM:true});
  const out=await actor.memberPresenceInternal({loginId:'chrome',roomCode:null,ready:false,expectedRoomCode:'ABCDEF'});
  assert.equal(out.skippedDifferentRoom,true);
  assert.equal(storage.get('member:chrome').gmCalledRoomCode,'JKLMNP');
});
test('GM wrapper explicitly records a call for all roster members',()=>{
  assert.match(server,/preserveGmCall:true/);
  assert.match(server,/calledByGM=false/);
  assert.match(server,/syncPresence\(p\.loginId,code,true,null,true\)/);
});

function webHarness({assigned='ABCDEF',players=[{loginId:'chrome',reservedByGM:true}],enabled=true,hidden=false}={}){
  const calls=[],state={token:'token',member:{loginId:'chrome'},roomCode:'',participantId:null};
  const context={
    state,Date,encodeURIComponent,
    document:{hidden},
    auth:()=>({Authorization:'Bearer token'}),
    api:async url=>{
      calls.push(url);
      if(url==='/api/members/me')return{ok:true,member:{currentRoomCode:assigned}};
      if(url.startsWith('/api/rooms/'))return{ok:true,room:{enabled},players};
      throw Error('Unexpected API: '+url);
    },
    joinRoom:async roomCode=>{calls.push('JOIN:'+roomCode);state.roomCode=roomCode;state.participantId='member:chrome';return true}
  };
  vm.runInNewContext(watcher+'\nglobalThis.followTest=followGmRoomCall;',context);
  return{state,calls,follow:context.followTest};
}
test('Player Web automatically enters its GM-reserved room and stops duplicate joins',async()=>{
  const h=webHarness();
  assert.equal(await h.follow(),true);
  assert.equal(h.state.roomCode,'ABCDEF');
  assert.equal(await h.follow(),false);
  assert.equal(h.calls.filter(v=>v==='JOIN:ABCDEF').length,1);
});
test('Never auto-join unreserved, foreign, disabled or invalid rooms',async()=>{
  for(const cfg of [
    {players:[{loginId:'chrome',reservedByGM:false}]},
    {players:[{loginId:'edge',reservedByGM:true}]},
    {enabled:false},
    {assigned:'INVALID!'},
    {hidden:true}
  ]){
    const h=webHarness(cfg);
    assert.equal(await h.follow(),false,JSON.stringify(cfg));
    assert.equal(h.calls.filter(v=>v.startsWith('JOIN:')).length,0);
  }
});
test('Player Web watcher runs on entry and during ongoing lobby polling; Player status remains a waiting room during GM setup',()=>{
  assert.ok(live.includes("finally{void followGmRoomCall()}"));
  assert.ok(live.includes("void followGmRoomCall()}"));
  assert.ok(live.includes("if(phase==='lobby'||phase==='waiting')return Number(currentRoomPlayer()?.seatId||0)>0?'PHÒNG CHỜ · ĐÃ XẾP VỊ TRÍ':'PHÒNG CHỜ · CHỜ GM'"));
  assert.match(live,/if\(!state\.roomCode\)return'SẢNH CHỜ'/);
});
