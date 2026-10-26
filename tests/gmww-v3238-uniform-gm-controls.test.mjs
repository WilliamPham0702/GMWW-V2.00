import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const html=read('server-game/current/GMWW.html');
const css=read('server-game/current/style.css');
const gm=read('server-game/src/50-roles-and-artifacts.part');
const battle=read('server-game/src/40-battle-and-timeline.part');

test('V3.238 all GM buttons have correct short stable labels',()=>{
 const expected={battleGMChromeToggle:'Menu',battleGMActionIcons:'iCon',battleShowDead:'Người Chết',
  battleGMFireAnchor:'Đặt Menu',battleGMGallowsAnchor:'Đặt ⚖️',battleGMHaptic:'Rung',
  battleGMAudio:'Audio',battleLabelArtifact:'Artifact',battleLabelRole:'Vai Trò',battleLabelPlayer:'Người Chơi'};
 for(const [id,label] of Object.entries(expected)){
  const match=html.match(new RegExp('<button[^>]*id="'+id+'"[^>]*>([^<]+)<\\/button>'));
  assert.ok(match,id+' exists');
  assert.equal(match[1],label,id+' label');
 }
 assert.match(battle,/menuToggle.textContent='iCon'/);
 assert.match(battle,/deadToggle.textContent='Người Chết'/);
 assert.match(battle,/haptic.textContent='Rung'/);
 assert.match(battle,/audio.textContent='Audio'/);
});
test('V3.238 pressed controls all use same Vai Trò ON/OFF design',()=>{
 assert.match(css,/V3\.238 — every GM control uses exactly the Artifact/);
 assert.match(css,/#battleWolfMenu \.battle-wolf-actions > button\[aria-pressed="true"\]/);
 assert.match(css,/#battleWolfMenu \.battle-wolf-actions > button\[aria-pressed="false"\]/);
 assert.match(css,/flex:0 0 99px!important;width:99px!important/);
 assert.match(css,/font-weight:1000!important/);
 assert.match(css,/opacity:\.58!important/);
 assert.match(css,/button:not\(\[aria-pressed\]\):active/);
 assert.match(gm,/toggle\.setAttribute\('aria-pressed',String\(!hidden\)\)/);
});
test('V3.238 toggle DOM state derives from functionality both Setup and Battle',()=>{
 assert.match(battle,/function battleSyncGMMenuControls\(\)/);
 for(const [id,value] of Object.entries({
  battleGMChromeToggle:'!gmwwPlayChromeHidden',
  battleLabelArtifact:'gmLabelVisibility.artifact',
  battleLabelRole:'gmLabelVisibility.role',
  battleLabelPlayer:'gmLabelVisibility.player',
  battleShowDead:'gmLabelVisibility.dead',
  battleGMActionIcons:'battleIconOn()',
  battleGMAudio:'!playAudioMuted()',
  battleGMHaptic:'gmHapticEnabled()',
  battleGMAuto:'!!playSceneState.autoGM'
 })){
  assert.ok(battle.includes("on('"+id+"',"+value+","),id+' active-state source');
 }
 const x=battle.indexOf('function renderPlayBattle(){');
 const setup=battle.slice(x,x+1650);
 assert.ok(setup.indexOf('battleSyncGMMenuControls();')<setup.indexOf('if(!visible){'),'called before Setup return');
 assert.match(gm,/toggle\.textContent='Menu'/);
 assert.match(battle,/button\.setAttribute\('aria-pressed',String\(enabled\)\)/);
});
test('V3.238 icon and menu changes remain UI-only; bundle, versions and release notes agree',()=>{
 const names=['00-core-and-library','10-library-and-settings','20-members-and-roster','30-village-and-setup','40-battle-and-timeline','50-roles-and-artifacts'];
 assert.equal(read('server-game/current/app.js'),names.map(n=>read('server-game/src/'+n+'.part')).join(''));
 assert.match(read('server-game/current/app.js'),/const VERSION='3\.238'/);
 assert.match(read('src/index.js'),/VERSION="V3\.238"/);
 assert.match(read('server-game/current/GMWW.html'),/GMWW V3\.238/);
 assert.match(read('package.json'),/"version": "3\.238\.0"/);
 assert.match(read('.github/scripts/prepare-update-channel.mjs'),/V3\.238: toàn bộ box Menu GM/);
});
