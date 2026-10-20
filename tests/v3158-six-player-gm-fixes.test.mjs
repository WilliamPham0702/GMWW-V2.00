import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {timelineDisplaySteps} from '../src/gmww-night-turn-rules.js';
import {assertCurrentRelease} from './release-metadata-helper.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('V3.158 uses V3.110 IPA shell and reproducible GM Runtime',()=>{
  assertCurrentRelease();
  assert.equal(read('server-game/current/app.js'),
    ['00-core-and-library.part','10-library-and-settings.part','20-members-and-roster.part','30-village-and-setup.part','40-battle-and-timeline.part','50-roles-and-artifacts.part']
      .map(n=>read('server-game/src/'+n)).join(''));
  // Current HTML version is verified by assertCurrentRelease.
});

test('GM fire menu offers 3 independently persisted one-tap label toggles',()=>{
  const html=read('server-game/current/GMWW.html'),js=read('server-game/current/app.js'),css=read('server-game/current/style.css');
  for(const kind of ['Artifact','Role','Player']){
    assert.match(html,new RegExp('id="battleLabel'+kind+'"[^>]*aria-pressed="true"'));
    assert.match(js,new RegExp("battleLabel"+kind));
  }
  assert.match(js,/GMWW_GM_LABEL_KEY/);assert.match(js,/localStorage\.setItem\(GMWW_GM_LABEL_KEY/);
  for(const x of ['artifact','role','player'])assert.ok(css.includes('gmww-hide-'+x+'-label'));
  assert.match(css,/#start #playShell\.gmww-hide-player-label/);
  assert.doesNotMatch(read('assets/village/village.mjs'),/gmww-hide-role-label/);
});

test('Character40 canvas on GM is transparent, with no legacy cyan oval',()=>{
  const css=read('server-game/current/style.css'),runtime=read('server-game/current/gmww-shared-motion.js');
  assert.match(css,/\.play-player-avatar > span\.gmww40-character\s*\{[^}]*background:transparent!important/s);
  assert.match(runtime,/root\.className='gmww40-character'/);
});

test('Player Web supports smooth fallback position interpolation on every snapshot',()=>{
  const code=read('assets/village/village.mjs');
  assert.match(code,/visualLastPaintedPositions=new Map/);
  assert.match(code,/const painted=visualLastPaintedPositions\.get\(id\)/);
  assert.match(code,/visualLastPaintedPositions\.set\(String\(data\.id\),\{x:pos\.x,y:pos\.y\}\)/);
  assert.match(code,/moveStartedAt:now,moveDurationMs:duration/);
  assert.match(code,/liveDisplaySeatId\(p,visualSeats\)/);
});

test('Opening Artifact countdown is 30 seconds and absent without an assigned Artifact',()=>{
  const worker=read('src/index.js'),gm=read('server-game/current/app.js');
  assert.match(worker,/earlyArtifactSec=30/);
  assert.match(worker,/if\(artifactRows\.length>0\)/);
  assert.match(gm,/earlyArtifactSec:30/);
  assert.match(gm,/if\(earlySec\)earlySec\.value=30/);
  assert.ok(!timelineDisplaySteps([{kind:'wolf-introduction',label:'Sói'}]).some(x=>x.kind==='early-artifact-window'));
  assert.ok(timelineDisplaySteps([{kind:'early-artifact-window',label:'Artifact đầu ván',actions:[]}]).some(x=>x.kind==='early-artifact-window'));
});
