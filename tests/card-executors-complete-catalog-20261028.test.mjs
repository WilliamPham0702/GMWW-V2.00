import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('Complete catalog inventory is additive, 63 roles plus 44 artifacts; no overwrite of saved artwork',()=>{
 const raw=fs.readFileSync('docs/audits/card-rule-catalog-20261028.json','utf8');
 const catalog=JSON.parse(raw).cards;
 for(const p of ['server-game/src/00-core-and-library.part','server-game/current/app.js']){
  const source=fs.readFileSync(p,'utf8');
  const a=source.indexOf('const GMWW_AUDITED_ROLE_FALLBACKS='),b=source.indexOf('function applyApprovedRoleSettings(s){',a);
  const fallback=vm.runInNewContext(source.slice(a,b)+';({role:GMWW_AUDITED_ROLE_FALLBACKS,artifact:GMWW_AUDITED_ARTIFACT_FALLBACKS})');
  const countDefault=[...source.slice(source.indexOf('  cards:['),source.indexOf('\n  ],\n  artifacts:[]')).matchAll(/\bid:['"](role_[a-z0-9_]+)/g)].length;
  assert.equal(countDefault+fallback.role.length,63);
  assert.equal(fallback.artifact.length,44);
  const ids=[...fallback.role,...fallback.artifact].map(x=>x.id);
  assert.equal(new Set(ids).size,ids.length);
  for(const x of fallback.role)assert.ok(catalog.some(c=>c.id===x.id));
  assert.match(source,/if\(!original\)\s*\{/);
  assert.match(source,/if\(actionId&&!ids\.has\(actionId\)\)/);
 }
});
