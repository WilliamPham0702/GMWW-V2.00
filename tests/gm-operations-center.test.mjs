import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const app=readFileSync(new URL('../server-game/current/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../server-game/current/GMWW.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../server-game/current/style.css',import.meta.url),'utf8');
const begin='/* GMWW Operations Center — Cài Đặt.';
const end='/* V2.97 — Thành Viên dùng Bộ 42';
const block=app.slice(app.indexOf(begin),app.indexOf(end,app.indexOf(begin)));
assert.ok(block.length>2000&&block.length<20000,'Operations Center source must be bounded');

function context({selected=false,storageMap=new Map(),socketOpen=true}={}){
  const ids=new Map(),rows=new Map(),calls=[],events=new Map();
  const get=id=>{
    if(!ids.has(id))ids.set(id,{textContent:'',className:'',dataset:{},disabled:false,checked:false,
      classList:{add(){},remove(){}},addEventListener(name,fn){events.set(id+':'+name,fn)},
      append(){},focus(){},select(){},remove(){},click(){},setAttribute(){}});
    return ids.get(id);
  };
  const data={
    '/api/health':{ok:true,project:'GMWW-V2.00',version:'V3.21'},
    '/api/health/deep':{ok:true,version:'V3.21',checks:{memberStorage:'ready'}},
    '/api/update/manifest':{ok:true,releaseVersion:'3.21',releaseType:'runtime'},
    '/api/web-sync':{ok:true,revision:1},
    '/api/game-characters':{characters:Array.from({length:20},(_,i)=>({id:i+1}))},
    '/api/rooms/ABC234':{ok:true,room:{enabled:true,roomMode:'online',seatCount:30},players:Array.from({length:30},(_,i)=>({participantId:'member:private-'+i,online:true}))}
  };
  const env={
    Date,URL,Blob,console,VERSION:'V3.21',
    GMWW_OPS_AUTO_KEY:'GMWW_OPS_AUTO_CHECK_V1',
    navigator:{onLine:true},
    localStorage:{getItem(key){return storageMap.get(key)??null},setItem(key,value){storageMap.set(key,value)}},
    document:{getElementById:get,querySelector(selector){if(!rows.has(selector))rows.set(selector,{
      className:'',querySelector(key){return get(selector+':'+key)}
    });return rows.get(selector)},createElement:get,body:{append(){}}},
    gmwwJsonProbe:async path=>{
      calls.push(path);
      const route=path.split('?')[0],datum=data[route];
      if(!datum)return{ok:false,status:404,data:{},latency:12};
      return {ok:true,status:200,data:datum,latency:12};
    },
    gmwwRuntimeErrors:[],gmwwRuntimeVersion:()=> '3.21',gmwwShellVersion:()=> '3.17',
    isLivePlayRoom:()=>selected,playSceneState:{roomCode:'ABC234',roomMode:'online',seatCount:30},
    playSceneRuntime:{room:{seatCount:30,roomMode:'online',enabled:true},
      players:Array.from({length:30},(_,i)=>({displayName:'SECRET',loginId:'private-'+i,online:true})),
      socket:{readyState:socketOpen?1:3},lastSyncAt:Date.now()},
    setTimeout:()=>{},GMWW_SERVER_BASE:'https://gmww.example.test'
  };
  vm.createContext(env);
  vm.runInContext(block,env);
  return {env,ids,calls,events,get};
}

test('Operations tools are visibly integrated into the existing GM settings page, not a separate web dashboard',()=>{
  const start=html.indexOf('<section class="page" id="settings">'),end=html.indexOf('</section>',start);
  const settings=html.slice(start,end);
  for(const id of ['gmwwOpsCenter','opsRunFullAudit','opsCheckRoom','opsCheckRelease','opsExportReport',
    'opsAutoCheck','opsServerState','opsStorageState','opsRealtimeState','opsReleaseState','opsReport'])
    assert.match(settings,new RegExp('id="'+id+'"'));
  assert.ok(settings.indexOf('gmwwOpsCenter')<settings.indexOf('systemDiagnosticsCard'));
  assert.match(css,/\.gmww-ops-card/);
  assert.match(css,/\.ops-status-grid/);
  assert.match(css,/\.ops-tools/);
});

test('Integrated full audit is read-only and displays Worker, storage, web, release and character status',async()=>{
  const c=context();
  const snapshot=await c.env.gmwwOpsRun({kind:'all'});
  assert.equal(snapshot.checks.server.kind,'ok');
  assert.equal(snapshot.checks.storage.kind,'ok');
  assert.equal(snapshot.checks.player.kind,'ok');
  assert.equal(snapshot.checks.characters.kind,'ok');
  assert.equal(snapshot.checks.update.kind,'ok');
  assert.equal(snapshot.checks.room.kind,'idle','no selected room is not an outage');
  assert.equal(snapshot.checks.realtime.kind,'idle');
  assert.equal(c.get('opsOverall').textContent,'HỆ THỐNG ỔN');
  assert.equal(c.calls.length,5);
  assert.ok(c.calls.every(p=>p.startsWith('/api/')&&p.includes('?ops=')));
});

test('Room and realtime tool reports room occupancy and socket state without modifying anyone',async()=>{
  const c=context({selected:true,socketOpen:true});
  const snapshot=await c.env.gmwwOpsRun({kind:'room'});
  assert.equal(snapshot.checks.room.participants,30);
  assert.equal(snapshot.checks.room.seats,30);
  assert.equal(snapshot.checks.room.online,30);
  assert.equal(snapshot.checks.realtime.socketOpen,true);
  assert.equal(c.calls.length,1);
  assert.ok(c.calls[0].startsWith('/api/rooms/ABC234?ops='));
});

test('Disconnected socket creates actionable warning and report strips identities and credentials',async()=>{
  const c=context({selected:true,socketOpen:false});
  const snapshot=await c.env.gmwwOpsRun({kind:'all'});
  assert.equal(snapshot.checks.realtime.kind,'warn');
  const safe=c.env.gmwwOpsSafeReport(snapshot);
  const exported=JSON.stringify(safe);
  assert.ok(exported.includes('participants'));
  for(const secret of ['ABC234','SECRET','private-1','gmToken','token','loginId','member:'])
    if(secret==='token')assert.doesNotMatch(exported,/"token"\s*:/);
    else assert.equal(exported.includes(secret),false,'report leaked '+secret);
});

test('Automatic monitoring can be disabled without altering game saves',()=>{
  const storageMap=new Map([['GMWW_OPS_AUTO_CHECK_V1','0']]);
  const c=context({storageMap});
  assert.equal(c.get('opsAutoCheck').checked,false);
  c.get('opsAutoCheck').checked=true;
  c.events.get('opsAutoCheck:change')();
  assert.equal(storageMap.get('GMWW_OPS_AUTO_CHECK_V1'),'1');
  assert.equal(storageMap.size,1);
});

test('Cài Đặt loads self-check on opening and background monitoring only while settings visible',()=>{
  assert.match(app,/setTimeout\(\(\)=>gmwwOpsRun\(\{kind:'all',silent:true\}\),450\)/);
  assert.match(app,/gmwwOpsAutoEnabled\(\).*gmwwOpsRun\(\{kind:'all',silent:true\}\)/);
  assert.doesNotMatch(block,/gmwwSendGmPresence\(|gmRoomReset\(|localStorage\.clear\(|sessionStorage\.clear\(/);
});
