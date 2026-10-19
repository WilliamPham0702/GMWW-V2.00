import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {requiresIsolatedCharacterLabVerification as requireLab} from '../.github/scripts/fast-verify-scope.mjs';

test('UI-only Runtime fixes skip unrelated Character V4/V5 3D laboratories',()=>{
  assert.equal(requireLab(['server-game/current/app.js','server-game/current/style.css']),false);
  assert.equal(requireLab(['tests/gm-roster-presence-filter.test.mjs']),false);
});
test('asset, routing, or deploy changes require complete laboratory checks',()=>{
  for(const path of ['assets/characters/v4/skin.html','assets/characters/v5/index.html',
    'src/index.js','src/gmww-character-v4.js','wrangler.jsonc','.github/workflows/deploy-production.yml',
    '.github/scripts/fast-verify-scope.mjs','.github/scripts/verify-isolated-character-labs.sh']){
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

test('isolated Character Lab script preserves complete verified checks',()=>{
  const path='.github/scripts/verify-isolated-character-labs.sh';
  const script=fs.readFileSync(path,'utf8');
  assert.match(script,/V5\.60 3D skin lab HTML \+ module PASS/);
  assert.match(script,/V5\.20 acceptance board exact assets and release gates PASS/);
  const result=spawnSync('bash',['-n',path],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const workflow=fs.readFileSync('.github/workflows/deploy-production.yml','utf8');
  assert.match(workflow,/bash \.github\/scripts\/verify-isolated-character-labs\.sh/);
  assert.match(workflow,/verify-incremental-ota\.mjs/);
  assert.match(workflow,/Block GMWW version rollback/);
});

test('isolated labs do not require retired active Character01/02 SVG or portrait-frame animation',()=>{
  const script=fs.readFileSync('.github/scripts/verify-isolated-character-labs.sh','utf8');
  assert.doesNotMatch(script,/api\/game-characters\/(?:character-0[12]|\$CHARACTER)\/(?:image|frame)/);
  assert.match(script,/assets\/characters\/v4\/approved-two-characters\.avif/);
  assert.match(fs.readFileSync('.github/workflows/deploy-production.yml','utf8'),/node \.github\/scripts\/verify-character40-production\.mjs/);
});
