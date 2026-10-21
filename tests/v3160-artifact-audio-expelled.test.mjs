import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildNightQueue} from '../src/gmww-game-scene-rules.js';
import {assertCurrentRelease} from './release-metadata-helper.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('V3.160 runtime is consistent, IPA shell remains untouched',()=>{
  assertCurrentRelease();
  const worker=read('src/index.js');
  assert.match(worker,/NATIVE_SHELL_VERSION="3\.110"/);
  // assertCurrentRelease verifies the current channel revision.
});

test('Opening Artifact time is 30 seconds in GM template and authoritative Worker',()=>{
  const html=read('server-game/current/GMWW.html'),
    gm=read('server-game/current/app.js'),worker=read('src/index.js');
  assert.match(html,/id="playEarlyArtifactSec"[^>]*value="30"/);
  assert.doesNotMatch(html,/id="playEarlyArtifactSec"[^>]*value="60"/);
  assert.match(gm,/earlyArtifactSec:30/);
  assert.match(gm,/if\(earlySec\)earlySec\.value=30/);
  assert.match(worker,/earlyArtifactSec=30/);
  assert.equal(buildNightQueue({night:1}).some(x=>x.kind==='early-artifact-window'),false);
  assert.equal(buildNightQueue({night:1,artifactOwners:[{playerId:'member:p',artifactId:'a',priorityFirst:true}]}).some(x=>x.kind==='early-artifact-window'),true);
});

test('GM fire menu begins with 3 stateful one-tap label switches',()=>{
  const html=read('server-game/current/GMWW.html'),gm=read('server-game/current/app.js');
  const row=html.match(/<div class="battle-wolf-actions"[^>]*>([\s\S]*?)<\/div>/)?.[1]||'';
  const order=[...row.matchAll(/id="(battle\w+)"/g)].map(x=>x[1]);
  assert.deepEqual(order.slice(0,1),['battleDemoToggle']);
  assert.deepEqual(order.filter(id=>id.startsWith('battleLabel')).slice(0,3),['battleLabelArtifact','battleLabelRole','battleLabelPlayer']);
  assert.match(gm,/menuRow\.scrollLeft=0/);
  assert.match(gm,/button\.setAttribute\('aria-pressed',String\(enabled\)\)/);
  assert.match(gm,/button\.textContent=label/);
});

test('First swipe from Wolves to early Artifact warms its cue before async turn navigation',()=>{
  const gm=read('server-game/current/app.js');
  assert.match(gm,/if\(upcomingCue\)[\s\S]{0,260}battleWarmAudio\(upcomingCue\.kind,upcomingAudio\)/);
  assert.match(gm,/if\(audio\)await battleWarmAudio\(kind,audio\)/);
  assert.match(gm,/battleState\.key!==expectedKey/);
  assert.match(gm,/battleUnlockAudioFromGesture\(\)/);
  assert.match(gm,/targetId:'audio_system_early_artifacts',name:'Artifact đầu ván'/);
});

test('Expelled actors cannot act; expelled people remain targetable with no applied night effects',()=>{
  const gm=read('server-game/current/app.js'),worker=read('src/index.js'),
    rules=read('server-game/current/battle-controls.js');
  assert.match(gm,/\['dead','frozen','expelled'\]\.includes\(playPlayerEffect\(loginId\)\)/);
  assert.match(gm,/function battlePickTarget\(id,actionId\)/);
  assert.match(worker,/if\(isExpelled\(actorId\)\)[\s\S]{0,170}ACTOR_EXPELLED/);
  assert.match(worker,/effectiveTargets=targets\.filter\(id=>!isExpelled\(id\)\)/);
  assert.match(worker,/noEffect:true,reason:"EXPELLED"/);
  assert.match(rules,/return nightVictim\|\|action\.allowDead\|\|effect!=="dead"/);
  assert.match(rules,/return effect==="dead"\|\|effect==="expelled"/);
});

test('Expelled day target is permitted but has no action effect',()=>{
  const worker=read('src/index.js');
  assert.match(worker,/effectiveTargets=targets\.filter\(id=>!affected\(id,"expelled"\)\)/);
  assert.match(worker,/if\(targets\.length&&effectiveTargets\.length===0\)/);
  assert.match(worker,/result=\{message,noEffect:true\}/);
  assert.match(worker,/DAY_ACTOR_BLOCKED/);
  assert.doesNotMatch(worker,/affected\(x,"expelled"\)\)\s*return j\(\{ok:false,error:"DAY_TARGET_NOT_ELIGIBLE"/);
});
