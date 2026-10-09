import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const worker=fs.readFileSync('src/index.js','utf8');

test('V3.37 keeps seven-stage timeline above a smaller four-icon GM dock',()=>{
 assert.match(html,/id="playSetupStrip"/);
 assert.ok(html.indexOf('id="playSetupStrip"')<html.indexOf('id="playWorld"'));
 assert.ok(html.indexOf('id="gmTopMenu"')>html.indexOf('id="playWorld"'));
 const controls=['playExitVillage','playAutoGM','playPhasePill','playAudioTop','playEndGame'];
 for(const id of controls)assert.match(html,new RegExp('id="'+id+'"'));
 const menu=html.slice(html.indexOf('<nav class="gm-top-menu-v293'),html.indexOf('</nav>',html.indexOf('<nav class="gm-top-menu-v293'))+6);
 assert.doesNotMatch(menu,/<small>THOÁT<\/small>|<small>AUTO GM<\/small>|<small>AUDIO<\/small>|<small>KẾT THÚC<\/small>/);
 assert.match(menu,/id="playPhaseTitle"/);
 assert.match(css,/V3\.27 — smaller icon-only GM dock/);
 assert.match(css,/height:56px!important;min-height:56px!important/);
 assert.match(css,/height:44px!important;min-height:44px!important/);
 assert.match(css,/\.gm-top-small-v293>small\{display:none!important\}/);
});
test('V3.37 slides top timeline up and bottom dock down after 30 seconds, no abrupt opacity zero',()=>{
 assert.match(app,/const PLAY_GAME_CHROME_IDLE_MS=30000/);
 assert.match(app,/\[top,bottom,gather\]\.forEach/);
 assert.match(css,/transition:transform \.68s cubic-bezier/);
 assert.match(css,/#playSetupStrip\.play-setup-strip\.is-auto-hidden/);
 assert.match(css,/#gmTopMenu\.gm-top-menu-v293\.is-auto-hidden/);
 assert.match(css,/transform:translate3d\(0,calc\(100% \+ env\(safe-area-inset-bottom\) \+ 24px\),0\)!important/);
 assert.match(css,/opacity:\.94!important;pointer-events:none!important/);
 assert.match(app,/document\.addEventListener\('pointerdown',reveal/);
 assert.match(app,/document\.addEventListener\('touchstart',reveal/);
});
test('V3.37 displays working gathering tools directly inside village stage',()=>{
 assert.match(html,/id="playGatherToolbar"/);
 assert.match(html,/id="playGatherCall"/);
 assert.match(html,/id="playGatherRandom"/);
 assert.match(html,/id="playGatherManual"/);
 assert.match(html,/id="playGatherConfirm"/);
 assert.match(html,/id="playGatherClose"/);
 assert.match(app,/function renderPlayGatherToolbar\(\)/);
 assert.match(app,/renderPlayCards\(\);renderPlayGatherToolbar\(\)/);
 assert.match(app,/async function playGatherCallMembers\(\)/);
 assert.match(app,/await playCallOnlineMembers\(\)/);
 assert.match(app,/async function playGatherRandomize\(\)/);
 assert.match(app,/await playRandomSeatRemaining\(\)/);
 assert.match(app,/function playGatherManual\(\)/);
 assert.match(app,/openPlaySeatSheet\(\)/);
 assert.match(app,/async function playGatherConfirm\(\)/);
 assert.match(app,/await playFinishSeating\(\)/);
 assert.match(app,/if\(step==='seats'\)\{playGatherToolsDismissed=false;renderPlayGatherToolbar\(\);return\}/);
 assert.match(app,/getElementById\('playGatherCall'\)\?\.addEventListener/);
});
test('V3.37 tapping the active gathering step reopens its controls',async()=>{
 const from=app.indexOf('async function handlePlayTimelineStep(step)');
 const until=app.indexOf('function initPlayScene()',from);
 assert.ok(from>=0&&until>from);
 const hits=[];
 const ctx={playSceneRuntime:{busy:false},playSceneState:{step:'seats'},PLAY_STEPS:['lobby','room','seats','game','roles','deal','battle'],playGatherToolsDismissed:true,
 renderPlayGatherToolbar(){hits.push('visible')},playFlashError(){hits.push('error')}};
 vm.createContext(ctx);
 await vm.runInContext(app.slice(from,until)+'\nhandlePlayTimelineStep("seats")',ctx);
 assert.equal(ctx.playGatherToolsDismissed,false);
 assert.deepEqual(hits,['visible']);
});
test('V3.37 runtime updates V3.17 native shell without forcing IPA install',()=>{
 assert.equal(pkg.version,'3.60.0');
 assert.match(app,/const VERSION='3\.60'/);
 assert.match(worker,/VERSION="V3\.60",NATIVE_SHELL_VERSION="3\.17",UPDATE_CHANNEL_REV="runtime-360"/);
});
