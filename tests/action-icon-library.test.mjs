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
  assert.equal(api.get().length,39);
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
test('Approved icons use actual 39 individual PNG assets, not demo SVG or emoji',()=>{
 const icons=api.get();
 assert.equal(icons.length,39);
 assert.equal(new Set(icons.map(x=>x.assetId)).size,39);
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

test('All 39 files match the approved SHA-256 manifest, including editable SVG originals',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('../assets/action-icons/sea-v1/manifest.json',import.meta.url),'utf8'));
 assert.equal(manifest.count,39);
 assert.equal(manifest.icons.length,39);
 assert.equal(new Set(manifest.icons.map(x=>x.id)).size,39);
 for(const record of manifest.icons){
  const icon=api.get().find(x=>x.id===record.id);
  assert.ok(icon,record.id+' present');
  assert.equal(icon.assetId,record.png);
  assert.deepEqual(Array.from(icon.actions),record.actions);
  for(const [name,expected] of [[record.png,record.sha256_png],[record.svg,record.sha256_svg]]){
   const file=fs.readFileSync(new URL('../assets/action-icons/sea-v1/'+name,import.meta.url));
   assert.equal(crypto.createHash('sha256').update(file).digest('hex'),expected,name);
  }
 }
});

test('Wave 3 keeps 10 standalone images and unknown IDs are never fabricated',()=>{
 const wave=api.get().filter(x=>/^2[0-9]_/.test(x.assetId));
 assert.equal(wave.length,10);
 assert.equal(api.resolve('artifact_custom_light'),null);
});
test('Exact local-name match auto-assigns only the matching Artifact action',()=>{
 const original=ctx.localStorage.getItem,originalSet=ctx.localStorage.setItem;
 let written=null;
 ctx.localStorage.getItem=key=>key==='GMWW_V258_STATE'?JSON.stringify({
 cards:[],artifacts:[{name:'Artifact Thử',functions:[{actionId:'artifact_silence'},{actionId:'artifact_unknown'}]}],
 actions:{role:[],artifacts:[{id:'artifact_silence',name:'Cấm bỏ phiếu'},{id:'artifact_unknown',name:'Không rõ chức năng'}]}
 }):null;
 ctx.localStorage.setItem=(key,value)=>{written={key,value}};
 try{
  assert.equal(api.autoMap(),1);
  assert.ok(api.resolve('artifact_silence'));
  assert.equal(api.resolve('artifact_silence').id,'cam-vote');
  assert.equal(api.resolve('artifact_unknown'),null);
  assert.ok(written?.key?.endsWith('_V4'));
 }finally{ctx.localStorage.getItem=original;ctx.localStorage.setItem=originalSet}
});
test('Old V2 custom icon mappings survive migration and 10 approved new IDs appear',()=>{
 const old=[{id:'soi-xet',name:'Soi đã sửa',target:'character',actions:['action_seer'],assetId:'01_soi_xet.png',image:''},
 {id:'icon-custom-1',name:'Icon tuỳ biến',shape:'spark',target:'character',actions:['artifact_custom']}];
 const next={window:{},document:{readyState:'loading',addEventListener(){}},
 localStorage:{getItem(key){return key==='GMWW_ACTION_ICON_LIBRARY_V2'?JSON.stringify(old):null}},alert(){}};
 vm.createContext(next);new vm.Script(script).runInContext(next);
 const results=next.window.GMWWActionIconLibrary.get();
 assert.equal(results.length,22);
 assert.equal(results.find(x=>x.id==='soi-xet').name,'Soi đã sửa');
 assert.ok(results.some(x=>x.id==='icon-custom-1'));
 assert.equal(results.filter(x=>/^2[0-9]_/.test(x.assetId)).length,10);
});

test('All 54 actual iPhone audit rows map to a valid icon except unknown customizable Artifact',()=>{
 const fixture=JSON.parse(fs.readFileSync(new URL('../docs/plans/GMWW-ACTION-AUDIT-REAL-2026-10-25.json',import.meta.url),'utf8'));
 assert.equal(fixture.missing.length,54);
 assert.equal(fixture.roleCount,63);assert.equal(fixture.artifactCount,44);
 const unresolved=fixture.missing.filter(r=>!api.resolve(r.id));
 assert.deepEqual(unresolved.map(x=>x.id),['artifact_action_custom']);
 const exact=api.resolve('18');assert.equal(exact.id,'rung-chuong');
 assert.equal(api.resolve('25').id,'giao');
 assert.equal(api.resolve('action-cupid-pair').id,'ghep-doi');
 assert.equal(api.resolve('action-disease-self').id,'mang-benh');
 assert.equal(api.resolve('action-ghost-message').id,'loan-tin');
 assert.equal(api.resolve('artifact_action_silence').id,'cam-noi');
 assert.equal(api.resolve('action-rotten-seer-check').id,'soi-xet');
 assert.equal(api.resolve('artifact_action_disable_function').id,'phong-an');
});
test('V3 icon edits and manual maps migrate without loss, new ten added only once',()=>{
 const customized=[{id:'soi-xet',name:'Tên đã sửa',target:'character',actions:['action_seer','my_custom']},
  {id:'user-created-321',name:'Icon tự tạo',target:'character',actions:['artifact_user_owned']}];
 const client={window:{},document:{readyState:'loading',addEventListener(){}},
  localStorage:{getItem(key){return key==='GMWW_ACTION_ICON_LIBRARY_V3'?JSON.stringify(customized):null}},alert(){}};
 vm.createContext(client);new vm.Script(script).runInContext(client);
 const icons=client.window.GMWWActionIconLibrary.get();
 assert.equal(icons.length,12);
 assert.equal(icons.find(x=>x.id==='soi-xet').name,'Tên đã sửa');
 assert.ok(icons.find(x=>x.id==='soi-xet').actions.includes('my_custom'));
 assert.ok(icons.find(x=>x.id==='user-created-321'));
 assert.equal(icons.filter(x=>/^3[0-9]_/.test(x.assetId)).length,10);
});
test('Double-tap tiles never show external Edit/Delete buttons and delete action remains in editor',()=>{
 const a=script.indexOf('box.innerHTML=rows.map(x=>'),b=script.indexOf('function edit(id)',a);
 const tiles=script.slice(a,b);
 assert.ok(tiles.includes('aria-label='));
 assert.ok(tiles.includes('box.ondblclick'));
 assert.ok(!tiles.includes('data-icon-delete'));
 assert.ok(!tiles.includes('data-icon-edit'));
 assert.ok(script.includes('id="gmwwIconDelete"'));
 assert.ok(script.includes("document.getElementById('gmwwIconDelete').onclick"));
});
test('Fire icon uses battle targetAllowed and original Server commit, without a second action ledger',()=>{
 const battle=fs.readFileSync(new URL('../server-game/src/40-battle-and-timeline.part',import.meta.url),'utf8');
 assert.match(battle,/battleIconDock\(actions,phase\)/);
 assert.match(battle,/battleIconTargetAt\(e\.clientX,e\.clientY,action\)/);
 assert.match(battle,/battlePickTargetWithAudio\(String\(target\.dataset\.playPlayerId/);
 assert.match(battle,/battleConfirm\(true\)/);
 assert.match(battle,/battleRules\(\)\?\.targetAllowed/);
 assert.match(battle,/battleIconSetOn\(!battleIconOn\(\)\)/);
 assert.match(battle,/battleIconClearDrag\(\);const picker/);
 assert.doesNotMatch(battle,/\/icon-action.*method:'POST'/);
});
