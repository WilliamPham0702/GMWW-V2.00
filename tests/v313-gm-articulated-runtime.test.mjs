import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const gmCss=fs.readFileSync('server-game/current/style.css','utf8');
const village=fs.readFileSync('assets/village/village.mjs','utf8');
const villageCss=fs.readFileSync('assets/village/village.css','utf8');
const server=fs.readFileSync('src/index.js','utf8');
const project=fs.readFileSync('server-game/GMWW-Server.xcodeproj/project.pbxproj','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));
const asset=fs.readFileSync('assets/gm/gm-white-wolf.webp');

test('V3.17 runtime is bundled in the V3.17 native shell',()=>{
  assert.match(app,/const VERSION='3\.18'/);
  assert.match(html,/<title>GMWW V3\.18<\/title>/);
  assert.match(server,/VERSION="V3\.18",NATIVE_SHELL_VERSION="3\.17",UPDATE_CHANNEL_REV="runtime-318"/);
  assert.match(project,/CURRENT_PROJECT_VERSION = 317;/);
  assert.match(project,/MARKETING_VERSION = 3\.17;/);
  assert.equal(pkg.version,'3.18.0');
  assert.equal(lock.version,'3.18.0');
  assert.equal(lock.packages?.['']?.version,'3.18.0');
});

test('GM has one runtime actor with articulated white-wolf segments in both views',()=>{
  assert.doesNotMatch(html,/id="gmWolfCharacter"/);
  assert.doesNotMatch(app,/function gmWolfSetMotion/);
  assert.match(app,/data-gm-wolf-runtime="1"/);
  assert.match(village,/gmActionFor/);
  for(const part of ['gm-wolf-body','gm-wolf-rear-legs','gm-wolf-front-legs','gm-wolf-head']){
    assert.match(app,new RegExp(part));
    assert.match(village,new RegExp(part));
  }
  for(const action of ['idle','walk','run','shake','howl']){
    assert.match(app,new RegExp('gm-action-'+action));
    assert.match(gmCss,new RegExp('gm-action-'+action));
    assert.match(villageCss,new RegExp('gm-action-'+action));
  }
});

test('GM wolf legs and head have independent runtime motion',()=>{
  for(const motion of ['gmWolfRuntimeWalkRear','gmWolfRuntimeWalkFront','gmWolfRuntimeRunRear','gmWolfRuntimeRunFront','gmWolfRuntimeShakeHead','gmWolfRuntimeHowlHead']){
    assert.match(gmCss,new RegExp('@keyframes '+motion));
    assert.match(villageCss,new RegExp('@keyframes '+motion));
  }
  assert.match(village,/gm_manual"\?"run":"walk"/);
});

test('HD transparent GM rider master remains packaged as a real WebP',()=>{
  assert.ok(asset.length>50000);
  assert.equal(asset.subarray(0,4).toString('ascii'),'RIFF');
  assert.equal(asset.subarray(8,12).toString('ascii'),'WEBP');
});
