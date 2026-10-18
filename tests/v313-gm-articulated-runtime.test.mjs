import {assertCurrentRelease} from './release-metadata-helper.mjs';
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
  assertCurrentRelease();
  assert.match(project,/CURRENT_PROJECT_VERSION = 3110;/);
  assert.match(project,/MARKETING_VERSION = 3\.110;/);
  assertCurrentRelease();
});

test('V3.143: no GM wolf actor is mounted in either view',()=>{
  assert.doesNotMatch(html,/id="gmWolfCharacter"/);
  assert.doesNotMatch(app,/data-gm-wolf-runtime="1"/);
  assert.doesNotMatch(app,/function renderPlayGmToken/);
  assert.match(server,/\/api\/gm-presence/);
  assert.match(app,/battleToggleWolfMenu/);
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
