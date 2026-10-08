import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../server-game/current/GMWW.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../server-game/current/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../server-game/current/style.css',import.meta.url),'utf8');
const start=html.indexOf('<section class="page" id="settings">');
const end=html.indexOf('</section>',start);
const settings=html.slice(start,end);
const groups={
  overview:['gmwwOpsCenter','opsRunFullAudit','opsCheckRoom','opsCheckRelease','opsExportReport','opsAutoCheck'],
  connection:['serverHealthCard','checkServerHealth','refreshServerData','openPlayerWeb'],
  updates:['updateManagerCard','installRuntimeUpdate','downloadNewIPA','syncPlayerWebUpdate'],
  maintenance:['systemDiagnosticsCard','runSystemDiagnostics','quickRepairSystem','checkPlayerWebNow','quickMaintenanceCard','auditLocalData','clearRuntimeCache','reloadApp'],
  display:['characterScaleCard','characterScaleChoices']
};

test('Settings has exactly five meaningful navigation groups and every previously built tool is in one group',()=>{
  const allIds=Object.values(groups).flat();
  assert.equal(Object.keys(groups).length,5);
  assert.equal(new Set(allIds).size,allIds.length);
  for(const [group,ids] of Object.entries(groups)){
    const button=settings.indexOf('id="settingsHubTab-'+group+'"');
    const panel=settings.indexOf('id="settingsHubPanel-'+group+'"');
    assert.ok(button>=0&&panel>button,group+' tab and panel exist');
    const stop=settings.indexOf('<div id="settingsHubPanel-',panel+25);
    const section=settings.slice(panel,stop>=0?stop:settings.length);
    for(const id of ids){
      assert.ok(section.includes('id="'+id+'"'),id+' must live in '+group);
      assert.equal((settings.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id+' must be unique');
    }
  }
  for(const id of ['opsServerState','opsStorageState','opsRealtimeState','opsReleaseState'])
    assert.equal((settings.match(new RegExp('id="'+id+'"','g'))||[]).length,1);
  assert.match(settings,/role="tablist"/);
  assert.match(settings,/role="tabpanel"/);
  assert.match(css,/settings-hub-panel\[hidden\]\{display:none!important\}/);
  assert.match(css,/min-height:48px/);
});

test('Every settings action remains bound to a real handler, preserving value after regrouping',()=>{
  const handlerIds=[
    'checkServerHealth','refreshServerData','openPlayerWeb','installRuntimeUpdate','downloadNewIPA','syncPlayerWebUpdate',
    'auditLocalData','clearRuntimeCache','reloadApp','runSystemDiagnostics','quickRepairSystem','checkPlayerWebNow',
    'opsRunFullAudit','opsCheckRoom','opsCheckRelease','opsExportReport','opsAutoCheck'
  ];
  for(const id of handlerIds){
    assert.ok(app.includes("getElementById('"+id+"')"),'Missing JS binding for '+id);
  }
  assert.match(app,/data-character-scale/);
  for(const size of [75,100,125,150,175,200])assert.match(settings,new RegExp('data-character-scale="'+size+'"'));
});

const source=app.slice(app.indexOf('/* GMWW Settings Hub —'),app.indexOf('/* GMWW Operations Center —'));
assert.ok(source.length>1000&&source.length<10000);

function fixture(saved='overview'){
  const values=new Map([['GMWW_SETTINGS_GROUP_V1',saved]]);
  const listeners={},elements={},focus={value:''},document={activeElement:null};
  for(const group of Object.keys(groups)){
    const tabId='settingsHubTab-'+group,panelId='settingsHubPanel-'+group;
    elements[tabId]={id:tabId,dataset:{settingsGroup:group},attributes:{},tabIndex:-1,focus(){focus.value=group},
      classList:{active:false,toggle(_,v){elements[tabId].classList.active=v}},setAttribute(k,v){elements[tabId].attributes[k]=v}};
    elements[panelId]={hidden:group!=='overview',classList:{toggle(_,v){elements[panelId].active=v}}};
  }
  elements.settingsHubGuide={textContent:''};
  elements.settingsHubMiniHealth={dataset:{}};
  elements.settingsHubMiniText={textContent:''};
  elements.settingsHubNav={addEventListener(event,cb){listeners[event]=cb},contains(){return true}};
  document.getElementById=id=>elements[id];
  document.activeElement=elements['settingsHubTab-overview'];
  const context={document,localStorage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},
    setTimeout:()=>{},checkServerHealth:()=>{},checkAppUpdate:()=>{},
    runSystemDiagnostics:()=>{},console};
  vm.createContext(context);
  vm.runInContext(source,context);
  return {context,values,listeners,elements,focus,document};
}

test('Tab selection shows only one toolkit, preserves selection, and updates accessible state',()=>{
  const p=fixture('connection');
  assert.equal(p.elements['settingsHubPanel-connection'].hidden,false);
  assert.equal(p.elements['settingsHubPanel-overview'].hidden,true);
  assert.equal(p.values.get('GMWW_SETTINGS_GROUP_V1'),'connection');
  p.context.gmwwSettingsHubSelect('maintenance');
  assert.equal(p.values.get('GMWW_SETTINGS_GROUP_V1'),'maintenance');
  assert.equal(p.elements['settingsHubPanel-maintenance'].hidden,false);
  for(const group of Object.keys(groups))if(group!=='maintenance')
    assert.equal(p.elements['settingsHubPanel-'+group].hidden,true);
  assert.equal(p.elements['settingsHubTab-maintenance'].attributes['aria-selected'],'true');
  assert.match(p.elements.settingsHubGuide.textContent,/Quét sâu/);
  p.context.gmwwSettingsHubSelect('bad-input');
  assert.equal(p.values.get('GMWW_SETTINGS_GROUP_V1'),'overview');
});

test('Navigation supports click and keyboard without resetting rooms or member saves',()=>{
  const p=fixture();
  const item=p.elements['settingsHubTab-updates'];
  p.listeners.click({target:{closest:()=>item}});
  assert.equal(p.values.get('GMWW_SETTINGS_GROUP_V1'),'updates');
  p.document.activeElement=item;
  let prevented=false;
  p.listeners.keydown({key:'ArrowRight',preventDefault(){prevented=true}});
  assert.equal(prevented,true);
  assert.equal(p.values.get('GMWW_SETTINGS_GROUP_V1'),'maintenance');
  assert.equal(p.focus.value,'maintenance');
  assert.match(source,/GMWW_SETTINGS_GROUP_KEY='GMWW_SETTINGS_GROUP_V1'/);
  assert.doesNotMatch(source,/gmRoomReset\(|localStorage\.clear\(|sessionStorage\.clear\(|caches\.delete\(/);
});

test('Single automatic health check remains, while detailed scan runs only upon entering Maintenance',()=>{
  assert.match(app,/else if\(selected==='maintenance'\)setTimeout\(\(\)=>runSystemDiagnostics\(\{silent:true\}\),80\)/);
  assert.match(app,/if\(gmwwOpsAutoEnabled\(\)\)gmwwOpsRun\(\{kind:'all',silent:true\}\)/);
  assert.doesNotMatch(app,/setTimeout\(\(\)=>runSystemDiagnostics\(\{silent:true\}\),220\)/);
  assert.doesNotMatch(app,/setTimeout\(\(\)=>runSystemDiagnostics\(\{silent:true\}\),160\)/);
});
