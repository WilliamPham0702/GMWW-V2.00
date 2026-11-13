import {GM_SOURCE_DIR,GM_GROUPS,groupBuffer} from '../.github/scripts/source-groups.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const groups=GM_GROUPS;
const digest=b=>createHash('sha256').update(b).digest('hex');

test('G3.8: seven cohesive GM source parts regenerate EXACT shipped app.js bytes',()=>{
  assert.equal(groups.length,7);
  const segments=groups.map(group=>groupBuffer(GM_SOURCE_DIR,group));
  for(const [index,chunk] of segments.entries()){
    assert.ok(chunk.length>1000,'source module '+index+' must not be empty');
    assert.ok(chunk.length<300000,'source module '+index+' must be much smaller than monolith');
  }
  const assembled=Buffer.concat(segments);
  const production=readFileSync('server-game/current/app.js');
  assert.equal(digest(assembled),digest(production),'A modularization must not change any byte shipped to GM/IPA');
  assert.ok(assembled.equals(production),'Script ordering, Unicode and whitespace must match original');
});

test('G3.8: reproducible source assembler verifies the checked-in runtime bundle',()=>{
  const p=spawnSync(process.execPath,['.github/scripts/assemble-gm-app.mjs','--verify'],{encoding:'utf8'});
  assert.equal(p.status,0,p.stderr||p.stdout);
  assert.match(p.stdout,/GM app source matches packaged app/);
});

test('G3.8: the Worker CI tracks source-module edits even before app.js changes',()=>{
  const workflow=readFileSync('.github/workflows/check-player-web.yml','utf8');
  assert.match(workflow,/"server-game\/src\/\*\*"/);
  assert.match(workflow,/npm test/);
});

test('G3.8: built bundle remains syntactically valid vanilla JavaScript',()=>{
  const result=spawnSync(process.execPath,['--check','server-game/current/app.js'],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
});
