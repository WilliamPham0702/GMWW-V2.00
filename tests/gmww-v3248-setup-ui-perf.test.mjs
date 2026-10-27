import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const settings=fs.readFileSync('server-game/src/10-library-and-settings.part','utf8');
const battle=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const village=fs.readFileSync('server-game/src/30-village-and-setup.part','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
test('six icon size choices are 25..150 on exactly one row',()=>{
 const at=html.indexOf('id="actionIconScaleChoices"'),end=html.indexOf('</div>',at),markup=html.slice(at,end);
 assert.ok(at>0);
 assert.deepEqual([...markup.matchAll(/data-action-icon-scale="(\d+)"/g)].map(x=>+x[1]),[25,50,75,100,125,150]);
 assert.match(settings,/ACTION_ICON_SCALE_OPTIONS=\[25,50,75,100,125,150\]/);
 assert.match(battle,/n>=\.25&&n<=1\.5/);
 assert.match(css,/#settings #actionIconScaleChoices.character-scale-choices/);
 assert.match(css,/grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/);
});
test('paused DEMO text belongs only to lower action tray, never GM menu',()=>{
 const p=html.indexOf('id="battleDemoPanel"'),tray=html.indexOf('id="battleActionTray"'),menu=html.indexOf('class="battle-wolf-actions"');
 assert.ok(tray>0&&p>tray&&p<menu);assert.equal(html.match(/id="battleDemoPanel"/g)?.length,1);
 assert.match(css,/#battleDemoPanel\[hidden\]/);
});
test('village-wakeup stays an internal transition but not visible timeline action',()=>{
 assert.match(battle,/visibleSteps=steps\.map\(/);
 assert.match(battle,/\.filter\(x=>x\.kind!=='village-wakeup'\)/);
 assert.match(battle,/timeline\.innerHTML=visibleSteps\.map/);
 assert.match(battle,/data-battle-index="'\+s\.displayIndex/);
 assert.match(battle,/battleWakeupToDay\(key\)/);
});
test('setup de-duplicates stage requests and avoids fast fallback polling and redraw',()=>{
 assert.match(battle,/playSceneRuntime\.room\?\.gmStage===step/);
 assert.match(battle,/step===playSceneState\.step/);
 assert.match(village,/playSyncRoom\(false\)\},2500\)/);
 assert.match(village,/function playSetupSyncFingerprint\(\)/);
 assert.match(village,/beforeRenderKey!==playSetupSyncFingerprint\(\)/);
 assert.match(village,/playSceneRuntime\.roomSyncInFlight/);
 assert.match(village,/Math\.min\(10000,750\*2\*\*failures\)/);
});
test('built GM bundle includes all source changes',()=>{
 for(const source of [settings,battle,village]){for(const marker of ['ACTION_ICON_SCALE_OPTIONS=[25,50,75,100,125,150]','visibleSteps=steps.map','playSetupSyncFingerprint','Math.min(10000,750*2**failures)'].filter(x=>source.includes(x)))assert.ok(app.includes(marker),marker)}
 assert.match(html,/<title>GMWW V3\.248<\/title>/);
});
