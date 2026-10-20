import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const worker=fs.readFileSync('src/index.js','utf8');

test('V3.157: tapping the firepit opens an untitled menu with a usable drag grip',()=>{
  assert.match(html,/<div id="battleWolfMenu"[^>]*aria-label="Menu đống lửa"/);
  assert.match(html,/<header aria-label="Giữ và kéo để di chuyển menu"><span class="battle-menu-grip"/);
  assert.doesNotMatch(html,/<strong>🐺 CÔNG CỤ GM<\/strong>/);
  assert.match(source,/battleBindAuxiliaryDrag\('battleWolfMenu','header'\)/);
  assert.match(source,/if\(battleState\.wolfOpen&&!inside\('#battleWolfMenu,\.play-core-pearl'\)\)/);
  for(const control of ['battleGMAudio','battleGMAuto','battleQuickRevive','battleQuickKill','battleExit','battleForceEnd'])
    assert.match(html,new RegExp('id="'+control+'"'));
});

test('V3.157: horizontal firepit menu stays within the mobile viewport and reaches final action',()=>{
  assert.match(css,/width:min\(94vw,520px\)!important/);
  assert.match(css,/max-width:calc\(100vw - 12px\)!important/);
  assert.match(css,/box-sizing:border-box!important;min-width:0!important;width:100%!important/);
  assert.match(css,/max-width:100%!important;overflow-x:auto!important;overflow-y:hidden!important/);
  assert.match(css,/touch-action:pan-x!important;padding-right:14px!important/);
  assert.match(css,/flex-shrink:0!important;touch-action:pan-x!important/);
});

test('V3.157: actor/target markers are first inside each player info stack, before status and name',()=>{
  const begin=source.indexOf('function battleMarkPlayers(){');
  const end=source.indexOf('\nfunction renderPlayBattle()',begin);
  assert.ok(begin>=0&&end>begin);
  const body=source.slice(begin,end);
  assert.match(body,/const labels=el\.querySelector\('\.play-player-over'\)/);
  assert.match(body,/labels\.prepend\(mark\)/);
  assert.match(body,/mark\.after\(targetMark\)/);
  assert.match(body,/labels\.prepend\(targetMark\)/);
  assert.match(body,/else targetMark\?\.remove\(\)/);
  assert.doesNotMatch(body,/el\.appendChild\(mark\)/);
  assert.match(css,/\.play-player-over>\.battle-turn-mark,/);
  assert.match(css,/\.play-player-over>\.battle-target-mark/);
  assert.match(css,/position:static!important/);
  assert.match(css,/\.play-player-token\.is-battle-target::after\{\s*content:none!important/);
});

test('current: exactly assembled GM runtime and Worker version agree for OTA',()=>{
  const version=JSON.parse(fs.readFileSync('package.json','utf8')).version.replace(/\\.0$/,'');
  const rev='runtime-'+version.replaceAll('.','');
  assert.ok(app.includes("const VERSION='"+version+"';"));
  assert.ok(worker.includes('VERSION="V'+version+'",NATIVE_SHELL_VERSION="3.110",UPDATE_CHANNEL_REV="'+rev+'"'));
  assert.ok(html.includes('<title>GMWW V'+version+'</title>'));
  assert.match(version,/^3\.\\d+$/);
  const parts=['00-core-and-library.part','10-library-and-settings.part','20-members-and-roster.part',
    '30-village-and-setup.part','40-battle-and-timeline.part','50-roles-and-artifacts.part'];
  assert.equal(app,parts.map(name=>fs.readFileSync('server-game/src/'+name,'utf8')).join(''));
});
