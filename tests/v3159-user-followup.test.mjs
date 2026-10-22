import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {liveDisplaySeatId} from '../assets/village/village.mjs';
import {buildNightQueue} from '../src/gmww-game-scene-rules.js';
import {assertCurrentRelease} from './release-metadata-helper.mjs';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('V3.160 release metadata is aligned and native shell stays V3.110',()=>{
  assertCurrentRelease();
  const worker=read('src/index.js');
  assert.match(worker,/NATIVE_SHELL_VERSION="3\.110"/);
});

test('unseated character stays free to interpolate even when a preview Seat is projected',()=>{
  assert.equal(liveDisplaySeatId({id:'member:a',seatId:null},{'member:a':10}),null);
  assert.equal(liveDisplaySeatId({id:'member:a',seatId:0},{'member:a':10}),null);
  assert.equal(liveDisplaySeatId({id:'member:a',seatId:7},{'member:a':7}),7);
  assert.equal(liveDisplaySeatId({id:'member:a',seatId:7},{'member:a':8}),8);
  const village=read('assets/village/village.mjs');
  assert.equal((village.match(/p\.displaySeatId=liveDisplaySeatId\(p,visualSeats\);/g)||[]).length,2);
  assert.match(village,/if\(!Number\(data\?\.seatId\|\|0\)\)return true;/);
  assert.match(village,/if\(active\)moveFrame=requestAnimationFrame\(animateMovementFrame\)/);
});

test('GM chibi Canvas is transparent and normal tokens do not show cyan glow',()=>{
  const css=read('server-game/current/style.css');
  assert.match(css,/#playShell:not\(\[data-step="battle"\]\).*?\.play-player-avatar:has\(>span\.gmww40-character\)/s);
  assert.match(css,/\.play-player-avatar>span\.gmww40-character canvas\s*\{\s*background:transparent!important/s);
});

test('fire menu has three concise pressed-state switches in SAME actions row',()=>{
  const html=read('server-game/current/GMWW.html'),gm=read('server-game/current/app.js'),css=read('server-game/current/style.css');
  const row=html.match(/<div class="battle-wolf-actions"[^>]*>([^]*?)<\/div>/)?.[1]||'';
  for(const [kind,label] of [['Artifact','Artifact'],['Role','Vai Trò'],['Player','Người Chơi']]){
    assert.match(row,new RegExp('id="battleLabel'+kind+'"[^>]*aria-pressed="true"[^>]*>'+label+'<\\/button>'));
  }
  assert.doesNotMatch(html,/<div class="battle-gm-label-toggles"/);
  assert.match(css,/\.battle-wolf-actions>button:is\(#battleLabelArtifact,#battleLabelRole,#battleLabelPlayer\)/);
  assert.match(gm,/button\.textContent=label;/);
  assert.doesNotMatch(gm,/button\.textContent=\(enabled\?'● ':'○ '\)\+label\+' '\+\(enabled\?'ON':'OFF'\)/);
});

test('Artifact first window and Ván Mẫu default are both 30 seconds',()=>{
  const html=read('server-game/current/GMWW.html'),gm=read('server-game/current/app.js'),worker=read('src/index.js');
  assert.match(html,/id="playEarlyArtifactSec"[^>]*value="30"/);
  assert.match(gm,/earlyArtifactSec:30/);
  assert.match(gm,/if\(earlySec\)earlySec\.value=30/);
  assert.match(worker,/earlyArtifactSec=30/);
  assert.match(worker,/kind:"early-artifact-window",label:"Artifact đầu ván",durationSec:earlyArtifactSec/);
  assert.match(worker,/if\(artifactRows\.length>0\)/);
  assert.equal(buildNightQueue({night:1}).some(t=>t.kind==='early-artifact-window'),false);
  assert.equal(buildNightQueue({night:1,artifactOwners:[{playerId:'p',artifactId:'a',artifactName:'Đá Hoán Đổi',priorityFirst:true}]}).some(t=>t.kind==='early-artifact-window'),true);
});
