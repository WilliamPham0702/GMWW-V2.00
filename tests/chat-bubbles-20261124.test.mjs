import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Online chat bubbles are wired into GM Server and Player Web bundles',()=>{
  const gm=read('server-game/current/app.js'),pw=read('src/gmww-members-live.js');
  assert.match(gm,/function gmwwCbFeed/);assert.match(gm,/gmwwCbPoll\(\)/);assert.match(gm,/gmwwGMVoiceCard\(item\)/);
  assert.match(pw,/function gmwwCbFeed/);assert.match(pw,/gmwwCbFeed\(room\+'\|'/);assert.match(pw,/gmwwChatVoiceCard\(item\)/);
});
test('gmwwCbFeed: first load only sets baseline, later fresh messages show once, system/GM skipped',()=>{
  const src=read('src/player-web-src/35-online-chat/40-chat-bubbles.part'),shown=[];
  const ctx={Date,Map,Set,Array,Number,String,gmwwCbShow:x=>shown.push(x.id)};
  const code=src.replace(/function gmwwCbShow[\s\S]*?\n\}\n(?=\/\/ Nhận)/,'');
  vm.runInNewContext(code+';this.feed=gmwwCbFeed;',ctx);
  const now=Date.now(),m=(id,o={})=>({id,senderId:'a',text:'x',at:now,...o});
  ctx.feed('r|c',[m('old')]);assert.deepEqual(shown,[]);
  ctx.feed('r|c',[m('old'),m('n1'),m('s',{system:true}),m('g',{isGM:true}),m('stale',{at:now-60000})]);
  assert.deepEqual(shown,['n1']);
  ctx.feed('r|c',[m('n1')]);assert.deepEqual(shown,['n1']);
});
