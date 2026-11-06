import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {buildActionBody,targetsRequired,actionNeedsDirection,actionNeedsChoice} from '../assets/village/arena-3d/player-actions.mjs';
const read=f=>fs.readFileSync(new URL(f,import.meta.url),'utf8');
const me={room:{matchId:'m1',cycleKey:'night-2'}};
const one={key:'k1',actionId:'action_protect',name:'Bảo vệ',targetCount:1};
test('single-target action builds the exact body the Server action API validates',()=>{
  const b=buildActionBody({me,action:one,targets:['member:an'],clientEventId:'e1'});
  assert.deepEqual(b,{matchId:'m1',cycleKey:'night-2',actionKey:'k1',targetIds:['an'],clientEventId:'e1'});
});
test('wrong target count is rejected before sending',()=>{
  assert.throws(()=>buildActionBody({me,action:one,targets:[],clientEventId:'e'}),/1 mục tiêu/);
  assert.throws(()=>buildActionBody({me,action:{...one,targetCount:2},targets:['member:a'],clientEventId:'e'}),/2 mục tiêu/);
});
test('transfer bite: no targets, direction left/right/none required',()=>{
  const a={key:'t',actionId:'action_transfer_bite',targetCount:1};
  assert.equal(targetsRequired(a),0);assert.ok(actionNeedsDirection(a));
  assert.throws(()=>buildActionBody({me,action:a,targets:[],clientEventId:'e'}),/hướng/);
  assert.equal(buildActionBody({me,action:a,targets:[],direction:'none',clientEventId:'e'}).direction,'none');
});
test('fire wolf bite needs left/right; assassin needs thumbs choice',()=>{
  const f={key:'f',actionId:'action-fire-wolf-bite',targetCount:1};
  assert.equal(buildActionBody({me,action:f,targets:['member:b'],direction:'left',clientEventId:'e'}).direction,'left');
  const s={key:'s',actionId:'action_assassin_mark',targetCount:1};
  assert.ok(actionNeedsChoice(s));
  assert.throws(()=>buildActionBody({me,action:s,targets:['member:b'],clientEventId:'e'}),/👍/);
  assert.equal(buildActionBody({me,action:s,targets:['member:b'],choice:'👎',clientEventId:'e'}).assassinChoice,'👎');
});
test('no match/cycle means no action is sent',()=>{
  assert.throws(()=>buildActionBody({me:{room:{}},action:one,targets:['member:a'],clientEventId:'e'}),/Chưa vào ván/);
});
test('3D Player UI uses only the player /me and /action APIs, never GM endpoints or tokens',()=>{
  const m=read('../assets/village/arena-3d/player-actions.mjs'),live=read('../assets/village/arena-3d/live.mjs');
  assert.match(m,/'\/me'/);assert.match(m,/'\/action'/);
  assert.doesNotMatch(m,/\/gm\/|gmToken|arena-staging/);
  assert.match(live,/view'\)==='player'/);
  assert.match(live,/playerHud\?\.handlePick\(id\)/);
  assert.match(live,/playerHud\?\.scheduleRefresh\(\)/);
});
import {pendingPrompts,promptOptions,buildRespondBody} from '../assets/village/arena-3d/player-actions.mjs';
test('pending private prompts: only unanswered, active, answerable ones; respond body validated',()=>{
  const list=[{id:'a',status:'responded',options:['OK']},{id:'b',effectActive:false,requireAck:true},
    {id:'c',type:'assassin_mark',options:['👍','👎'],requireResponse:true},{id:'d',requireAck:true},{id:'e',message:'x'}];
  const p=pendingPrompts(list);
  assert.deepEqual(p.map(x=>x.id),['c','d']);
  assert.deepEqual(promptOptions(p[1]),['OK']);
  assert.deepEqual(buildRespondBody(p[0],'👎'),{interactionId:'c',response:'👎'});
  assert.throws(()=>buildRespondBody(p[0],'OK'),/không hợp lệ/);
  assert.match(read('../assets/village/arena-3d/player-actions.mjs'),/'\/interaction\/respond'/);
});
