import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {chatPolicy,chatBlockedByEffects} from '../src/gmww-online-chat-policy.js';

const meta={phase:'running',cyclePhase:'morning',matchId:'match-1',cycleNight:2,cycleKey:'morning-2'};
const players={'member:a':{loginId:'a'},'member:b':{loginId:'b'}};
const policy=(rows,loginId='a',m=meta)=>chatPolicy({meta:m,players,rows,loginId});

test('frozen player is blocked in night group, but village chat reopens on morning start',()=>{
 const frozen={id:'f1',type:'frozen',loginId:'a',night:2,matchId:'match-1',effectActive:true};
 const nightMeta={...meta,cyclePhase:'night',cycleKey:'night-2'};
 const nightRuntime={completed:false,cursor:0,queue:[{id:'wolf-introduction',kind:'wolf-introduction',recognitionIds:['a','b']}]};
 const night=chatPolicy({meta:nightMeta,players,rows:[frozen],loginId:'a',runtime:nightRuntime});
 assert.equal(night.canSend,false);
 assert.equal(night.reason,'CHAT_FROZEN');
 assert.equal(policy([frozen]).canSend,true,'Morning restores village chat even before cleanup');
 const expired={...frozen,effectActive:false,expiredReason:'MORNING_START'};
 assert.equal(policy([expired]).canSend,true);
 assert.equal(policy([expired],'a',{...meta,cycleNight:3,cyclePhase:'morning'}).canSend,true);
});

test('dead/exiled players cannot send public chat, but all statuses can contact GM privately',async()=>{
 const source=readFileSync('src/index.js','utf8');
 const begin=source.indexOf('  async chatAccess(loginId,requestedChannel="room"){');
 const end=source.indexOf('  async playerChatRead(body){',begin);
 assert.ok(begin>=0&&end>begin,'Must test actual Room.chatAccess method');
 const Room=vm.runInNewContext('(class Room {'+source.slice(begin,end)+'})',{
  normalizeLoginId:id=>String(id||'').toLowerCase().replace(/^member:/,''),
  chatPolicy
 });
 const rowsState={rows:[],bans:{}};
 const room=new Room();
 room.ctx={storage:{get:async key=>{
  if(key==='meta')return meta;
  if(key==='players')return players;
  if(key==='interactions')return rowsState.rows;
  if(key==='onlineChatBans:match-1')return rowsState.bans;
  return null;
 }}};
 room.getNightRuntime=async()=>null;
 for(const effect of ['dead','expelled','frozen','mute','gm_ban']){
  rowsState.rows=effect==='gm_ban'?[]:[effect==='mute'
   ?{type:'status',statusId:'mute',loginId:'a',effectActive:true,matchId:'match-1'}
   :{type:effect,loginId:'a',effectActive:true,matchId:'match-1'}];
  rowsState.bans=effect==='gm_ban'?{a:true}:{};
  const dm=(await room.chatAccess('a','gm')).permission;
  const publicChat=(await room.chatAccess('a','room')).permission;
  assert.equal(dm.canRead,true,effect+' must read GM chat');
  assert.equal(dm.canSend,true,effect+' must send to GM');
  assert.equal(dm.channel,'gm:a');
  assert.equal(publicChat.canSend,['frozen'].includes(effect),effect+' public chat');
  if(effect==='dead'||effect==='expelled')assert.equal(publicChat.canRead,true);
 }
 const stranger=(await room.chatAccess('unjoined','gm')).permission;
 assert.equal(stranger.canSend,false,'DM still requires room membership');
 assert.equal(stranger.canRead,false);
 assert.equal(chatBlockedByEffects([{type:'dead',loginId:'a'}],'match-1','a').dead,true);
});
