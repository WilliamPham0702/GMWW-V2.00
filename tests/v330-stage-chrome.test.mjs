import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const html=read('server-game/current/GMWW.html');
const css=read('server-game/current/style.css');
const app=read('server-game/current/app.js');
const worker=read('src/index.js');
const pkg=JSON.parse(read('package.json'));
test('V3.30 presents the seven-stage timeline above the game, and five controls below',()=>{
 const timeline=html.indexOf('id="playSetupStrip"'),world=html.indexOf('id="playWorld"'),dock=html.indexOf('id="gmTopMenu"');
 assert.ok(timeline>=0&&timeline<world&&world<dock);
 const bar=html.slice(html.indexOf('<nav class="gm-top-menu-v293'),html.indexOf('</nav>',dock)+6);
 const ids=['playExitVillage','playAutoGM','playPhasePill','playAudioTop','playEndGame'];
 assert.deepEqual((bar.match(/<button\b/g)||[]).length,5);
 for(const id of ids)assert.ok(bar.includes('id="'+id+'"'),id);
 assert.doesNotMatch(html,/id="playBack"|id="playNext"|id="playPrimaryAction"|play-control-bar-three/);
 assert.match(html,/class="play-setup-strip gm-stage-timeline-v330"/);
 assert.match(html,/gm-bottom-menu-v325 gm-stage-dock-v330/);
});
test('Top and bottom use the same transparent frosted style, with safe-area and generous tap targets',()=>{
 assert.match(css,/--gmww-stage-glass-v330:linear-gradient/);
 assert.match(css,/#playSetupStrip\.gm-stage-timeline-v330,[\s\S]*?#gmTopMenu\.gm-stage-dock-v330\{/);
 assert.match(css,/background:var\(--gmww-stage-glass-v330\)!important/);
 assert.match(css,/top:calc\(env\(safe-area-inset-top\) \+ 9px\)!important/);
 assert.match(css,/bottom:calc\(env\(safe-area-inset-bottom\) \+ 9px\)!important/);
 assert.match(css,/min-height:48px!important/);
 assert.match(css,/backdrop-filter:blur\(13px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test('V3.37 OTA delivers review controls on the existing V3.17 native shell',()=>{
 assert.equal(pkg.version,'3.81.0');
 assert.match(app,/const VERSION='3\.81'/);
 assert.match(html,/<title>GMWW V3\.81<\/title>/);
 assert.match(worker,/VERSION="V3\.81",NATIVE_SHELL_VERSION="3\.17",UPDATE_CHANNEL_REV="runtime-381"/);
});
