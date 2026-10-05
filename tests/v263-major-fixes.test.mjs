import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('V2.63 exposes exactly 20 selectable six-frame chibi and preserves legacy IDs',()=>{
  const index=read('src/index.js');
  assert.ok(index.includes('VERSION="V2.63"'));
  assert.ok(index.includes('const GAME_CHARACTER_COUNT=20;'));
  assert.ok(index.includes('frameCount:6'));
  assert.ok(index.includes('gameCharacterFrameRoute'));
  assert.ok(index.includes('gameCharacterFrame(env,gameCharacterFrameRoute[1],Number(gameCharacterFrameRoute[2]),request)'));
  assert.ok(index.includes('character-(?:0[1-9]|[1-3][0-9]|4[0-2])'));
  let frames=0;
  for(let c=1;c<=20;c++)for(let f=1;f<=6;f++){
    const p=new URL('../assets/characters/walk-v263/character-'+String(c).padStart(2,'0')+'/frame-'+String(f).padStart(2,'0')+'.webp',import.meta.url);
    assert.ok(fs.statSync(p).size>0,p.pathname);
    frames++;
  }
  assert.equal(frames,120);
});

test('Player Web account creation and profile avatar picker share the same 20 six-frame character catalog',()=>{
  const live=read('src/gmww-members-live.js');
  assert.ok(live.includes('function gameCharacterFrameUrl(id,frame=1)'));
  assert.ok(live.includes('const catalog=state.gameCharacters'));
  assert.ok(live.includes('state.profileDraftGameCharacterId'));
  assert.ok(live.includes('JSON.stringify({displayName,gameCharacterId})'));
  assert.ok(live.includes('dataset.gmwwWalkCharacter'));
  assert.ok(!live.includes('gmwwAvatarWalkPreview'));
});

test('Village and GM use real frame swapping instead of fake paper rotation',()=>{
  const village=read('assets/village/village.mjs');
  const villageCss=read('assets/village/village.css');
  const app=read('server-game/current/app.js');
  const css=read('server-game/current/style.css');
  assert.ok(village.includes('function walkFrameUrl(characterId,frame=1)'));
  assert.ok(village.includes('img.src=walkFrameUrl(img.dataset.walkCharacter,frame)'));
  assert.ok(village.includes('requestAnimationFrame(animateMovementFrame)'));
  assert.ok(app.includes('playCharacterFrameUrl'));
  assert.ok(!villageCss.includes('@keyframes gmwwVillageWalk'));
  assert.ok(!css.includes('@keyframes gmwwChibiWalk'));
});

test('GM room state is realtime WebSocket with polling only as fallback',()=>{
  const app=read('server-game/current/app.js');
  assert.ok(app.includes('function connectPlaySocket()'));
  assert.ok(app.includes("new WebSocket(base+'/ws/'+encodeURIComponent(code))"));
  assert.ok(app.includes("d.type!=='room_state'"));
  assert.ok(app.includes('readyState!==WebSocket.OPEN)playSyncRoom(false)'));
  assert.ok(app.includes('},15000);'));
});

test('V2.63 UI keeps dialogs above village, uses X close, compacts profile and removes obsolete lobby chrome',()=>{
  const live=read('src/gmww-members-live.js');
  const html=read('server-game/current/GMWW.html');
  const css=read('server-game/current/style.css');
  assert.ok(live.includes('z-index:320!important'));
  assert.ok(live.includes('#profile .stats,#profile .history,#profile .section-title,#profile .change-pass{display:none!important}'));
  assert.ok(live.includes("gmwwProfileVillageBack"));
  assert.ok(live.includes("gmwwRoomsVillageBack"));
  assert.ok(live.includes("textContent='×'"));
  assert.ok(!live.includes('William'));
  assert.ok(html.includes('id="playGameClose" type="button">×</button>'));
  assert.ok(html.includes('id="playEndClose" type="button">×</button>'));
  assert.ok(css.includes('.sheet{z-index:2200!important}'));
});

test('Game Templates live in Library and V1.09 templates are migrated once',()=>{
  const html=read('server-game/current/GMWW.html');
  const app=read('server-game/current/app.js');
  assert.ok(html.includes('data-lib="templates"'));
  assert.ok(html.includes('id="lib-templates"'));
  assert.ok(app.includes('async function migrateV109GameTemplates()'));
  assert.ok(app.includes('GMWW_V109_GAME_TEMPLATES'));
  assert.ok(app.includes('GMWW_V1_09_GAME_TEMPLATES'));
  assert.ok(app.includes('GMWW_V263_TEMPLATE_MIGRATION_DONE'));
  assert.ok(app.includes('openLibraryGameTemplate'));
});

test('V2.63 migrates old play cache without resurrecting deleted players',()=>{
  const app=read('server-game/current/app.js');
  assert.ok(app.includes("GMWW_PLAY_SCENE_KEY='GMWW_V263_PLAY_SCENE'"));
  assert.ok(app.includes("GMWW_OLD_PLAY_SCENE_KEYS=['GMWW_V257_PLAY_SCENE'"));
  assert.ok(app.includes("if(migratedFrom){saved.selectedMemberIds=[];saved.assignmentsPreview=[];saved.activePlayerId='';saved.roleId='';saved.artifactId=''}"));
  assert.ok(app.includes("if(Number(err?.status)===404){clearStalePlayRoom()"));
});

test('IPA version and build are V2.63 / 263',()=>{
  const app=read('server-game/current/app.js');
  const html=read('server-game/current/GMWW.html');
  const project=read('server-game/GMWW-Server.xcodeproj/project.pbxproj');
  assert.ok(app.includes("const VERSION='2.63';"));
  assert.ok(html.includes('GMWW V2.63'));
  assert.ok(project.includes('CURRENT_PROJECT_VERSION = 263;'));
  assert.ok(project.includes('MARKETING_VERSION = 2.63;'));
});
