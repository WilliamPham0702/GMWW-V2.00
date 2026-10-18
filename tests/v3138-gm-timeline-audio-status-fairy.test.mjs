import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {confirmedNightStatusVisuals,statusTagsFor,STATUS_VISUAL_IDS} from '../src/gmww-public-room-contract.js';
const read=path=>fs.readFileSync(path,'utf8');

test('V3.138: a confirmed Fairy transfer moves the bite status to the final player only',()=>{
 const players={'member:anna':{loginId:'anna',seatId:1},'member:bao':{loginId:'bao',seatId:2}};
 const meta={matchId:'match-a',phase:'running',cyclePhase:'night',cycleNight:1,statusDisplay:{wolf_bitten:true}};
 const rows=[
  {type:'effect_notice',actionId:'action_wolf_bite',loginId:'anna',matchId:'match-a',night:1},
  {type:'effect_notice',actionId:'action_transfer_bite',loginId:'bao',matchId:'match-a',night:1,direction:'right'}
 ];
 const projected=confirmedNightStatusVisuals(rows,meta,players);
 assert.deepEqual(projected.filter(x=>x.statusId==='wolf_bitten').map(x=>x.loginId),['bao']);
 assert.equal(statusTagsFor(rows,meta,'anna',players).some(x=>x.statusId==='wolf_bitten'),false);
 assert.equal(statusTagsFor(rows,meta,'bao',players).some(x=>x.statusId==='wolf_bitten'),true);
});
test('V3.138: Maiden visit projects a single kiss status without changing gameplay rules',()=>{
 const rows=[{type:'effect_notice',actionId:'action_visit_house',loginId:'bao',matchId:'a',night:2}];
 const meta={matchId:'a',phase:'running',cyclePhase:'night',cycleNight:2,statusDisplay:{visited:true}};
 assert.equal(STATUS_VISUAL_IDS.has('visited'),true);
 assert.equal(confirmedNightStatusVisuals(rows,meta)[0].statusId,'visited');
 assert.equal(statusTagsFor(rows,meta,'bao').some(x=>x.statusId==='visited'),true);
 const visuals=read('server-game/current/status-visuals.js');
 assert.match(visuals,/id:'visited',name:'Thăm Nhà',icon:'💋'/);
 assert.match(visuals,/visited:\['💋'\]/);
});
test('V3.138: navigation, assignment collapse, swipe, drop sound and draggable Fairy box are wired',()=>{
 const battle=read('server-game/src/40-battle-and-timeline.part'),setup=read('server-game/src/50-roles-and-artifacts.part'),html=read('server-game/current/GMWW.html');
 assert.ok(html.includes('<b>&lt;Đêm 1</b>'));
 assert.ok(html.includes('<b>Ngày 1&gt;</b>'));
 assert.ok(battle.includes("label.textContent='<Đêm '+night"));
 assert.ok(battle.includes("label.textContent='Ngày '+night+'>'"));
 assert.match(battle,/initBattleTimelineScrollNavigation\(\)/);
 assert.match(battle,/battleNavigateIndex\(Number\(closest.dataset.battleIndex\)\)/);
 assert.match(battle,/if\(hit.id\)\{[\s\S]*?battlePlayConfiguredAudio\('actions',action.actionId,action.name\)/);
 assert.match(battle,/data-transfer-grip/);
 assert.match(setup,/assignmentPanelDismissed=true/);
 assert.match(setup,/assignmentPanelDismissed=false/);
 assert.match(read('server-game/current/style.css'),/battleResultPopup\.is-wolf-result/);
});
test('V3.138: GM patrol uses adjacent perimeter waypoints and checks occupied tokens',()=>{
 const source=read('server-game/src/10-library-and-settings.part');
 assert.match(source,/function gmwwGmNearPlayer\(/);
 assert.match(source,/function gmwwGmClearWalk\(/);
 assert.match(source,/function gmwwGmKeepClear\(/);
 assert.match(source,/GMWW_GM_AUTO_POINTS\[\[25,35\]/);
});
