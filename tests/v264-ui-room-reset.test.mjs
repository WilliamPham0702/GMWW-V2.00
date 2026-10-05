import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('V2.64 keeps 20 selectable six-frame chibi and realtime room sync',()=>{
  const index=read('src/index.js'),live=read('src/gmww-members-live.js'),app=read('server-game/current/app.js');
  assert.ok(index.includes('VERSION="V2.64"'));
  assert.ok(index.includes('const GAME_CHARACTER_COUNT=20;'));
  assert.ok(index.includes('frameCount:6'));
  assert.ok(live.includes('function gameCharacterFrameUrl(id,frame=1)'));
  assert.ok(app.includes('function connectPlaySocket()'));
  assert.ok(app.includes("new WebSocket(base+'/ws/'+encodeURIComponent(code))"));
  let frames=0;
  for(let c=1;c<=20;c++)for(let f=1;f<=6;f++){
    const p=new URL('../assets/characters/walk-v263/character-'+String(c).padStart(2,'0')+'/frame-'+String(f).padStart(2,'0')+'.webp',import.meta.url);
    assert.ok(fs.statSync(p).size>0,p.pathname);frames++;
  }
  assert.equal(frames,120);
});

test('V2.64 does not resurrect V2.63 room roster on upgrade',()=>{
  const app=read('server-game/current/app.js');
  assert.ok(app.includes("GMWW_PLAY_SCENE_KEY='GMWW_V264_PLAY_SCENE'"));
  assert.ok(app.includes("GMWW_OLD_PLAY_SCENE_KEYS=['GMWW_V263_PLAY_SCENE'"));
  assert.ok(app.includes("saved.roomCode='—';saved.gmToken=''"));
  assert.ok(app.includes("saved.selectedMemberIds=[];saved.assignmentsPreview=[]"));
  assert.ok(app.includes("saved.matchId='';saved.gameTemplateId=''"));
  assert.ok(app.includes("saved.step='room';saved.phase='lobby';saved.night=0;saved.artifactCount=0"));
});

test('V2.64 top HUD uses three columns and bottom control bar uses five columns',()=>{
  const css=read('server-game/current/style.css'),html=read('server-game/current/GMWW.html');
  assert.ok(css.includes('grid-template-columns:minmax(112px,1.25fr) minmax(82px,.85fr) 58px!important'));
  assert.ok(css.includes('grid-template-columns:38px 38px minmax(0,1fr) 38px 38px!important'));
  const footer=html.slice(html.indexOf('<footer class="play-control-bar">'),html.indexOf('</footer>',html.indexOf('<footer class="play-control-bar">')));
  for(const id of ['playExitVillage','playBack','playPrimaryAction','playNext','playEndGame'])assert.ok(footer.includes('id="'+id+'"'));
});

test('V2.64 keeps the village visible by shrinking HUD/context/control chrome',()=>{
  const css=read('server-game/current/style.css');
  assert.ok(css.includes('max-height:118px!important'));
  assert.ok(css.includes('height:44px!important'));
  assert.ok(css.includes('height:38px!important'));
  assert.ok(css.includes('body.play-immersive .play-context-copy span{display:none!important}'));
});

test('all close X controls are aligned to the right',()=>{
  const css=read('server-game/current/style.css'),live=read('src/gmww-members-live.js');
  assert.ok(css.includes('.editor-back{grid-column:3!important;justify-self:end!important}'));
  assert.ok(css.includes('.sheet-head>button:last-child{right:0!important;left:auto!important}'));
  assert.ok(live.includes('#gmwwProfileVillageBack,#gmwwRoomsVillageBack{position:absolute;right:8px;top:8px'));
});

test('V2.64 retains Library templates and V1.09 migration',()=>{
  const html=read('server-game/current/GMWW.html'),app=read('server-game/current/app.js');
  assert.ok(html.includes('data-lib="templates"'));
  assert.ok(html.includes('id="lib-templates"'));
  assert.ok(app.includes('async function migrateV109GameTemplates()'));
  assert.ok(app.includes('GMWW_V109_GAME_TEMPLATES'));
  assert.ok(app.includes('openLibraryGameTemplate'));
});

test('IPA version and build are V2.64 / 264',()=>{
  const app=read('server-game/current/app.js'),html=read('server-game/current/GMWW.html'),project=read('server-game/GMWW-Server.xcodeproj/project.pbxproj');
  assert.ok(app.includes("const VERSION='2.64';"));
  assert.ok(html.includes('GMWW V2.64'));
  assert.ok(project.includes('CURRENT_PROJECT_VERSION = 264;'));
  assert.ok(project.includes('MARKETING_VERSION = 2.64;'));
});
