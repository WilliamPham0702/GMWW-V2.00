import {workerSource} from '../.github/scripts/worker-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {statusTagsFor,publicVillageStatusTagsFor} from '../src/gmww-public-room-contract.js';
import {publicChatNotices} from '../src/gmww-online-chat-policy.js';

const meta={phase:'running',cyclePhase:'morning',cycleNight:1,matchId:'M',statusDisplay:{}};
const players={'member:a':{loginId:'a',displayName:'A Dũng'},'member:b':{loginId:'b',displayName:'Quyên'},
 'member:c':{loginId:'c',displayName:'Nô'},'member:d':{loginId:'d',displayName:'An'}};
const when='2026-11-02T00:00:00.000Z';
const rows=[
 {id:'dead1',type:'dead',loginId:'a',matchId:'M',effectActive:true,createdAt:when},
 {id:'exile1',type:'expelled',loginId:'b',matchId:'M',effectActive:true,createdAt:when},
 {id:'mark1',type:'assassin_mark',loginId:'c',actorId:'d',matchId:'M',effectActive:true,
  status:'pending',gmChoice:'👍',createdAt:when},
 {id:'private1',type:'effect_notice',loginId:'b',matchId:'M',actionId:'action_wolf_bite',
  actorId:'d',message:'hidden wolf target'},
 {id:'stale1',type:'dead',loginId:'a',matchId:'previous',effectActive:true}
];
test('Server-confirmed daytime death/exile/mark show without exposing night secrets',()=>{
 const statuses=id=>publicVillageStatusTagsFor(rows,meta,id,players).map(x=>x.statusId);
 assert.deepEqual(statuses('a'),['dead']);
 assert.deepEqual(statuses('b'),['expelled']);
 assert.deepEqual(statuses('c'),['marked']);
 assert.deepEqual(statusTagsFor(rows,meta,'a',players),[],'GM-configurable private visuals unchanged');
 assert.deepEqual(publicVillageStatusTagsFor(rows,{...meta,cyclePhase:'night'},'c',players),[]);
 assert.deepEqual(publicVillageStatusTagsFor(rows,{...meta,matchId:'other'},'b',players),[]);
});
test('Village announcements are authorized, named and not revealed during night',()=>{
 const notices=publicChatNotices(meta,players,rows);
 assert.equal(notices.length,3);
 for(const value of ['Đêm qua A Dũng đã chết.','Quyên đã bị đuổi khỏi làng.',
   'Nô đã bị Sát Thủ chọn.'])assert.ok(notices.some(n=>n.text===value),value);
 assert.ok(notices.every(n=>n.system&&n.senderName==='Thông cáo Làng'));
 assert.equal(publicChatNotices({...meta,cyclePhase:'night'},players,rows).length,0);
 assert.equal(publicChatNotices({...meta,phase:'lobby'},players,rows).length,0);
 assert.ok(!JSON.stringify(notices).includes('hidden wolf target'));
 assert.ok(!JSON.stringify(notices).includes('gmChoice'));
});
test('Assassin mark remains in public village history before the verified outcome',()=>{
 const done={...rows[2],status:'responded',effectActive:false,respondedAt:'2026-11-02T01:00:00.000Z',response:'👍'};
 const success=publicChatNotices(meta,players,[done]);
 assert.equal(success.length,2);
 assert.deepEqual(success.map(n=>n.text),[
   'Nô đã bị Sát Thủ chọn.',
   'Chúc mừng Nô đã lựa chọn đúng và tiếp tục sống.'
 ]);
 const death={id:'dead-assassin',type:'dead',loginId:'c',matchId:'M',source:'assassin',
   effectActive:true,createdAt:'2026-11-02T01:00:01.000Z'};
 const failed=publicChatNotices(meta,players,[{...done,response:'👎'},death]);
 assert.equal(failed.length,2,'the fatal interaction must not duplicate the outcome');
 assert.deepEqual(failed.map(n=>n.text),[
   'Nô đã bị Sát Thủ chọn.',
   'Chia buồn Nô đã lựa chọn sai và đã chết.'
 ]);
 assert.ok(failed[0].at<failed[1].at,'mark precedes the answered outcome');
 assert.notEqual(failed[0].id,failed[1].id,'both messages have stable unique IDs');
 const repeated=publicChatNotices(meta,players,[{...done,response:'👎'},death]);
 assert.deepEqual(repeated,failed,'refreshing the chat keeps both events stable');
 // The generic role may be named, but its owner/actor and secret GM sign must not leak.
 for(const notices of [success,failed]){
  const payload=JSON.stringify(notices);
  assert.doesNotMatch(payload,/Sát Thủ An|role_assassin|actorId|gmChoice|member:d/);
  assert.ok(!payload.includes('An'),'The actor name is secret');
  assert.ok(notices.every(n=>n.system&&n.senderName==='Thông cáo Làng'));
 }
 const pending=publicChatNotices(meta,players,[{...done,status:'pending',effectActive:true}]);
 assert.deepEqual(pending.map(n=>n.text),['Nô đã bị Sát Thủ chọn.']);
 const incomplete=publicChatNotices(meta,players,[{...done,gmChoice:''}]);
 assert.deepEqual(incomplete.map(n=>n.text),['Nô đã bị Sát Thủ chọn.']);
 assert.deepEqual(publicChatNotices({...meta,cyclePhase:'night'},players,[done]),[]);
});
test('Player Web honors confirmed public labels and red authoritative notices',()=>{
 const web=readFileSync('src/player-web-src/35-online-chat.part','utf8');
 const village=readFileSync('src/player-web-src/20-village-and-profile.part','utf8');
 const ws=readFileSync('src/player-web-src/30-rooms-and-realtime.part','utf8');
 const worker=workerSource();
 assert.match(worker,/publicVillageStatusTagsFor\(interactions,meta,p\?\.loginId,players\)/);
 assert.match(village,/showLegacy=id=>viewStatus\[id\]===true\|\|/);
 assert.match(ws,/d\.type==='player_interaction_response'/);
 assert.match(web,/item\.isGM===true\|\|item\.system===true\?'#ff5353'/);
 assert.match(web,/\.gmww-chat-day #gmwwChatPanel\.open #gmwwChatLines\{height:min\(270px/);
 assert.match(web,/#gmwwChatPanel\.open #gmwwChatLines\{display:block;height:90px/);
 assert.match(web,/footer\.classList\.toggle\('gmww-chat-day'/);
 assert.match(web,/if\(panel\?\.contains\(event\.target\)\)return/);
 const a=web.indexOf('function gmwwChatColor(id){'),b=web.indexOf('const gmwwChatAudioOff=',a);
 const colors=vm.runInNewContext('('+web.slice(a,b)+')',
   {state:{players:['a','b','c','d'].map(loginId=>({loginId}))},Set,String,Math});
 assert.equal(new Set(['a','b','c','d'].map(colors)).size,4);
});
test('Canvas runner is paused for every battle avatar, with RAF only during movement',()=>{
 const village=readFileSync('assets/village/village.mjs','utf8');
 const runtime=readFileSync('assets/characters/gmww40/runtime.js','utf8');
 assert.match(village,/paused:battleStatic&&!hanging\?true/);
 assert.match(runtime,/function hasActiveMotion\(\)/);
 assert.match(runtime,/if\(!hasActiveMotion\(\)\)\{last=0;return;\}/);
 const elements=[];
 function element(kind){
  const kids=[];const e={kind,dataset:{},children:kids,style:{setProperty(){}},
    isConnected:true,append(c){kids.push(c)},replaceChildren(...items){kids.splice(0,kids.length,...items)},
    get firstElementChild(){return kids[0]},setAttribute(){},
    querySelector(){return kids.find(x=>x.dataset?.characterRenderer==='gmww40-atlas')||null},
    closest(){return null},getContext(){return{clearRect(){},drawImage(){}}}};
  elements.push(e);return e;
 }
 class FakeImage{constructor(){this.complete=true;this.naturalWidth=100}addEventListener(){}}
 let next=0;const frames=new Map(),cancelled=[];
 const scope={document:{hidden:false,addEventListener(){},createElement:element},
   Image:FakeImage,Date,Math,Number,String,
   requestAnimationFrame(fn){const id=++next;frames.set(id,fn);return id},
   cancelAnimationFrame(id){cancelled.push(id);frames.delete(id)}};
 vm.runInNewContext(runtime,scope,{timeout:2000});
 const motion=scope.GMWW_SHARED_MOTION,host=element('host');
 const mounted=motion.mount(host,{characterId:'character-01',
  command:{characterId:'character-01',state:'idle',paused:true},assetBase:'/assets'});
 assert.ok(mounted);assert.equal(frames.size,0,'no idle RAF loop while battle is stationary');
 assert.equal(motion.update(host,{characterId:'character-01',state:'walking',paused:false}),true);
 assert.equal(frames.size,1,'walking resumes in lobby');
 assert.equal(motion.update(host,{characterId:'character-01',state:'idle',paused:true}),true);
 assert.equal(frames.size,0,'back to battle pauses animation');assert.ok(cancelled.length>0);
});
