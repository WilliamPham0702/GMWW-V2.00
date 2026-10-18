import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(p,'utf8');

test('V3.139: tap and drag share validated single target-audio selection',()=>{
 const s=read('server-game/src/40-battle-and-timeline.part');
 assert.ok(s.includes('function battlePickTargetWithAudio(id,actionId)'));
 assert.ok(s.includes("if(selected)void battlePlayConfiguredAudio('actions',action.actionId,action.name)"));
 assert.ok(s.includes('battlePickTargetWithAudio(x.dataset.playPlayerId)'),'Direct character tap must play action audio');
 assert.ok(s.includes('if(hit.id)battlePickTargetWithAudio(hit.id,d.id)'),'Valid drag drop must share the same handler');
 assert.ok(s.includes('const selected=!already&&battleState.targets.includes(target)'),'Deselect/invalid target must not replay');
 assert.ok(!s.includes('for(const id of targets)battleState.impacts.set(id,'));
});
test('V3.139: iOS finger-scroll unlocks audio and uses server-confirmed relative turn',()=>{
 const battle=read('server-game/src/40-battle-and-timeline.part');
 const audio=read('server-game/src/30-village-and-setup.part');
 assert.ok(battle.includes('battleUnlockAudioFromGesture();cancel();'));
 assert.ok(battle.includes('timeline.gmwwCancelScrollNavigation=cancel'));
 assert.ok(battle.includes('if(!armed||!moved||playSceneState.step'));
 assert.ok(battle.includes('if(delta)battleNavigateRelative(delta)'));
 assert.ok(battle.includes("body:JSON.stringify({action:'jump',targetIndex:index"));
 assert.ok(audio.includes('function battleUnlockAudioFromGesture()'));
 assert.ok(audio.includes('async function battlePlayWebAudioFallback(src)'));
 assert.ok(audio.includes('if(await battlePlayWebAudioFallback(src))return true'));
 assert.ok(battle.includes("battleState.lastAudioTurnKey")&&battle.includes('battleAudioForTurn(t,true)'));
});
test('V3.139: GM movement follows shared paving route and stops instead of teleporting',()=>{
 const source=read('server-game/src/10-library-and-settings.part');
 const begin=source.indexOf('function gmwwGmNearPlayer('),end=source.indexOf('function gmwwGmActorAt(',begin);
 assert.ok(begin>0&&end>begin);
 const context=vm.createContext({
  GMWW_GM_AUTO_POINTS:[[28,38],[42,36],[58,36],[72,38],[77,48],[77,60],[73,70],[63,80],[60,92],[50,94],[40,92],[37,80],[27,70],[23,60],[23,48]],
  gmwwGmHash:()=>0,
  playMapDisplay:(x,y)=>[x,y],
  document:{getElementById:()=>context.ring}
 });
 vm.runInContext(read('assets/village/village-layout.js'),context);
 vm.runInContext(source.slice(begin,end),context);
 const layout=context.GMWW_VILLAGE_LAYOUT;
 for(const n of [8,10,12,14,16,18,20,22,24,26,28,30]){
  const seats=layout.positions(n,layout.recommendedSeatShape(n));
  context.ring={querySelectorAll:()=>seats.map(pos=>({style:{left:pos.x+'%',top:pos.y+'%'}}))};
  const first=context.gmwwGmKeepClear({x:50,y:93,moving:true,gait:'walk'});
  assert.equal(first.x,50);assert.equal(first.y,93);
  const occupied=context.gmwwGmKeepClear({x:seats[0].x,y:seats[0].y,moving:true,gait:'walk'});
  assert.equal(occupied.x,50,'GM must wait at last safe spot with '+n+' seats');
  assert.equal(occupied.y,93,'GM must never teleport when blocked');
  assert.equal(occupied.moving,false);
 }
 const track=context.gmwwGmRoute({x:28,y:38},{x:73,y:70});
 assert.ok(track.length>=2);
 for(let i=0;i<=100;i++){const p=context.gmwwGmWalkPoint({x:28,y:38},{x:73,y:70},i/100);assert.ok(layout.inside(p.x,p.y),'Never enter water, roof or fire');}
});
test('V3.139: Player Web, preview and GM status cache versions are refreshed together',()=>{
 const index=read('assets/village/index.html'),village=read('assets/village/village.mjs');
 const villageCss=read('assets/village/village.css'),preview=read('assets/status-visuals-preview.html');
 const gm=read('server-game/current/GMWW.html');
 assert.ok(index.includes('visual=v3139'));
 assert.ok(village.includes('../status-visuals.js?v=v3139-orbits'));
 assert.ok(villageCss.includes('./status-visuals.css?v=3139-orbits'));
 assert.ok(preview.includes('/status-visuals.js?v=v3139-orbits'));
 assert.ok(preview.includes('/village/status-visuals.css?v=v3139-orbits'));
 assert.ok(gm.includes('status-visuals.css?v=status-v9')&&gm.includes('status-visuals.js?v=status-v9'));
 assert.equal(read('assets/status-visuals.js'),read('server-game/current/status-visuals.js'));
 assert.ok(read('assets/village/status-visuals.css').startsWith(read('server-game/current/status-visuals.css')));
 assert.doesNotMatch(read('server-game/current/style.css'),/\.play-player-token\.battle-impact-/);
});
test('V3.139: runtime sources and OTA versions remain consistent',()=>{
 const parts=['00-core-and-library.part','10-library-and-settings.part','20-members-and-roster.part','30-village-and-setup.part','40-battle-and-timeline.part','50-roles-and-artifacts.part'];
 assert.equal(read('server-game/current/app.js'),parts.map(p=>read('server-game/src/'+p)).join(''));
 assert.match(read('server-game/src/00-core-and-library.part'),/VERSION='3\.139'/);
 assert.equal(JSON.parse(read('package.json')).version,'3.139.0');
 assert.ok(read('src/index.js').includes('VERSION="V3.139"'));
 assert.ok(read('src/index.js').includes('UPDATE_CHANNEL_REV="runtime-3139"'));
 assert.ok(read('src/index.js').includes('NATIVE_SHELL_VERSION="3.110"'));
});
