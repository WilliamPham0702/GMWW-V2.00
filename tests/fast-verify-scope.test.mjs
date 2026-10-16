import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {requiresIsolatedCharacterLabVerification as requireLab} from '../.github/scripts/fast-verify-scope.mjs';

test('UI-only Runtime fixes skip unrelated Character V4/V5 3D laboratories',()=>{
  assert.equal(requireLab(['server-game/current/app.js','server-game/current/style.css']),false);
  assert.equal(requireLab(['tests/gm-roster-presence-filter.test.mjs']),false);
});
test('asset, routing, or deploy changes require complete laboratory checks',()=>{
  for(const path of ['assets/characters/v4/skin.html','assets/characters/v5/index.html',
    'src/index.js','wrangler.jsonc','.github/workflows/deploy-production.yml',
    '.github/scripts/fast-verify-scope.mjs']){
    assert.equal(requireLab([path]),true,path);
  }
});
test('unknown changes and manual deployment fail closed',()=>{
  assert.equal(requireLab([]),true);
  assert.equal(requireLab(null),true);
  assert.equal(requireLab(['server-game/current/app.js'],{manual:true}),true);
});
test('Player Web core checks still run on GM UI and Production workflow edits',()=>{
  const worker=fs.readFileSync('.github/workflows/check-player-web.yml','utf8');
  const character=fs.readFileSync('.github/workflows/check-character-engine.yml','utf8');
  assert.match(worker,/server-game\/current\/\*\*/);
  assert.match(worker,/\.github\/workflows\/deploy-production\.yml/);
  assert.match(worker,/npm test/);
  assert.match(character,/server-game\/current\/character-renderer\.js/);
  assert.doesNotMatch(character,/^\s*- "server-game\/current\/app\.js"/m);
});
