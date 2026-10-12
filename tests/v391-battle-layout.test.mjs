import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectVerifiedRuntimeV391Delta} from '../src/gmww-ota-delta.js';
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const part=html.split('<section id="playBattleTop"')[1]?.split('<nav class="gm-top-menu-v293')[0]||'';
test('battle top has only back, Timeline and next icon; force-end moved below',()=>{
  const top=part.split('</section>')[0];
  assert.match(top,/id="battleBack"/);
  assert.match(top,/id="battleTimeline"/);
  assert.match(top,/id="battleAdvance"/);
  assert.doesNotMatch(top,/id="battleForceEnd"/);
});
test('compact bottom groups all approved GM controls without always-open overlay',()=>{
  for(const id of ['battleClockButton','battleCountdown','battleGMAuto','battleExit','battleForceEnd','battleGMAudio','battleQuickRevive','battleQuickKill','battleDetails'])
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  assert.doesNotMatch(part,/class="battle-menu-wolf"/);
  assert.match(part,/id="battleDetails"[^>]*hidden/);
  assert.match(css,/#playBattleDock[^{]*\{/);
  assert.match(css,/#battleDetails\[hidden\]\{display:none!important\}/);
});
test('all bottom controls are wired, quick-kill and revive require explicit confirmation',()=>{
  for(const id of ['battleExit','battleQuickRevive','battleQuickKill','battleGMAuto','battleGMAudio'])
    assert.match(app,new RegExp("getElementById\\('"+id+"'\\)\\?\\.addEventListener"));
  assert.match(app,/async function battleQuickApply\(loginId\)/);
  assert.match(app,/confirm\('GM xác nhận '/);
  assert.match(app,/playRoomApi\('\/interaction'/);
});
test('V3.90 IPA can safely OTA just UI source to V3.91',()=>{
  const paths=['GMWW.html','app.js','style.css'];
  const manifest={releaseType:'runtime',releaseVersion:'3.91',runtimeVersion:'3.91',shellVersion:'3.17',delete:[],runtime:{files:paths.map(path=>({path,url:'https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.91/'+path,sha256:'a'.repeat(64)}))}};
  assert.deepEqual(selectVerifiedRuntimeV391Delta(manifest,'3.90')?.runtime.files.map(x=>x.path),paths);
  assert.equal(selectVerifiedRuntimeV391Delta(manifest,'3.89'),null);
  assert.equal(selectVerifiedRuntimeV391Delta({...manifest,delete:['game-data']},'3.90'),null);
});
