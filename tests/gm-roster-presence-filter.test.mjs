import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');

function classes(...initial){
  const values=new Set(initial);
  return {
    contains(key){return values.has(key)},
    toggle(key,force){
      if(force===undefined)force=!values.has(key);
      if(force)values.add(key);else values.delete(key);
      return force;
    }
  };
}

function setup(){
  const rows=[
    {dataset:{loginId:'chrome',presence:'online'},classList:classes('play-roster-row'),querySelector(){return this.dot}},
    {dataset:{loginId:'edge',presence:'offline'},classList:classes('play-roster-row','selected'),querySelector(){return this.dot}},
    {dataset:{loginId:'safari',presence:'online'},classList:classes('play-roster-row'),querySelector(){return this.dot}}
  ];
  for(const row of rows)row.dot={classList:classes('is-'+row.dataset.presence),setAttribute(){},title:''};
  const buttons=['all','online','offline'].map(mode=>({dataset:{playRosterFilter:mode},classList:classes(),setAttribute(name,value){this[name]=value}}));
  let empty=null;
  const list={querySelectorAll(selector){assert.equal(selector,'.play-roster-row');return rows},appendChild(item){empty=item}};
  const count={textContent:''};
  const selectAll={addEventListener(event,handler){assert.equal(event,'click');this.click=handler}};
  const sheet={classList:classes()};
  const document={
    querySelectorAll(selector){
      if(selector==='#playRosterFilters [data-play-roster-filter]')return buttons;
      if(selector==='#playRosterList .play-roster-row')return rows;
      if(selector==='#playRosterList .play-roster-row.selected')return rows.filter(row=>row.classList.contains('selected'));
      throw new Error('Unexpected selector '+selector);
    },
    getElementById(id){return {
      playRosterList:list,playRosterCount:count,playRosterFilterEmpty:empty,
      playRosterSelectAll:selectAll,playRosterSheet:sheet
    }[id]||null},
    createElement(tag){assert.equal(tag,'div');return{id:'',className:'',classList:classes(),textContent:''}}
  };
  const context={document,console};
  const fnStart=app.indexOf('function playRosterSelectedIds(){');
  const fnEnd=app.indexOf('async function playLoadFreshRosterMembers(){',fnStart);
  assert.ok(fnStart>=0&&fnEnd>fnStart,'roster filtering helper functions must exist');
  vm.runInNewContext(app.slice(fnStart,fnEnd),context);
  const selectStart=app.indexOf("  document.getElementById('playRosterSelectAll')?.addEventListener('click'");
  assert.ok(selectStart>=0,'visible-only bulk selector must exist');
  vm.runInNewContext(app.slice(selectStart,app.indexOf('\n',selectStart)),context);
  return {rows,buttons,selectAll,count,context,getEmpty:()=>empty};
}

test('roster has three accessible filter buttons and responsive styling',()=>{
  for(const mode of ['all','online','offline']){
    assert.match(html,new RegExp('data-play-roster-filter="'+mode+'"'));
  }
  assert.match(html,/id="playRosterFilters" role="group"/);
  assert.match(css,/\.play-roster-filters\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(app,/setPlayRosterFilter\('all'\)/);
});

test('switching filters preserves selected members across hidden rows',()=>{
  const {rows,buttons,count,context,getEmpty}=setup();
  context.setPlayRosterFilter('online');
  assert.deepEqual(rows.map(row=>row.classList.contains('hidden')),[false,true,false]);
  assert.equal(count.textContent,'');
  context.updatePlayRosterCount();
  assert.equal(count.textContent,'1 đã chọn');
  assert.equal(buttons[1]['aria-pressed'],'true');
  assert.equal(buttons[0]['aria-pressed'],'false');
  context.setPlayRosterFilter('offline');
  assert.deepEqual(rows.map(row=>row.classList.contains('hidden')),[true,false,true]);
  assert.equal(rows[1].classList.contains('selected'),true);
  context.setPlayRosterFilter('all');
  assert.deepEqual(rows.map(row=>row.classList.contains('hidden')),[false,false,false]);
  assert.equal(getEmpty().classList.contains('hidden'),true);
  assert.deepEqual(Array.from(context.playRosterSelectedIds()),['edge']);
});

test('bulk select acts only on currently visible members',()=>{
  const {rows,selectAll,count,context}=setup();
  context.setPlayRosterFilter('online');
  selectAll.click();
  assert.deepEqual(rows.map(row=>row.classList.contains('selected')),[true,true,true]);
  assert.equal(count.textContent,'3 đã chọn');
  selectAll.click();
  assert.deepEqual(rows.map(row=>row.classList.contains('selected')),[false,true,false]);
  assert.equal(count.textContent,'1 đã chọn');
});

test('live presence refresh re-applies active filter while preserving selections',async()=>{
  const {rows,context,getEmpty}=setup();
  context.setPlayRosterFilter('offline');
  context.playLoadFreshRosterMembers=async()=>[
    {loginId:'chrome',online:true},
    {loginId:'edge',online:true},
    {loginId:'safari',online:true}
  ];
  const start=app.indexOf('async function playRefreshRosterPresence(){');
  const end=app.indexOf('async function openPlayRosterSheet(){',start);
  assert.ok(start>=0&&end>start);
  vm.runInNewContext(app.slice(start,end),context);
  await context.playRefreshRosterPresence();
  assert.deepEqual(rows.map(row=>row.classList.contains('hidden')),[true,true,true]);
  assert.equal(rows[1].classList.contains('selected'),true);
  assert.equal(rows[1].dataset.presence,'online');
  assert.equal(getEmpty().classList.contains('hidden'),false);
  assert.match(getEmpty().textContent,/Không có Thành Viên Offline/);
  context.setPlayRosterFilter('online');
  assert.deepEqual(rows.map(row=>row.classList.contains('hidden')),[false,false,false]);
});

test('ONLINE room validation and Select All saves on the FIRST confirmation',async()=>{
  assert.ok(app.includes('Chế độ ONLINE chỉ chọn Người Chơi đang Online.'));
  assert.ok(!app.includes('playRosterBulkConfirmClicks'));
  assert.ok(!app.includes('playRosterBulkSelection'));
  const {selectAll,context}=setup();
  selectAll.click();
  let calls=0,submitted=null;
  context.savePlayRosterIds=async ids=>{calls++;submitted=Array.from(ids);return true};
  const begin=app.indexOf('async function savePlayRoster(){');
  const finish=app.indexOf('function playApplyLobbyStage(',begin);
  assert.ok(begin>=0&&finish>begin);
  vm.runInNewContext(app.slice(begin,finish),context);
  await context.savePlayRoster();
  assert.equal(calls,1);
  assert.deepEqual(submitted,['chrome','edge','safari']);
  assert.ok(app.includes('async function savePlayRosterIds(ids)'));
  assert.ok(app.includes('await playRoomApi('));
});

test('V3.63 incremental OTA installs only verified GM UI files on V3.60/3.61/3.62',async()=>{
  const {selectVerifiedRuntimeV363Delta}=await import('../src/gmww-ota-delta.js');
  const origin='https://gmww-v2-00.williampham0702.workers.dev/updates/runtime/V3.63/';
  const all=['GMWW.html','app.js','style.css','gm/gm-white-wolf.webp'];
  const manifest={
    releaseVersion:'3.63',runtimeVersion:'3.63',shellVersion:'3.17',releaseType:'runtime',
    runtime:{files:all.map(path=>({path,url:origin+path,sha256:'a'.repeat(64)}))},delete:[]
  };
  const delta=selectVerifiedRuntimeV363Delta(manifest,'3.62');
  assert.equal(delta.upgradeMode,'verified-overlay');
  assert.deepEqual(delta.runtime.files.map(file=>file.path),all.slice(0,3));
  assert.equal(delta.optimizedFromVersion,'3.62');
  for(const from of ['3.60','3.61']){
    const upgrade=selectVerifiedRuntimeV363Delta(manifest,from);
    assert.equal(upgrade.optimizedFromVersion,from);
    assert.deepEqual(upgrade.runtime.files.map(file=>file.path),all.slice(0,3));
  }
  for(const from of ['3.59','3.63','3.17'])assert.equal(selectVerifiedRuntimeV363Delta(manifest,from),null);
  const corrupt={...manifest,runtime:{files:manifest.runtime.files.map(file=>({...file}))}};
  corrupt.runtime.files[0].sha256='INVALID';
  assert.equal(selectVerifiedRuntimeV363Delta(corrupt,'3.62'),null);
  // This exercises the retained historical rescue, not the new full-catalog path.
  const runningVersion='3.121';
  assert.ok(runningVersion,'GM app must expose a runtime version');
  const worker=fs.readFileSync('src/index.js','utf8');
  assert.match(worker,/selectVerifiedRuntimeV363Delta\(versioned,url\.searchParams\.get\("current"\)\)/);
  assert.match(worker,/selectVerifiedRuntimeV363Delta\(manifest,url\.searchParams\.get\("current"\)\)/);
  // Preserve legacy rescue coverage at its historical compatibility boundary.
  // Future releases use the checksum-verified full catalog and generic deltas.
  const {recoverLegacyRuntimeManifest}=await import('../src/gmww-runtime-recovery.js');
  const served=[];
  const assets={fetch:async request=>{
    const url=new URL(request.url);
    served.push(url.pathname);
    const marker=url.pathname.endsWith('/GMWW.html')
      ? '<title>GMWW V'+runningVersion+'</title>'
      : url.pathname.endsWith('/app.js')
        ? "const VERSION='"+runningVersion+"';"
        : 'gmww-verified-runtime-asset';
    return new Response(marker+' '.repeat(70),{status:200});
  }};
  const options={assets,requestUrl:'https://gmww-v2-00.williampham0702.workers.dev/api/update/manifest',
    version:runningVersion,shellVersion:'3.17',installedVersion:'3.46'};
  const recovered=await recoverLegacyRuntimeManifest(options);
  assert.equal(recovered?.releaseVersion,runningVersion,'Legacy IPA must retain historical recovery');
  assert.equal(recovered?.releaseType,'runtime');
  assert.ok(recovered.runtime.files.some(file=>file.path==='battle-controls.js'),
    'Modern battle controls remain available to legacy IPA');
  assert.ok(recovered.runtime.files.every(file=>
    /^[a-f0-9]{64}$/.test(file.sha256)&&file.url.includes('/updates/runtime/V'+runningVersion+'/')),
    'Every recovered asset must have trusted path and SHA-256');
  assert.ok(served.includes('/updates/runtime/V'+runningVersion+'/GMWW.html'));
  assert.equal(await recoverLegacyRuntimeManifest({...options,shellVersion:'3.110'}),null,
    'A mismatched native IPA shell must never enter legacy recovery');
});
