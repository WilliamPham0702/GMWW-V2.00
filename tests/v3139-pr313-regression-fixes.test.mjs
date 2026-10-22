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
 assert.ok(battle.includes("body:JSON.stringify({action:'jump',targetIndex,expectedTurnId"));
 assert.ok(audio.includes('function battleUnlockAudioFromGesture()'));
 assert.ok(audio.includes('async function battlePlayWebAudioFallback(src,onFinished=null)'));
 assert.ok(audio.includes('if(await battlePlayWebAudioFallback(src,done))return true'));
 assert.ok(battle.includes("battleState.lastAudioTurnKey")&&battle.includes('battleAudioForTurn(t,true)'));
});
test('V3.143: GM patrol and manual movement no longer run',()=>{
 const source=read('server-game/src/10-library-and-settings.part');
 assert.doesNotMatch(source,/gmwwGmRoute\(/);
 assert.doesNotMatch(source,/gmwwGmWalkPoint\(/);
 assert.doesNotMatch(source,/gmwwGmKeepClear\(/);
 assert.doesNotMatch(source,/gmwwMoveGmCharacter\(/);
 assert.match(source,/gmwwSendGmPresence/);
 const ctx={};vm.runInNewContext(read('assets/village/village-layout.js'),ctx);
 const layout=ctx.GMWW_VILLAGE_LAYOUT;
 for(const n of [8,10,12,14,16,18,20,22,24,26,28,30]){
  const seats=layout.positions(n,layout.recommendedSeatShape(n));
  assert.equal(seats.length,n);
  for(const p of seats)assert.ok(layout.inside(p.x,p.y));
 }
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
test('V3.139 gameplay regression retains synchronized current Runtime and OTA metadata',()=>{
 const parts=['00-core-and-library.part','10-library-and-settings.part','20-members-and-roster.part','30-village-and-setup.part','40-battle-and-timeline.part','50-roles-and-artifacts.part'];
 const runtime=JSON.parse(read('package.json')).version.split('.').slice(0,2).join('.');
 assert.equal(read('server-game/current/app.js'),parts.map(p=>read('server-game/src/'+p)).join(''));
 assert.ok(read('server-game/src/00-core-and-library.part').includes("const VERSION='"+runtime+"'"));
 assert.ok(read('src/index.js').includes('VERSION="V'+runtime+'"'));
 assert.ok(read('src/index.js').includes('UPDATE_CHANNEL_REV="runtime-'+runtime.replaceAll('.','')+'"'));
 assert.ok(read('src/index.js').includes('NATIVE_SHELL_VERSION="3.110"'));
});
