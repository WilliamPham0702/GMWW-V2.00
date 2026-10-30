import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=(path)=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const app=read('server-game/current/app.js');
const part30=read('server-game/src/30-village-and-setup.part');
const part40=read('server-game/src/40-battle-and-timeline.part');
const css=read('server-game/current/style.css');
const html=read('server-game/current/GMWW.html');
const piece=(source,start,end)=>{
 const i=source.indexOf(start),j=source.indexOf(end,i+start.length);
 assert.ok(i>=0&&j>i,start+' section');
 return source.slice(i,j);
};

test('GM battle source modules are the ones assembled into the Runtime',()=>{
 assert.ok(app.includes(piece(part30,'function gmwwSetupFreeBattleIcons(){','function battleMorningRows(){')));
 assert.ok(app.includes(piece(part40,'function battleIconPositionKey(actionId,iconId)','function battleIconClearDrag(){')));
 assert.ok(app.includes(piece(part40,'function battleIconBind(){','// Repaint the current GM turn')));
});
test('Double-sized icons remain separated at village entrance',()=>{
 const code=piece(app,'function battleIconSpawnPoint(','function battleIconEntryPoint(){');
 const c={globalThis:{visualViewport:{width:390,height:844}},innerWidth:390,innerHeight:844,Math};
 vm.createContext(c);vm.runInContext(code,c);
 for(const count of [2,3,4,6]){
  const positions=Array.from({length:count},(_,i)=>c.battleIconSpawnPoint({x:195,y:650},i,count));
  for(let i=0;i<count;i++)for(let j=i+1;j<count;j++){
   const distance=Math.hypot(positions[i].x-positions[j].x,positions[i].y-positions[j].y);
   assert.ok(distance>=92,'Icons '+count+' '+i+'/'+j+' overlap: '+distance);
  }
 }
 assert.match(app,/data-fire-index/);
 assert.match(app,/battleIconSpawnPoint\(entry,slot,eligible\.length\)/);
});
test('Dropping a multi-target action keeps its icon for the next different target',()=>{
 const block=piece(app,'function battleIconBind(){','// Repaint the current GM turn');
 assert.match(block,/if\(a\?\.targetCount>1&&target\)battleIconPositions\.delete\(key\)/);
 assert.ok(block.indexOf('battleIconPositions.delete(key)')<block.indexOf('battlePickTargetWithAudio('));
 assert.match(app,/battleState\.actionId===action\.id&&battleState\.targets\.includes\(id\)/);
 assert.match(block,/if\(battleState\.targets\.length===a\.targetCount\)/);
 assert.match(block,/else void battleConfirm\(true\)/);
 assert.match(block,/if\(!target\|\|!a\.targetCount\)return/);
});
test('Frameless icon art is 80px inside a 92px draggable hit area',()=>{
 const end=css.slice(css.lastIndexOf('/* V3.231:'));
 assert.ok(end.length>450);
 assert.match(end,/#battleFireIconDock \.battle-fire-icon img\{[\s\S]*?width:80px!important/);
 assert.match(end,/#battleFireIconDock \.battle-fire-icon\{[\s\S]*?width:92px!important/);
 assert.match(css,/#battleFireIconDock \.battle-fire-icon\{[\s\S]*?background:transparent!important/);
});
test('Bottom menu has clock, beach/rainbow, action box, gallows and undo in fixed order',()=>{
 const functionBody=piece(part30,'function gmwwSetupFreeBattleIcons(){','function battleMorningRows(){');
 const required=['playBattleClockFloat','battleSeaShortcuts','battleMainActionSlot','battleDayGallowsFloat','battleUndoFloat'];
 for(const id of required)assert.ok(functionBody.includes(id),id);
 assert.match(functionBody,/for\(const element of \[document\.getElementById\('playBattleClockFloat'\),sea,actionSlot,/);
 assert.match(functionBody,/const id of \['battleDayNoticeFloat','battleFactionStatsFloat'\]/);
 assert.match(functionBody,/for\(const id of \['battleDemoObserver'\]\)/);
 assert.match(css,/#battleBottomControls #battleSeaShortcuts/);
 assert.match(css,/#battleBottomControls #battleMainActionSlot/);
 for(const id of ['battleClockButton','battleDayNoticeToggle','battleFactionStatsToggle','battleDayGallowsToggle','battleUndoButton'])
  assert.match(html,new RegExp('id="'+id+'"'));
});
test('Clock left/right swipe retains one-minute day adjustment, not a cosmetic timer',()=>{
 const src=piece(app,'function initBattleDayClockSwipe(){','function initBattleControls(){');
 assert.match(src,/Math\.abs\(dx\)>=28/);
 assert.match(src,/battleAdjustDayClock\(dx>0\?1:-1\)/);
 assert.match(app,/playRoomApi\('\/day-clock'/);
});

test('Initial action icons anchor to the rendered campfire with a safe footer fallback',()=>{
 const source=piece(app,'function battleIconEntryPoint(){','function battleIconResetPositions(){');
 assert.ok(source.includes("play-village-core .play-core-pearl"));
 assert.ok(source.includes('getBoundingClientRect'));
 assert.ok(source.includes('rect.left+rect.width/2,rect.top+rect.height/2'));
 assert.ok(source.includes("getElementById('battleBottomControls')"));
 assert.ok(app.includes('const entry=battleIconEntryPoint()'));
});
