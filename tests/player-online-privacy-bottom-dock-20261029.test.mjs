import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {statusTagsFor} from '../src/gmww-public-room-contract.js';
const read=path=>readFileSync(path,'utf8'),worker=read('src/index.js'),
  village=read('src/player-web-src/20-village-and-profile.part'),
  ws=read('src/player-web-src/30-rooms-and-realtime.part'),
  chat=read('src/player-web-src/35-online-chat.part'),
  session=read('src/player-web-src/00-bootstrap-and-session.part');
const has=(src,fragment)=>assert.ok(src.includes(fragment),'Expected fragment: '+fragment);

test('P0: legacy and night-action statuses require explicit GM display approval',()=>{
  const rows=[{type:'dead',loginId:'a',effectActive:true,matchId:'M'},
    {type:'frozen',loginId:'a',effectActive:true,matchId:'M'},
    {type:'status',loginId:'a',statusId:'wolf_bitten',effectActive:true,matchId:'M'}];
  const meta={matchId:'M',phase:'running',cyclePhase:'morning',statusDisplay:{}};
  assert.deepEqual(statusTagsFor(rows,meta,'a'),[]);
  assert.deepEqual(statusTagsFor(rows,{...meta,statusDisplay:{dead:true}},'a').map(x=>x.statusId),['dead']);
  assert.deepEqual(statusTagsFor(rows,{...meta,statusDisplay:{wolf_bitten:true}},'a').map(x=>x.statusId),['wolf_bitten']);
  has(worker,'frozen:meta?.statusDisplay?.frozen===true&&frozenLogins');
  has(village,'showLegacy=id=>viewStatus[id]===true');
  has(ws,'statusTags:(Array.isArray(p?.statusTags)?p.statusTags:[]).filter(t=>config');
  assert.ok(!ws.includes('previousTags=new Map'));
});
test('One draggable quarter-size role/artifact dock and no stale role cache',()=>{
  has(village,'function gmwwMiniDrag(');
  has(village,'gmww_online_mini_positions_v2');
  has(village,'#game .role-stage[hidden]{display:none!important}');
  has(village,'#game.gmww-card-expanded #gmwwPlayerMiniCards');
  has(village,"gmww-player-menu-exit')?.remove()");
  has(session,'!match||!x.matchId||x.matchId!==match');
});
test('Bottom dock, authoritative countdown, private GM chat, direct actions, no AI narration',()=>{
  for(const id of ['gmwwOnlineFooter','gmwwPlayerClock','gmwwPlayerRestore'])has(chat,"id='"+id+"'");
  has(chat,'#gmwwOnlineFooter #gmwwChatLines{height:91px');
  has(chat,"gmwwChatTarget==='gm'");
  has(worker,'channel:"gm:"+id,scope:"gm"');
  has(worker,'channel:body.channel==="gm"?"gm":"room"');
  assert.ok(!chat.includes("confirm('Thực hiện "));
  has(chat,'gmwwOnlineTargetAt(');
  assert.ok(!chat.includes('new SpeechSynthesisUtterance'));
});
