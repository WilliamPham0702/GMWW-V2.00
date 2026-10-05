import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('V2.63 exposes exactly 20 selectable six-frame chibi and preserves legacy IDs',()=>{
  const index=read('src/index.js');
  assert.match(index,/VERSION="V2\.63"/);
  assert.match(index,/const GAME_CHARACTER_COUNT=20;/);
  assert.match(index,/frameCount:6/);
  assert.match(index,/gameCharacterFrameRoute/);
  assert.match(index,/\/frame\/\(\[1-6\]\)/);
  assert.match(index,/\^character-\(\?:0\[1-9\]\|\[1-3\]\[0-9\]\|4\[0-2\]\)\$/);
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
  assert.match(live,/function gameCharacterFrameUrl\(id,frame=1\)/);
  assert.match(live,/const catalog=state\.gameCharacters/);
  assert.match(live,/state\.profileDraftGameCharacterId/);
  assert.match(live,/body:JSON\.stringify\(\{displayName,gameCharacterId\}\)/);
  assert.match(live,/dataset\.gmwwWalkCharacter/);
  assert.doesNotMatch(live,/gmwwAvatarWalkPreview/);
});

test('Village and GM use real frame swapping instead of fake paper rotation',()=>{
  const village=read('assets/village/village.mjs');
  const villageCss=read('assets/village/village.css');
  const app=read('server-game/current/app.js');
  const css=read('server-game/current/style.css');
  assert.match(village,/function walkFrameUrl\(characterId,frame=1\)/);
  assert.match(village,/img\.src=walkFrameUrl\(img\.dataset\.walkCharacter,frame\)/);
  assert.match(app,/playCharacterFrameUrl/);
  assert.match(app,/Math\.floor\(performance\.now\(\)\/115\)%6/);
  assert.doesNotMatch(villageCss,/@keyframes gmwwVillageWalk/);
  assert.doesNotMatch(css,/@keyframes gmwwChibiWalk/);
  assert.doesNotMatch(villageCss,/rotate\(-?2deg\)/);
});

test('GM room state is realtime WebSocket with polling only as fallback',()=>{
  const app=read('server-game/current/app.js');
  assert.match(app,/function connectPlaySocket\(\)/);
  assert.match(app,/new WebSocket\(base\+'\/ws\/'\+encodeURIComponent\(code\)\)/);
  assert.match(app,/d\.type!=='room_state'/);
  assert.match(app,/readyState!==WebSocket\.OPEN\)playSyncRoom\(false\)/);
  assert.match(app,/\},15000\)/);
});

test('V2.63 UI keeps dialogs above village, uses X close, compacts profile and removes obsolete lobby chrome',()=>{
  const live=read('src/gmww-members-live.js');
  const html=read('server-game/current/GMWW.html');
  const css=read('server-game/current/style.css');
  assert.match(live,/z-index:320!important/);
  assert.match(live,/#profile \.stats,#profile \.history,#profile \.section-title,#profile \.change-pass\{display:none!important\}/);
  assert.match(live,/gmwwProfileVillageBack'.*textContent='×'/s);
  assert.match(live,/gmwwRoomsVillageBack'.*textContent='×'/s);
  assert.doesNotMatch(live,/William/);
  assert.match(html,/id="playGameClose" type="button">×<\/button>/);
  assert.match(html,/id="playEndClose" type="button">×<\/button>/);
  assert.match(css,/\.sheet\{z-index:2200!important\}/);
});

test('Game Templates live in Library and V1.09 templates are migrated once',()=>{
  const html=read('server-game/current/GMWW.html');
  const app=read('server-game/current/app.js');
  assert.match(html,/data-lib="templates"/);
  assert.match(html,/id="lib-templates"/);
  assert.match(app,/async function migrateV109GameTemplates\(\)/);
  assert.match(app,/GMWW_V109_GAME_TEMPLATES/);
  assert.match(app,/GMWW_V1_09_GAME_TEMPLATES/);
  assert.match(app,/GMWW_V263_TEMPLATE_MIGRATION_DONE/);
  assert.match(app,/openLibraryGameTemplate/);
});


test('V2.63 migrates old play cache without resurrecting deleted players',()=>{
  const app=read('server-game/current/app.js');
  assert.match(app,/GMWW_PLAY_SCENE_KEY='GMWW_V263_PLAY_SCENE'/);
  assert.match(app,/GMWW_OLD_PLAY_SCENE_KEYS=\['GMWW_V257_PLAY_SCENE'/);
  assert.match(app,/if\(migratedFrom\)\{saved\.selectedMemberIds=\[\];saved\.assignmentsPreview=\[\];saved\.activePlayerId='';saved\.roleId='';saved\.artifactId=''\}/);
  assert.match(app,/if\(Number\(err\?\.status\)===404\)\{clearStalePlayRoom\(\)/);
});

test('IPA version and build are V2.63 / 263',()=>{
  const app=read('server-game/current/app.js');
  const html=read('server-game/current/GMWW.html');
  const project=read('server-game/GMWW-Server.xcodeproj/project.pbxproj');
  assert.match(app,/const VERSION='2\.63';/);
  assert.match(html,/GMWW V2\.63/);
  assert.match(project,/CURRENT_PROJECT_VERSION = 263;/);
  assert.match(project,/MARKETING_VERSION = 2\.63;/);
});
