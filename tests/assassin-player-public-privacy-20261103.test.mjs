import {workerSource} from '../.github/scripts/worker-source.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {playerSafeInteraction,publicInteractionReceipt,publicChatNotices} from '../src/gmww-online-chat-policy.js';

const meta={phase:'running',cyclePhase:'morning',matchId:'privacy-m1'};
const players={
  'member:adung':{displayName:'A Dũng'},
  'member:quyen':{displayName:'Quyền'}
};
const mark={id:'mark-1',type:'assassin_mark',matchId:'privacy-m1',loginId:'adung',
  actorId:'quyen',source:'gm',gmChoice:'👍',actionId:'action_assassin_mark',
  effectName:'Sát Thủ Quyền',message:'Sát Thủ Quyền đánh dấu bạn',status:'responded',
  response:'👎',effectActive:false,night:1,cycleKey:'night-1',
  createdAt:'2026-11-03T08:00:00.000Z',respondedAt:'2026-11-03T09:00:00.000Z'};

test('public bulletin keeps a mark and verified death without revealing the actor',()=>{
  const fatal={id:'fatal',type:'dead',matchId:mark.matchId,loginId:mark.loginId,
    actorId:mark.actorId,source:'assassin',actionId:mark.actionId,effectActive:true};
  const notices=publicChatNotices(meta,players,[mark,fatal]);
  assert.deepEqual(notices.map(x=>x.text),[
    'A Dũng đã bị Sát Thủ chọn.',
    'Chia buồn A Dũng đã lựa chọn sai và đã chết.'
  ]);
  assert.ok(notices[0].at<notices[1].at);
  assert.equal(notices[0].senderName,'Thông cáo Làng');
  assert.doesNotMatch(JSON.stringify(notices),/Quyền|quyen|actorId|gmChoice|👍|action_assassin_mark/);
  assert.deepEqual(publicChatNotices({...meta,cyclePhase:'night'},players,[mark,fatal]),[]);
});

test('pending mark remains visible with subsequent successful response',()=>{
  const waiting=publicChatNotices(meta,players,[{...mark,status:'pending',effectActive:true}]);
  assert.deepEqual(waiting.map(x=>x.text),['A Dũng đã bị Sát Thủ chọn.']);
  const success=publicChatNotices(meta,players,[{...mark,response:'👍'}]);
  assert.deepEqual(success.map(x=>x.text),[
    'A Dũng đã bị Sát Thủ chọn.',
    'Chúc mừng A Dũng đã lựa chọn đúng và tiếp tục sống.'
  ]);
  assert.equal(waiting[0].id,success[0].id,'first event is stable after status changes');
  assert.doesNotMatch(JSON.stringify([...waiting,...success]),/Quyền|quyen|actorId|gmChoice/);
});

test('authenticated Player Web interaction hides actor, GM choice and secret metadata',()=>{
  const exposed=playerSafeInteraction(mark);
  assert.equal(exposed.type,'assassin_mark');
  assert.equal(exposed.id,mark.id);
  assert.equal(exposed.status,'responded');
  assert.deepEqual(exposed.options,['👍','👎']);
  assert.doesNotMatch(JSON.stringify(exposed),/Quyền|Sát Thủ|quyen|gmChoice|actorId|action_assassin_mark|source/);
  const fatal=playerSafeInteraction({id:'fatal',type:'dead',loginId:'adung',
    source:'assassin',actorId:'quyen',actionId:'action_assassin_mark',
    message:'Sát Thủ Quyền giết A Dũng',effectActive:true});
  assert.equal(fatal.message,'Bạn đã chết.');
  assert.doesNotMatch(JSON.stringify(fatal),/Quyền|Sát Thủ|quyen|actorId|action_assassin_mark|source/);
});

test('WebSocket broadcasts a generic response receipt without secret role or choice',()=>{
  const publicEvent={type:'player_interaction_response',
    interaction:publicInteractionReceipt(mark),serverTime:1700000000000};
  assert.deepEqual(publicEvent.interaction,{
    id:'mark-1',loginId:'adung',status:'responded',effectActive:false
  });
  assert.doesNotMatch(JSON.stringify(publicEvent),/assassin|Sát Thủ|Quyền|quyen|gmChoice|👍|👎|actionId|actorId|assassinOutcome/);
  assert.equal(publicInteractionReceipt({id:'normal',type:'expelled',loginId:'adung'}).type,'expelled');
});

test('Worker strips Assassin actor details from /me, direct response and broadcast',()=>{
  const source=workerSource();
  assert.match(source,/interactions=rows\.filter[\s\S]*?\.slice\(-10\)\.map\(playerSafeInteraction\)/);
  assert.match(source,/const effects=Object\.values\(latest\)\.map\(playerSafeInteraction\)/);
  assert.match(source,/if\(row\.status==="responded"\)return j\(\{ok:true,interaction:playerSafeInteraction\(row\)/);
  assert.match(source,/const socketResponse=publicInteractionReceipt\(row\)/);
  assert.match(source,/player_interaction_response",interaction:socketResponse,\s*serverTime:Date\.now\(\)/);
  assert.doesNotMatch(source,/player_interaction_response",interaction:socketResponse,\s*assassinOutcome/);
  assert.match(source,/interaction:socketResponse/);
  assert.doesNotMatch(source,/player_interaction_response",interaction:\{\.\.\.row,gmChoice:undefined\}/);
});
