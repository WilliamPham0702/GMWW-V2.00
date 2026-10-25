import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const iconPath=new URL('../server-game/current/action-icon-library.js',import.meta.url);
const htmlPath=new URL('../server-game/current/GMWW.html',import.meta.url);
const corePath=new URL('../server-game/src/00-core-and-library.part',import.meta.url);
const script=fs.readFileSync(iconPath,'utf8');
const html=fs.readFileSync(htmlPath,'utf8');
const core=fs.readFileSync(corePath,'utf8');
const ctx={
  window:{},
  document:{readyState:'loading',addEventListener(){}},
  localStorage:{getItem(){return null}},
  alert(){throw Error('Unexpected alert')},
  confirm(){return false}
};
vm.createContext(ctx);
new vm.Script(script,{filename:'action-icon-library.js'}).runInContext(ctx);
const api=ctx.window.GMWWActionIconLibrary;
test('GM Icon library linked to GM page and parseable without gameplay initialization',()=>{
  assert.match(html,/<script src="action-icon-library\.js\?v=[^"]+" defer><\/script>/);
  assert.ok(api);
  assert.equal(api.get().length,19);
});
test('Every built-in active role action is mapped to an icon',()=>{
  const chunk=core.slice(core.indexOf('  actions:{'),core.indexOf('  effects:['));
  const ids=[...chunk.matchAll(/\{id:'(action_[^']+)'/g)].map(x=>x[1]);
  assert.equal(ids.length,26);
  const missing=ids.filter(id=>!api.resolve(id));
  assert.deepEqual(missing,[]);
});
test('Multi-target, directional and card selection actions are not forced to character-drop mode',()=>{
  assert.equal(api.resolve('action_scan_three').target,'multi');
  assert.equal(api.resolve('action_compare_faction').target,'multi');
  assert.equal(api.resolve('action_transfer_bite').target,'direction');
  assert.equal(api.resolve('action_thief_change_role').target,'card');
  assert.equal(api.resolve('action_drunk_draw').target,'card');
  assert.equal(api.resolve('action_seer').target,'character');
  assert.equal(api.resolve('action_wolf_bite').target,'character');
});
test('Icon assets are custom drawn SVG, not iPhone emoji assets',()=>{
  const sample=api.get()[0];
  assert.match(api.image(sample),/^data:image\/svg\+xml/);
  assert.equal(api.get().every(x=>x.id&&x.name&&!x.image),true);
});


test('Device catalog scan discovers custom Artifact actions without inventing built-in metadata',()=>{
  const original=ctx.localStorage.getItem;
  ctx.localStorage.getItem=key=>key==='GMWW_V258_STATE'?JSON.stringify({
    cards:[{name:'Tiên Tri',functions:[{actionId:'action_seer'}]}],
    artifacts:[{name:'Đá Thần',functions:[{actionId:'artifact_custom_light',passive:false,targetCount:1}]}],
    actions:{role:[{id:'action_seer',name:'Soi'}],artifacts:[{id:'artifact_custom_light',name:'Chiếu sáng'}]}
  }):null;
  try{
    const audit=api.audit();
    assert.equal(audit.roles,1);
    assert.equal(audit.artifacts,1);
    assert.equal(audit.actions.length,2);
    assert.equal(audit.missing.length,1);
    assert.equal(audit.missing[0].id,'artifact_custom_light');
    assert.equal(audit.missing[0].label,'Chiếu sáng');
  }finally{ctx.localStorage.getItem=original}
});
