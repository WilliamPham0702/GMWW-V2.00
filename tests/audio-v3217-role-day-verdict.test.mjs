import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=path=>fs.readFileSync(path,'utf8');
const audio=read('server-game/src/30-village-and-setup.part');
const battle=read('server-game/src/40-battle-and-timeline.part');
const library=read('server-game/src/10-library-and-settings.part');
const html=read('server-game/current/GMWW.html');

test('V3.217 legacy source-18 resolves to the actual Old Witch voice slot',()=>{
  const start=audio.indexOf('function battleFindAudio('),end=audio.indexOf('async function battleWarmAudio(',start);
  assert.ok(start>=0&&end>start);
  const ctx={state:{audio:{cards:[{id:'audio_card_role_old_witch',targetId:'role_old_witch',sourceKey:'ROLE:source-18',name:'Phù Thuỷ Già'}]}}};
  vm.runInNewContext(audio.slice(start,end)+';globalThis.find=battleFindAudio',ctx);
  assert.equal(ctx.find('cards','source-18','Phù Thuỷ Già').targetId,'role_old_witch');
  assert.equal(ctx.find('cards','role_old_witch','Phù Thuỷ Già').targetId,'role_old_witch');
  assert.match(audio,/bundledAudioBlob\(\{sourceKey:'ROLE:source-18'\}\)/);
  assert.match(audio,/battleState\.lastAudioTurnKey=expectedKey/);
});

test('V3.217 Day narration starts on actual Day, not optional Night wake-up',()=>{
  const start=battle.indexOf('function battleMorningPlayAudio('),end=battle.indexOf('function battleMorningShow(',start);
  assert.ok(start>=0&&end>start);
  const fn=battle.slice(start,end);
  assert.ok(fn.indexOf("queue.push(['audio_system_day_wakeup'")>=0);
  assert.ok(fn.indexOf("queue.push(['audio_system_day_wakeup'")<fn.indexOf("queue.push(['audio_system_gallows_day_long'"));
  const wakeStart=battle.indexOf('function battlePlayWakeupAndAdvance('),wakeEnd=battle.indexOf('function battleWolfOutcomeText(',wakeStart);
  assert.ok(wakeStart>=0&&wakeEnd>wakeStart);
  assert.doesNotMatch(battle.slice(wakeStart,wakeEnd),/battlePlayConfiguredAudio/);
});

test('V3.217 Chốt Sống/Chết are distinct System Audio slots, not Gallows uploads',()=>{
  assert.match(library,/audio_system_gallows_result_saved','👍 CHỐT SỐNG'/);
  assert.match(library,/audio_system_gallows_result_dead','👎 CHỐT CHẾT'/);
  assert.match(library,/replaceAudioItem\(item,'system'\)/);
  assert.match(library,/const kind=String\(category\|\|'system'\)/);
  assert.doesNotMatch(html,/data-gallows-audio-upload/);
  assert.match(battle,/audio_system_gallows_result_dead':'audio_system_gallows_result_saved/);
});

test('V3.217 audio release keeps six-part GM app exactly assembled',()=>{
  const parts=['00-core-and-library.part','10-library-and-settings.part','20-members-and-roster.part',
    '30-village-and-setup.part','40-battle-and-timeline.part','50-roles-and-artifacts.part'];
  assert.equal(read('server-game/current/app.js'),parts.map(x=>read('server-game/src/'+x)).join(''));
  assert.match(read('server-game/src/00-core-and-library.part'),/const VERSION='3\.217'/);
  assert.match(read('src/index.js'),/VERSION="V3\.217"/);
});
