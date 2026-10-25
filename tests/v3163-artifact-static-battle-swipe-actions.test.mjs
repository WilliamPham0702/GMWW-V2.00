import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync('server-game/current/GMWW.html','utf8');
const gm=readFileSync('server-game/current/app.js','utf8');
const authored=readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const gmMotion=readFileSync('server-game/src/30-village-and-setup.part','utf8');
const css=readFileSync('server-game/current/style.css','utf8');
const village=readFileSync('assets/village/village.mjs','utf8');
const playerCss=readFileSync('assets/village/village.css','utf8');
const shared=readFileSync('server-game/current/gmww-shared-motion.js','utf8');
const between=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));

test('Chọn Ván Mẫu owns per-match Artifact switch; including the Artifact pool',()=>{
 const editor=between(html,'<div class="play-template-editor-only">','<div class="play-template-play-review">');
 const review=between(html,'<div class="play-template-play-review">','<div class="button-row play-roster-actions">');
 assert.doesNotMatch(editor,/id="playArtifactsEnabled"/);
 assert.doesNotMatch(editor,/id="playGameArtifactPicker"/);
 assert.match(review,/id="playArtifactsEnabled"/);
 assert.match(review,/CÓ SỬ DỤNG ARTIFACT/);
 assert.match(review,/id="playGameArtifactPicker"/);
 const saved=between(gm,'async function savePlayGame(){','function playRandomInt(max)');
 assert.match(saved,/const artifactConfig=playMatchArtifactConfig\(\)/);
 assert.match(saved,/timing,\.\.\.artifactConfig/);
 assert.match(saved,/artifactsEnabled:false,artifacts:\[\]/);
 assert.match(gm,/playSceneState\.artifactsEnabled=!!e\.currentTarget\.checked;/);
});

test('Timing panels are collapsed by default, with all timing inputs intact',()=>{
 assert.match(html,/<details class="play-template-collapsible" id="playGameTimingDetails">/);
 assert.match(html,/<details class="play-template-collapsible" id="playRoleTimingDetails">/);
 for(const id of ['playVillageDiscussionSec','playDefaultActionSec','playWolfDiscussionSec','playEarlyArtifactSec','playGameRoleTimingList'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.doesNotMatch(html,/<button id="playGameClose"/);
 assert.doesNotMatch(html,/id="playGallowsNominationSec"|id="playGallowsVoteSec"/);
 assert.match(gm,/detailId of \['playGameTimingDetails','playRoleTimingDetails'\]/);
 assert.match(gm,/if\(e\.target===document\.getElementById\('playGameSheet'\)\)closePlayGameSheet\(\)/);
});

test('GM battle characters use paused idle, never walk, run, sit, or schedule movement',()=>{
 assert.match(gmMotion,/const battleStatic=playSceneState\.step==='battle'/);
 assert.match(gmMotion,/paused:effect==='dead'\|\|\(battleStatic&&!hanging\)/);
 assert.match(gmMotion,/function playSeatMovementActive\(member\)\{[\s\S]*?if\(playSceneState\.step==='battle'\)return false/);
 assert.match(gmMotion,/function syncPlayMovementTicker\(\)\{[\s\S]*?if\(playSceneState\.step==='battle'\)\{stopPlayMovementTicker\(\);return\}/);
 assert.match(shared,/root\._gmwwPaused=command\.paused===true\|\|command\.state==='dead'/);
});

test('Player Web battle state cancels walking and rig animation while preserving gameplay FX',()=>{
 assert.match(village,/battleStatic=room\.playerSceneMode==='battle'\|\|/);
 assert.match(village,/if\(battleStatic\)\{p\.movementStatus='idle';p\.villageActivity='idle';\}/);
 assert.match(village,/if\(battleStatic\)\{visualFallbackMoves\.clear\(\);visualLastPaintedPositions\.clear\(\);return incoming\}/);
 assert.match(village,/if\(!battleStatic&&villageMotionNeedsFrame\(all\)/);
 assert.match(village,/if\(document\.hidden\|\|battleStatic\)return/);
 assert.match(playerCss,/body\.player-battle \.player:not\(\.gmww-gallows-hanging\) \.portrait\.game-character/);
 assert.match(playerCss,/animation:none!important/);
 assert.doesNotMatch(playerCss,/player-battle.*gmww-sv-overlay/);
});

test('Full-width action tray scrolls on horizontal swipe; vertical pull still target-drags',()=>{
 assert.match(css,/#battleActionPrevious,[\s\S]*?#battleActionNext\{[\s\S]*?display:none!important/);
 assert.match(css,/#battleActionBar\.battle-action-scroll\{[\s\S]*?scroll-snap-type:none!important/);
 assert.match(authored,/d\.mode=battleActionGestureMode\(dx,dy\)/);
 assert.match(authored,/if\(d\.mode==='scroll'\)\{[\s\S]*?bar\.scrollLeft=d\.scrollStart-dx/);
 assert.match(authored,/if\(d\.mode==='scroll'\)return;/);
 assert.match(authored,/if\(hit\.id\)battlePickTargetWithAudio\(hit\.id,d\.id\)/);
 const start=gm.indexOf('function battleActionGestureMode(dx,dy){');
 const end=gm.indexOf('function battleNavigateActions(direction){',start);
 assert.ok(start>=0&&end>start);
 const decide=vm.runInNewContext(gm.slice(start,end)+';battleActionGestureMode;');
 assert.equal(decide(-130,8),'scroll');
 assert.equal(decide(130,-5),'scroll');
 assert.equal(decide(8,-80),'drag');
 assert.equal(decide(-30,-85),'drag');
});
