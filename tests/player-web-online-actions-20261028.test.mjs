import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {playerOfferedActions,demoPlayerActions} from '../src/gmww-demo-runner.js';
import {onlineGmActionIcon,ONLINE_GM_ACTION_ICON_FILES} from '../src/gmww-online-action-icons.js';
const server=readFileSync('src/index.js','utf8'),ui=readFileSync('src/player-web-src/35-online-chat.part','utf8');
const timeline=readFileSync('src/player-web-src/20-village-and-profile.part','utf8');
const refresh=readFileSync('src/player-web-src/30-rooms-and-realtime.part','utf8');

test('Server action URL requires the authenticated member session and checks the active match/turn',()=>{
 assert.match(server,/playerOnlineActionApi\(env,playerOnlineRoute\[1\],request\)/);
 assert.match(server,/async function playerOnlineActionApi\(env,raw,request\)/);
 assert.match(server,/members\/session/);
 assert.match(server,/ONLINE_ACTION_NOT_RUNNING/);
 assert.match(server,/ONLINE_PLAYER_NOT_JOINED/);
 assert.match(server,/DEMO_ACTION_STALE/);
 assert.match(server,/actions=online\?await playerOfferedActions/);
 assert.match(server,/action=actions\.find\(a=>a\.key===String\(body\?\.actionKey/);
 assert.match(server,/targets\.length!==action\.targetCount/);
 assert.match(server,/this\.gmBattleAction\(request/);
 assert.match(server,/this\.gmDayAction\(request/);
});
test('Player receives current actions privately and never adds them to public broadcast',()=>{
 assert.match(server,/onlineActions=meta\.demo!==true/);
 assert.match(server,/wolfRecognition,audioCue,publicTimeline,drunkDraw,demoActions,onlineActions,artifact/);
 assert.doesNotMatch(server,/this\.broadcast\(\{[^}]*onlineActions/);
 assert.match(server,/publicTimeline=String\(meta\.phase\)/);
 assert.match(timeline,/function renderPlayerTimeline\(/);
 assert.match(refresh,/renderPlayerTimeline\(d\?\.publicTimeline\)/);
 assert.match(refresh,/renderOnlineActionDock\(\)/);
});
test('Action dock uses the same GM artwork, pointer drag to live player and Server confirmation',()=>{
 assert.equal(onlineGmActionIcon('action_wolf_bite'),'/action-icons/v3/05_soi_can.webp');
 assert.ok(Object.keys(ONLINE_GM_ACTION_ICON_FILES).length>=50);
 assert.match(ui,/function gmwwOnlineTargetAt\(/);
 assert.match(ui,/#players \.player\[data-player-id\]/);
 assert.match(ui,/function gmwwOnlineIconDown\(/);
 assert.match(ui,/setPointerCapture/);
 assert.match(ui,/renderOnlineActionDock\(/);
 assert.match(ui,/\/api\/rooms\/'\+encodeURIComponent\(state\.roomCode\)\+'\/action/);
 assert.match(ui,/actionKey:action\.key,targetIds:pick\.targets/);
 assert.doesNotMatch(ui,/confirm\('Thực hiện /);
});
test('Online offers fail closed for Offline and preserve DEMO human-control admission',async()=>{
 const room={ctx:{storage:{get:async key=>key==='players'?{'member:a':{loginId:'a'}}:[]}}};
 assert.deepEqual(await playerOfferedActions(room,{phase:'running',roomMode:'offline',demo:false},'a'),[]);
 assert.deepEqual(await demoPlayerActions(room,{phase:'running',roomMode:'online',demo:false},'a'),[]);
 assert.deepEqual(await playerOfferedActions(room,{phase:'running',roomMode:'offline',demo:true},'a'),[]);
});
