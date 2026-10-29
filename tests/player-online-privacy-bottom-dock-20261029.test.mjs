import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {statusTagsFor} from '../src/gmww-public-room-contract.js';

const read=path=>readFileSync(path,'utf8');
const worker=read('src/index.js');
const village=read('src/player-web-src/20-village-and-profile.part');
const websocket=read('src/player-web-src/30-rooms-and-realtime.part');
const chat=read('src/player-web-src/35-online-chat.part');
const session=read('src/player-web-src/00-bootstrap-and-session.part');

test('P0: Player never sees unapproved private action visuals, even for legacy effects',()=>{
  const rows=[
    {type:'dead',loginId:'a',effectActive:true,matchId:'M'},
    {type:'frozen',loginId:'a',effectActive:true,matchId:'M'},
    {type:'status',loginId:'a',statusId:'wolf_bitten',effectActive:true,matchId:'M'}
  ];
  const meta={matchId:'M',phase:'running',cyclePhase:'morning',statusDisplay:{}};
  assert.deepEqual(statusTagsFor(rows,meta,'a'),[]);
  assert.deepEqual(statusTagsFor(rows,{...meta,statusDisplay:{dead:true}},'a').map(x=>x.statusId),['dead']);
  assert.deepEqual(statusTagsFor(rows,{...meta,statusDisplay:{wolf_bitten:true}},'a').map(x=>x.statusId),['wolf_bitten']);
  assert.match(worker,/frozen:meta\\?\\.statusDisplay\\?\\.frozen===true&&frozenLogins/);
  assert.match(village,/showLegacy=id=>viewStatus\\[id\\]===true/);
  assert.match(websocket,/statusTags:\\(Array\\.isArray\\(p\\?\\.statusTags\\)\\?p\\.statusTags:\\[\\]\\)/);
  assert.doesNotMatch(websocket,/previousTags=new Map/);
});
test('One draggable quarter-size role/artifact dock and no stale room role cache',()=>{
  assert.match(village,/function gmwwMiniDrag\\(/);
  assert.match(village,/gmww_online_mini_positions_v2/);
  assert.match(village,/#game \\.role-stage\\[hidden\\]\\{display:none!important\\}/);
  assert.match(village,/#game\\.gmww-card-expanded #gmwwPlayerMiniCards/);
  assert.match(village,/gmww-player-menu-exit'\\)\\?\\.remove\\(\\)/);
  assert.match(session,/!match\\|\\|!x\\.matchId\\|\\|x\\.matchId!==match/);
});
test('Bottom dock, clock, GM private chat, rollback draft and direct icon target',()=>{
  assert.match(chat,/id='gmwwOnlineFooter'/);
  assert.match(chat,/id='gmwwPlayerClock'/);
  assert.match(chat,/id='gmwwPlayerRestore'/);
  assert.match(chat,/#gmwwOnlineFooter #gmwwChatLines\\{height:91px/);
  assert.match(chat,/gmwwChatTarget==='gm'/);
  assert.match(worker,/channel:"gm:"\\+id,scope:"gm"/);
  assert.match(worker,/channel:body.channel==="gm"\\?"gm":"room"/);
  assert.doesNotMatch(chat,/confirm\\('Thực hiện /);
  assert.match(chat,/gmwwOnlineTargetAt\\(/);
  assert.doesNotMatch(chat,/new SpeechSynthesisUtterance/);
});
