import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {playerSafeInteraction,publicChatNotices} from '../src/gmww-online-chat-policy.js';

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

test('public bulletin still announces verified Assassin death but not actor or role',()=>{
  const fatal={id:'fatal',type:'dead',matchId:mark.matchId,loginId:mark.loginId,
    actorId:mark.actorId,source:'assassin',actionId:mark.actionId,effectActive:true};
  const notices=publicChatNotices(meta,players,[mark,fatal]);
  assert.equal(notices.length,1,'do not duplicate assassin death notice');
  assert.equal(notices[0].text,'Chia buồn A Dũng đã lựa chọn sai và đã chết.');
  assert.equal(notices[0].senderName,'Thông cáo Làng');
  assert.doesNotMatch(JSON.stringify(notices),/Quyền|Sát Thủ|quyen|actorId|gmChoice|👍/);
  assert.deepEqual(publicChatNotices({...meta,cyclePhase:'night'},players,[mark,fatal]),[]);
});

test('pending mark and successful response disclose only public outcome',()=>{
  const waiting=publicChatNotices(meta,players,[{...mark,status:'pending',effectActive:true}]);
  assert.equal(waiting[0].text,'A Dũng đã bị đánh dấu.');
  const success=publicChatNotices(meta,players,[{...mark,response:'👍'}]);
  assert.equal(success[0].text,'Chúc mừng A Dũng đã lựa chọn đúng và tiếp tục sống.');
  assert.doesNotMatch(JSON.stringify([...waiting,...success]),/Quyền|Sát Thủ|quyen/);
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

test('Worker strips Assassin actor details from /me, direct response and broadcast',()=>{
  const source=readFileSync('src/index.js','utf8');
  assert.match(source,/interactions=rows\.filter[\s\S]*?\.slice\(-10\)\.map\(playerSafeInteraction\)/);
  assert.match(source,/const effects=Object\.values\(latest\)\.map\(playerSafeInteraction\)/);
  assert.match(source,/if\(row\.status==="responded"\)return j\(\{ok:true,interaction:playerSafeInteraction\(row\)/);
  assert.match(source,/const socketResponse=isAssassin\?[\s\S]*?\{id:row\.id,type:"assassin_mark",loginId,status:"responded",effectActive:false\}/);
  assert.match(source,/interaction:socketResponse/);
  assert.doesNotMatch(source,/player_interaction_response",interaction:\{\.\.\.row,gmChoice:undefined\}/);
});
