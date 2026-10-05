import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('V2.65 keeps 20 selectable six-frame chibi and realtime room sync',()=>{
  const index=read('src/index.js'),live=read('src/gmww-members-live.js'),app=read('server-game/current/app.js');
  assert.ok(index.includes('VERSION="V2.65"'));
  assert.ok(index.includes('const GAME_CHARACTER_COUNT=20;'));
  assert.ok(index.includes('frameCount:6'));
  assert.ok(live.includes('function gameCharacterFrameUrl(id,frame=1)'));
  assert.ok(app.includes('function connectPlaySocket()'));
  let frames=0;
  for(let c=1;c<=20;c++)for(let f=1;f<=6;f++){
    const p=new URL('../assets/characters/walk-v263/character-'+String(c).padStart(2,'0')+'/frame-'+String(f).padStart(2,'0')+'.webp',import.meta.url);
    assert.ok(fs.statSync(p).size>0,p.pathname);frames++;
  }
  assert.equal(frames,120);
});

test('legacy character IDs 21-42 are accepted by frame route and mapped onto active 20-frame set',()=>{
  const index=read('src/index.js');
  assert.ok(index.includes('function activeGameCharacterId(v,seed="")'));
  assert.ok(index.includes('((n-1)%GAME_CHARACTER_COUNT)+1'));
  assert.ok(index.includes('gameCharacterFrameRoute'));
  assert.ok(index.includes('character-(?:0[1-9]|[1-3][0-9]|4[0-2])'));
  assert.ok(index.includes('/frame\\/([1-6])'));
  assert.ok(index.includes('const source=String(((Number(m[1])-1)%GAME_CHARACTER_COUNT)+1).padStart(2,"0")'));
});

test('accounts missing gameCharacterId receive a stable active character instead of disappearing',()=>{
  const index=read('src/index.js');
  assert.ok(index.includes('activeGameCharacterId(m.gameCharacterId,m.loginId)'));
  assert.ok(index.includes('activeGameCharacterId(p.gameCharacterId,p.loginId||p.participantId)'));
  assert.ok(index.includes('gameCharacterId:activeGameCharacterId(m.gameCharacterId,m.loginId),online:true'));
});

test('village renderer prioritizes six-frame character and has multi-step image fallback',()=>{
  const village=read('assets/village/village.mjs');
  assert.ok(village.includes('const characterId=rawCharacterId?'));
  assert.ok(village.includes('const characterUrl=trustedAvatarUrl(walkFrameUrl(characterId,walkFrameFor(data)))'));
  assert.ok(village.includes('const sources=[characterUrl,legacyUrl,safeDefault]'));
  assert.ok(village.includes('if(sourceIndex<sources.length){img.src=sources[sourceIndex];return}'));
  assert.ok(village.indexOf('characterUrl,legacyUrl,safeDefault')>=0);
});

test('V2.65 retains V2.64 corrected 3-column HUD and 5-column control bar',()=>{
  const css=read('server-game/current/style.css');
  assert.ok(css.includes('grid-template-columns:minmax(112px,1.25fr) minmax(82px,.85fr) 58px!important'));
  assert.ok(css.includes('grid-template-columns:38px 38px minmax(0,1fr) 38px 38px!important'));
  assert.ok(css.includes('.editor-back{grid-column:3!important;justify-self:end!important}'));
});

test('V2.65 retains stale-room reset from V2.64',()=>{
  const app=read('server-game/current/app.js');
  assert.ok(app.includes("GMWW_PLAY_SCENE_KEY='GMWW_V264_PLAY_SCENE'"));
  assert.ok(app.includes("saved.roomCode='—';saved.gmToken=''"));
  assert.ok(app.includes("saved.selectedMemberIds=[];saved.assignmentsPreview=[]"));
});

test('IPA version and build are V2.65 / 265',()=>{
  const app=read('server-game/current/app.js'),html=read('server-game/current/GMWW.html'),project=read('server-game/GMWW-Server.xcodeproj/project.pbxproj');
  assert.ok(app.includes("const VERSION='2.65';"));
  assert.ok(html.includes('GMWW V2.65'));
  assert.ok(project.includes('CURRENT_PROJECT_VERSION = 265;'));
  assert.ok(project.includes('MARKETING_VERSION = 2.65;'));
});
