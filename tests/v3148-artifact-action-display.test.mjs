import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const runtime=fs.readFileSync('server-game/current/app.js','utf8');

test('Artifact buttons display a human name only: never artifact ID, title, owner',()=>{
  assert.ok(source.includes('playEsc(a.name)'), 'the action button displays its action name');
  assert.ok(!source.includes("a.name+' · '+a.artifactName"), 'artifact name and owner are not appended to the button');
  assert.ok(source.includes("/^action[-_][a-z0-9_-]+$/i.test(rawName)"), 'legacy technical action IDs are rewritten');
  assert.ok(source.includes("String(action.artifactName||'Hành động').trim()"), 'older catalog gets a human-readable fallback');
  assert.ok(runtime.includes('playEsc(a.name)'), 'shipped GM Runtime mirrors source');
});

test('GM source parts assemble byte-for-byte into bundled runtime',()=>{
  const parts=['00-core-and-library.part','10-library-and-settings.part','20-members-and-roster.part','30-village-and-setup.part','40-battle-and-timeline.part','50-roles-and-artifacts.part'];
  assert.equal(parts.map(name=>fs.readFileSync('server-game/src/'+name,'utf8')).join(''),runtime);
});
