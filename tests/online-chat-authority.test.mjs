import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chatPolicy,chatNormalizeText,chatBlockedByEffects} from '../src/gmww-online-chat-policy.js';

const players=Object.fromEntries(['wolf_a','wolf_b','wolf_c','guard','villager'].map(x=>['member:'+x,{loginId:x,displayName:x}]));
const meta={phase:'running',cyclePhase:'morning',cycleNight:1,cycleKey:'morning-1',matchId:'MATCH'};
const base={meta,players,rows:[],runtime:null,loginId:'wolf_a'};
const night={...meta,cyclePhase:'night',cycleKey:'night-1'};
const wolfTurn={completed:false,cursor:0,queue:[{id:'wolf-introduction',kind:'wolf-introduction',recognitionIds:['wolf_a','wolf_b','wolf_c']}]};
test('Online chat day: living players can message, dead, expelled, GM-banned and artifact-mute cannot',()=>{
  assert.deepEqual(chatPolicy(base).channel,'day');
  assert.equal(chatPolicy(base).canSend,true);
  for(const [effect,rows] of [
    ['dead',[{type:'dead',loginId:'wolf_a',effectActive:true}]],
    ['expelled',[{type:'expelled',loginId:'wolf_a',effectActive:true}]],
    ['mute',[{type:'status',statusId:'mute',loginId:'wolf_a',effectActive:true}]]
  ]){const p=chatPolicy({...base,rows});assert.equal(p.canRead,true,effect);assert.equal(p.canSend,false,effect)}
  // A frozen participant wakes up with day chat restored, even if cleanup is delayed.
  assert.equal(chatPolicy({...base,rows:[{type:'frozen',loginId:'wolf_a',effectActive:true}]}).canSend,true);
  assert.equal(chatPolicy({...base,bans:{wolf_a:true}}).canSend,false);
  assert.equal(chatPolicy({...base,rows:[{type:'status',statusId:'mute',loginId:'wolf_a',effectActive:false}]}).canSend,true);
  assert.equal(chatBlockedByEffects([{type:'status',statusId:'mute',loginId:'wolf_a',expiresAt:'2000-01-01T00:00:00Z'}],'MATCH','wolf_a').mute,false);
});
test('Online chat night: only shared active role-group members can read their channel',()=>{
  const wolf=chatPolicy({...base,meta:night,runtime:wolfTurn}),other=chatPolicy({...base,meta:night,runtime:wolfTurn,loginId:'villager'});
  assert.equal(wolf.canRead,true);assert.equal(wolf.canSend,true);
  assert.equal(wolf.scope,'secret');assert.match(wolf.channel,/^night:night-1:wolf-introduction:wolves$/);
  assert.equal(other.canRead,false);assert.equal(other.channel,null);
  const mute=chatPolicy({...base,meta:night,runtime:wolfTurn,rows:[{type:'status',statusId:'mute',loginId:'wolf_a',effectActive:true}]});
  assert.equal(mute.canRead,true);assert.equal(mute.canSend,false);
  const dead=chatPolicy({...base,meta:night,runtime:wolfTurn,rows:[{type:'dead',loginId:'wolf_a',effectActive:true}]});
  assert.equal(dead.canRead,false);
  const fresh=chatPolicy({...base,meta:night,runtime:wolfTurn,rows:[{type:'dead',loginId:'wolf_b',effectActive:true},{type:'dead',loginId:'wolf_c',effectActive:true}]});
  assert.equal(fresh.canRead,false,'a lone living wolf never gets a group chat');
});
test('Night role-group composite turns never bridge unrelated roles; solo role has no chat',()=>{
  const turn={completed:false,cursor:0,queue:[{id:'roles-12',kind:'role-group',roles:[{roleId:'role_guard',loginIds:['guard']},{roleId:'role_seer',loginIds:['wolf_a','wolf_b']}]}]};
  assert.equal(chatPolicy({...base,meta:night,runtime:turn,loginId:'guard'}).canRead,false);
  assert.match(chatPolicy({...base,meta:night,runtime:turn,loginId:'wolf_a'}).channel,/role:role_seer$/);
  assert.equal(chatPolicy({...base,meta:night,runtime:turn,loginId:'villager'}).canRead,false);
  const later={...night,cycleKey:'night-2'};
  assert.notEqual(chatPolicy({...base,meta:later,runtime:turn}).channel,chatPolicy({...base,meta:night,runtime:turn}).channel);
  assert.equal(chatPolicy({...base,meta:night,runtime:{...turn,completed:true}}).canRead,false);
});
test('Messages are plain text, short, and private room chat never broadcasts content',()=>{
  assert.equal(chatNormalizeText('  hello\nworld  '),'hello world');
  assert.equal(chatNormalizeText('x'.repeat(1000)).length,280);
  const worker=fs.readFileSync('src/index.js','utf8'),player=fs.readFileSync('src/player-web-src/35-online-chat.part','utf8');
  assert.match(worker,/async playerChatSend\(/);
  assert.match(worker,/this\.broadcast\(\{type:"chat_tick",serverTime/);
  assert.doesNotMatch(worker,/this\.broadcast\(\{type:"chat_message"/);
  assert.match(worker,/\/members\/session/);
  assert.match(player,/text\.textContent|msg\.textContent/);
  assert.match(player,/chat_tick|gmwwChatRefresh/);
  assert.doesNotMatch(player,/new SpeechSynthesisUtterance/);
});
