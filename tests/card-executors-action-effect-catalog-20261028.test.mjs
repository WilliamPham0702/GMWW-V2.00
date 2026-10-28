import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('107 card fallback supplies missing named actions and effect references without changing existing media',()=>{
 const s=fs.readFileSync('server-game/src/00-core-and-library.part','utf8');
 const a=s.indexOf('const GMWW_AUDITED_ROLE_FALLBACKS=');
 const b=s.indexOf('function applyV221AudioGuard(s){',a);
 const pkg=vm.runInNewContext(s.slice(a,b)+';({apply:applyApprovedRoleSettings})',{
  clone:x=>JSON.parse(JSON.stringify(x)),DEFAULT_STATE:{cards:[]}
 });
 const cards=JSON.parse(fs.readFileSync('docs/audits/card-rule-catalog-20261028.json','utf8')).cards;
 const starting={cards:cards.filter(c=>c.kind==='role').slice(0,1).map(c=>({...c,media:{image:'keep'},functions:c.functions})),
  artifacts:[],actions:{role:[],artifacts:[]},effects:[]};
 const original=starting.cards[0].media.image;
 pkg.apply(starting);
 assert.ok(starting.cards.length>=35);assert.equal(starting.artifacts.length,44);
 assert.equal(starting.cards[0].media.image,original);
 const actions=new Set(starting.actions.artifacts.map(a=>a.id));
 assert.ok(actions.has('artifact_action_silence'));
 assert.ok(actions.has('artifact_action_custom'));
 const refs=new Set(starting.effects.map(e=>e.id));
 assert.ok(refs.has('effect-artifact-silence'));
});
