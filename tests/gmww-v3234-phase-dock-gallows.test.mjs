import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=file=>fs.readFileSync(file,'utf8');
const source=read('server-game/src/40-battle-and-timeline.part');
const app=read('server-game/current/app.js');
const css=read('server-game/current/style.css');
const html=read('server-game/current/GMWW.html');

test('Dock đêm Đồng hồ/Hành động/Khôi phục, dock ngày Đồng hồ/Thông cáo/Hành động/Lên Giàn/Thống kê',()=>{
 const start=source.indexOf('function battleSyncPhaseDock(');
 const end=source.indexOf('function renderPlayBattle(){',start);
 assert.ok(start>0&&end>start);
 const ids=['playShell','playBattleClockFloat','battleActionTray','battleUndoFloat','battleDayNoticeFloat',
  'battleDayActionFloat','battleDayGallowsFloat','battleFactionStatsFloat'];
 const nodes=new Map(ids.map(id=>[id,{hidden:true,dataset:{}}]));
 const ctx={document:{getElementById:id=>nodes.get(id)},Object};
 vm.createContext(ctx);
 vm.runInContext(source.slice(start,end),ctx);
 const visible=id=>!nodes.get(id).hidden;
 const check=(phase,expected)=>{
  ctx.battleSyncPhaseDock(phase,true);
  assert.equal(nodes.get('playShell').dataset.battlePhase,phase);
  for(const id of ids.slice(1))assert.equal(visible(id),expected.includes(id),phase+' '+id);
 };
 const night=['playBattleClockFloat','battleActionTray','battleUndoFloat'];
 check('night',night);
 check('day',['playBattleClockFloat','battleActionTray','battleDayNoticeFloat','battleDayActionFloat',
  'battleDayGallowsFloat','battleFactionStatsFloat']);
 check('night',night);
 ctx.battleSyncPhaseDock('day',false);
 assert.equal(ids.slice(1).every(id=>!visible(id)),true);
 assert.equal(nodes.get('playShell').dataset.battlePhase,'');
});
test('Phase gate chạy mỗi lần render, khôi phục đêm chỉ sáng khi có token hoàn tác',()=>{
 const start=source.indexOf('function battleSyncPhaseDock(');
 const end=source.indexOf('function renderPlayBattle(){',start);
 assert.ok(app.includes(source.slice(start,end)));
 assert.match(source,/gmwwSetupFreeBattleIcons\(\);\s*battleSyncPhaseDock\(playSceneState\.phase,visible\)/);
 assert.match(css,/data-battle-phase="night"\] #battleBottomControls #battleUndoFloat:not\(\[hidden\]\)\{[\s\S]*?display:flex!important/);
 assert.match(css,/#battleBottomControls #battleUndoFloat\{\s*display:none!important/);
 assert.match(html,/id="battleUndoButton"/);
 assert.match(source,/undo\.disabled=battleState\.busy\|\|battleState\.syncPending/);
});
test('Gallows keeps all eligible members while showing five rows with vertical scrolling',()=>{
 const start=source.indexOf('function battleGallowsRender(');
 const end=source.indexOf('function ',start+10);
 assert.ok(start>0&&end>start);
 const block=source.slice(start,end);
 assert.match(block,/const ordered=\[\.\.\.members\]\.sort/);
 assert.match(block,/roster\.innerHTML=ordered\.map/);
 assert.match(block,/roster\.scrollTop=top/);
 assert.match(block,/const countNote=document\.getElementById\('battleGallowsBansCount'\)/);
 assert.match(css,/#battleGallowsPanel #battleGallowsMembers \.battle-gallows-member\{min-height:39px!important;height:39px\}/);
 assert.match(css,/#battleGallowsPanel #battleGallowsMembers\{[\s\S]*?max-height:195px!important;[\s\S]*?overflow-y:auto!important/);
 assert.match(html,/id="battleGallowsBanDetails"/);
});
test('V3.234 Runtime only; Worker, source, HTML and OTA release notes agree',()=>{
 assert.match(read('src/index.js'),/VERSION="V3\.234"/);
 assert.match(app,/const VERSION='3\.234';/);
 assert.match(html,/<title>GMWW V3\.234<\/title>/);
 assert.match(read('package.json'),/"version": "3\.234\.0"/);
 assert.match(read('.github/scripts/prepare-update-channel.mjs'),/V3\.234: Dock Đêm giữ/);
});
