import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const html=read('server-game/current/GMWW.html');
const css=read('server-game/current/style.css');
const battle=read('server-game/src/40-battle-and-timeline.part');
const gm=read('server-game/src/50-roles-and-artifacts.part');

test('V3.237 GM hide toggle matches Artifact and Vai Trò ON/OFF styling',()=>{
 assert.match(html,/id="battleGMChromeToggle"[^>]*aria-pressed="true"[^>]*>Menu<\/button>/);
 assert.match(gm,/toggle\.setAttribute\('aria-pressed',String\(!hidden\)\)/);
 assert.match(gm,/toggle\.textContent='Menu'/);
 assert.match(css,/#battleGMChromeToggle\[aria-pressed="true"\]/);
 assert.match(css,/color:#fff!important;font-size:12px!important;font-weight:1000!important/);
});
test('V3.237 one GM menu at all campfires, tap outside and Escape dismiss in setup and battle',()=>{
 assert.equal((html.match(/id="battleWolfMenu"/g)||[]).length,1);
 assert.match(gm,/\.play-core-pearl'\)\?\.addEventListener\('click',\(\)=>battleToggleWolfMenu\(\)\)/);
 assert.match(battle,/\/\/ The campfire opens one shared GM menu during setup and gameplay/);
 assert.match(battle,/playSceneState\.step!=='battle'&&\s*battleState\.wolfOpen&&!event\.target\.closest\?\.\('#battleWolfMenu,\.play-core-pearl'\)/);
 assert.match(battle,/battleState\.wolfOpen=false;renderPlayBattle\(\);return;/);
 assert.match(battle,/if\(battleState\.wolfOpen&&!inside\('#battleWolfMenu,\.play-core-pearl'\)\)/);
 assert.match(battle,/event\.key==='Escape'&&document\.body\.classList\.contains\('play-immersive'\)/);
});
test('V3.237 footer has no outer frame and icon buttons show no labels',()=>{
 assert.match(css,/GMWW V3\.238: shared campfire menu/);
 assert.match(css,/#battleBottomControls\{\s*background:none!important/);
 assert.match(css,/border:0!important;border-radius:0!important;box-shadow:none!important/);
 assert.match(css,/#battleUndoButton > small/);
 assert.match(css,/display:none!important;visibility:hidden!important/);
 for(const id of ['battleDayNoticeToggle','battleDayGallowsToggle','battleUndoButton']){
  const i=html.indexOf('id="'+id+'"');assert.ok(i>0);
  assert.match(html.slice(i,i+650),/gmww-footer-icon/);
 }
 assert.match(html,/<output id="battleCountdown"/);
});
test('V3.237 bundle and shell versions agree; Core and Player Web contracts unchanged',()=>{
 const parts=['00-core-and-library','10-library-and-settings','20-members-and-roster','30-village-and-setup','40-battle-and-timeline','50-roles-and-artifacts'];
 assert.equal(read('server-game/current/app.js'),parts.map(n=>read('server-game/src/'+n+'.part')).join(''));
 assert.match(read('src/index.js'),/VERSION="V3\.238"/);
 assert.match(read('package.json'),/"version": "3\.238\.0"/);
 assert.match(read('server-game/current/GMWW.html'),/GMWW V3\.238/);
});
