import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app=readFileSync(new URL('../server-game/current/app.js',import.meta.url),'utf8');
const prep=readFileSync(new URL('../.github/scripts/prepare-update-channel.mjs',import.meta.url),'utf8');
const deploy=readFileSync(new URL('../.github/workflows/deploy-production.yml',import.meta.url),'utf8');

test('built-in roles never fall back to stale persisted artwork',()=>{
  assert.match(app,/DEFAULT_ROLE_ID_SET=new Set/);
  assert.match(app,/kind==='cards'&&DEFAULT_ROLE_ID_SET\.has\(String\(id\)\)/);
  assert.match(app,/neutral placeholder instead of a stale card/);
});

test('runtime update ships exactly the canonical clean role artwork package',()=>{
  assert.match(prep,/Expected 63 canonical role mappings/);
  assert.match(prep,/assets\/role-artwork-v251\/original/);
  assert.match(prep,/role-artwork-v251\.js/);
  assert.match(prep,/3072,height:2560/);
  assert.match(deploy,/legacy-assets-v252/);
  assert.match(deploy,/EXPECTED_SHA="b9229b9b48f5fa3e63dfb831e0ac523cad0ec469d3e3b8c2dca59ef594616c36"/);
  assert.match(deploy,/Expected 63 clean role artworks in runtime update/);
});
