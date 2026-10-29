import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('src/player-web-src/35-online-chat.part','utf8');
const start=source.indexOf('function gmwwHandlePrivateRoleDisclosures(');
const end=source.indexOf('function gmwwChatClosePanel(',start);
assert.ok(start>0&&end>start);
test('Recipient inbox renders private Artifact #27 notice, deduplicates refresh and changes match',()=>{
 const seen=[],items=[];
 const inbox={children:[],hidden:true,replaceChildren(){this.children=[]},appendChild(item){this.children.push(item)}};
 const context={document:{
  getElementById:id=>id==='gmwwPrivateRoleInbox'?inbox:null,
  createElement:()=>({textContent:''})
 },toast:msg=>seen.push(msg)};
 vm.runInNewContext('let gmwwPrivateDisclosureMatch="",gmwwPrivateDisclosureSeen=new Set();'+
  source.slice(start,end)+';this.show=gmwwHandlePrivateRoleDisclosures',context);
 const notice={id:'m1',matchId:'m1',roleId:'role_guard',message:'Bảo Vệ'};
 context.show([notice],'m1');context.show([notice],'m1');
 assert.equal(seen.length,1);assert.equal(inbox.children.length,1);
 assert.equal(inbox.children[0].textContent,'Bảo Vệ');
 context.show([{...notice,matchId:'m2',id:'m2',message:'Tiên Tri'}],'m2');
 assert.equal(seen.length,2);assert.equal(inbox.children.length,1);
 context.show([notice],'m2');
 assert.equal(inbox.children.length,0,'old-match notice must not display');
 assert.equal(inbox.hidden,true);
});
