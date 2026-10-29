import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('src/player-web-src/35-online-chat.part','utf8');
const start=source.indexOf('async function gmwwOnlineSubmit(){');
const end=source.indexOf('function gmwwOnlineIconDown(',start);
assert.ok(start>=0&&end>start);
for(const [name,response,message] of [
 ['day Artifact',{result:{private:true,confirmed:true,message:'ĐÚNG'}},'ĐÚNG'],
 ['night divination',{revelation:{message:'Tiên Tri',targets:[{roleId:'private-role'}]}},'Tiên Tri']
])test('Player Web displays private '+name+' result in readable form',async()=>{
 const toasts=[],action={key:'test',targetCount:1,name:'Soi'};
 const context={state:{roomCode:'LOCAL',room:{phase:'running'},onlineActions:[action]},
  gmwwOnlinePick:{action,targets:['target']},gmwwOnlinePeople:()=>[],confirm:()=>true,
  gmwwOnlineStop:()=>{},toast:x=>toasts.push(x),api:async()=>response,auth:()=>({}),
  refreshPrivateRole:async()=>{}};
 await vm.runInNewContext(source.slice(start,end)+';gmwwOnlineSubmit()',context);
 assert.ok(toasts.includes('Kết quả: '+message),'missing private answer: '+JSON.stringify(toasts));
 assert.ok(toasts.every(x=>!x.includes('roleId')&&!x.includes('confirmed')&&!x.includes('private-role')));
});
