import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
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
test('Approved icons use actual 19 individual PNG assets, not demo SVG or emoji',()=>{
 const icons=api.get();
 assert.equal(icons.length,19);
 assert.equal(new Set(icons.map(x=>x.assetId)).size,19);
 for(const icon of icons){
  const url=api.image(icon);
  assert.match(url,/^action-icons\/sea-v1\/[0-9]{2}_[a-z_]+\.png$/);
  const workerPath=new URL('../assets/'+url,import.meta.url);
  const gmPath=new URL('../server-game/current/'+url,import.meta.url);
  const svgPath=new URL('../assets/'+url.replace(/\.png$/,'.svg'),import.meta.url);
  assert.ok(fs.existsSync(workerPath),url+' Worker PNG');
  assert.ok(fs.existsSync(gmPath),url+' GM local PNG');
  assert.ok(fs.existsSync(svgPath),url+' editable SVG');
  const worker=fs.readFileSync(workerPath),native=fs.readFileSync(gmPath);
  assert.equal(Buffer.compare(worker,native),0,url+' identical PNG');
  assert.equal(worker.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(worker.readUInt32BE(16),1024);
  assert.equal(worker.readUInt32BE(20),1024);
  assert.equal(worker[25],6,'RGBA with alpha');
  assert.match(fs.readFileSync(svgPath,'utf8'),/<svg\s/);
 }
});
test('Direction-based skill displays two independent choices, no automatic action submission',()=>{
 const icons=api.resolveAll('action_transfer_bite');
 assert.deepEqual(Array.from(icons,x=>x.id),['dich-trai','dich-phai']);
 assert.equal(icons.every(x=>x.target==='direction'),true);
 assert.equal(api.resolve('action_thief_change_role').target,'card');
 assert.equal(api.resolve('action_drunk_draw').target,'card');
 assert.ok(!script.includes('/gm/battle-action'));
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

test('Approved PNG files match acceptance package SHA-256 reference',()=>{
 const expected={
  '01_soi_xet':'e635abab365f3ae5850fd211ced98554314fb4683f3a38281a452bee955e0bc1',
  '10_danh_dau':'4de56cbca9ad18ef0d81444d57ec3c3a7bc5b067aca3b57f714236051a46e035',
  '11_dich_trai':'55fccef70b48baf23c99bf4ce2d580b633b048acf61c5a1586c76e4d778ad1c0',
  '19_hiep_si':'de680456f00037f0cce571d058d7704bb8f43888864e465e904732edc8ec773c'
 };
 for(const [name,digest] of Object.entries(expected)){
  const src=fs.readFileSync(new URL('../assets/action-icons/sea-v1/'+name+'.png',import.meta.url));
  assert.equal(crypto.createHash('sha256').update(src).digest('hex'),digest,name);
 }
});
