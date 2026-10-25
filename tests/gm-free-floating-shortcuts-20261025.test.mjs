import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=path=>fs.readFileSync(path,'utf8');

test('GM dùng đúng bốn emoji không khung và không khóa vào thanh dưới',()=>{
  const html=read('server-game/current/GMWW.html');
  const css=read('server-game/current/style.css');
  const controls=[
    ['battleFactionStatsToggle','🌈'],
    ['battleDayNoticeToggle','🏖️'],
    ['battleDayGallowsToggle','⛱️'],
    ['battleDemoCollapse','🐦‍🔥']
  ];
  for(const [id,emoji] of controls){
    assert.ok(html.includes('id="'+id+'"'),id);
    const pos=html.indexOf('id="'+id+'"');
    assert.ok(html.slice(pos,pos+450).includes(emoji),id+' không đúng emoji');
  }
  assert.match(css,/\.gmww-free-icon\{/);
  assert.match(css,/border:0!important[\s\S]*background:transparent!important/);
  assert.match(css,/#battleFactionStatsFloat\.gmww-free-icon/);
  assert.match(css,/#battleDayNoticeFloat\.gmww-free-icon/);
  assert.match(css,/#battleDayGallowsFloat\.gmww-free-icon/);
});

test('Bốn icon dùng cùng drag pointer, được lưu vị trí riêng tại thiết bị',()=>{
  const gm=read('server-game/src/30-village-and-setup.part');
  const app=read('server-game/current/app.js');
  const start=gm.indexOf('const GMWW_BATTLE_ICON_POSITIONS='),end=gm.indexOf('function initDemoPanel(){',start);
  assert.ok(start>0&&end>start);
  const fn=gm.slice(start,end);
  for(const id of ['battleFactionStatsFloat','battleDayNoticeFloat','battleDayGallowsFloat','battleDemoObserver'])
    assert.ok(fn.includes("'"+id+"'"),id);
  assert.match(fn,/shell\.appendChild\(panel\)/);
  assert.match(fn,/setPointerCapture\(event\.pointerId\)/);
  assert.match(fn,/addEventListener\('pointermove'/);
  assert.match(fn,/addEventListener\('pointerup'/);
  assert.match(fn,/Math\.hypot\(dx,dy\)<8/);
  assert.match(fn,/localStorage\.setItem\(GMWW_BATTLE_ICON_POSITIONS/);
  assert.match(fn,/stopImmediatePropagation\(\)/);
  assert.match(fn,/visualViewport\?\.addEventListener\('resize'/);
  assert.doesNotMatch(fn,/playRoomApi\(|fetch\(|assignments\s*=/);
  assert.ok(app.includes(fn),'runtime app.js phải đồng bộ với source module');
});

test('Chạm vẫn mở Thống kê phe và trả lại nội dung Server, không chỉ đổi màu nút',()=>{
  const gm=read('server-game/src/40-battle-and-timeline.part');
  const html=read('server-game/current/GMWW.html');
  const css=read('server-game/current/style.css');
  assert.match(gm,/battleFactionStatsToggle'\)\?\.addEventListener\('click'/);
  assert.match(gm,/panel\.hidden=!panel\.hidden/);
  assert.match(gm,/battleRenderFactionStats\(\)/);
  assert.match(gm,/playSceneRuntime\.assignments/);
  assert.match(html,/id="battleFactionStats"[^>]*role="dialog"/);
  assert.match(css,/#battleFactionStats\{\s*pointer-events:auto!important/);
  assert.match(read('server-game/src/30-village-and-setup.part'),/if\(stats&&stats\.parentElement!==shell\)shell\.appendChild\(stats\)/);
});

test('DEMO mặc định là icon; chạm mở nhật ký, vẫn kéo bằng tiêu đề khi mở rộng',()=>{
  const gm=read('server-game/src/30-village-and-setup.part');
  const controls=read('server-game/src/40-battle-and-timeline.part');
  const css=read('server-game/current/style.css');
  assert.match(gm,/let collapsed=true;try\{collapsed=localStorage\.getItem\(GMWW_DEMO_OBSERVER_COMPACT_KEY\)!=='0'/);
  assert.match(gm,/button\.addEventListener\('click'/);
  assert.match(controls,/battleBindAuxiliaryDrag\('battleDemoObserver','header'\)/);
  assert.match(css,/#battleDemoObserver\.gmww-free-icon\.is-collapsed #battleDemoCollapse/);
});


test('Kéo icon iPhone thực sự di chuyển, lưu vị trí, không kích hoạt nhầm và chạm thường vẫn hoạt động',async()=>{
  const vm=await import('node:vm');
  const source=read('server-game/src/30-village-and-setup.part');
  const start=source.indexOf('const GMWW_BATTLE_ICON_POSITIONS=');
  const end=source.indexOf('function initDemoPanel(){',start);
  assert.ok(start>0&&end>start);
  const events=new Map(),storage=new Map(),panels=new Map();
  const createPanel=(id,x,y)=>{
    const handlers={};
    const classes=new Set(id==='battleDemoObserver'?['is-collapsed']:[]);
    const button={
      dataset:{},
      addEventListener:(type,handler)=>{(handlers[type]??=[]).push(handler)},
      setPointerCapture:()=>{},
      releasePointerCapture:()=>{}
    };
    const style={
      left:'',top:'',
      setProperty(name,value){this[name]=value}
    };
    const panel={
      id,hidden:false,dataset:{},parentElement:null,offsetWidth:50,offsetHeight:50,
      classList:{add:x=>classes.add(x),contains:x=>classes.has(x)},
      style,
      querySelector:()=>button,
      getBoundingClientRect:()=>({
        left:style.left?parseFloat(style.left):x,
        top:style.top?parseFloat(style.top):y,width:50,height:50
      })
    };
    panels.set(id,panel);events.set(id,handlers);return panel;
  };
  createPanel('battleFactionStatsFloat',12,220);
  createPanel('battleDayNoticeFloat',12,300);
  createPanel('battleDayGallowsFloat',12,380);
  createPanel('battleDemoObserver',310,150);
  const stats={id:'battleFactionStats',parentElement:null};
  panels.set('battleFactionStats',stats);
  const shell={appendChild(node){node.parentElement=this}};
  panels.set('playShell',shell);
  const mock={
    document:{getElementById:id=>panels.get(id)||null},
    localStorage:{
      getItem:key=>storage.get(key)||null,
      setItem:(key,value)=>storage.set(key,value)
    },
    window:{addEventListener:()=>{},visualViewport:{addEventListener:()=>{}}},
    innerWidth:390,innerHeight:844,
    Date,Math,JSON,Number,Object
  };
  const context=vm.createContext(mock);
  vm.runInContext(source.slice(start,end)+'\ngmwwSetupFreeBattleIcons();',context);
  for(const id of ['battleFactionStatsFloat','battleDayNoticeFloat','battleDayGallowsFloat','battleDemoObserver'])
    assert.equal(panels.get(id).parentElement,shell,id+' must leave fixed dock');
  assert.equal(stats.parentElement,shell);
  const emit=(id,type,x,y)=>{
    const ev={
      type,pointerId:1,pointerType:'touch',button:0,clientX:x,clientY:y,
      prevented:false,stopped:false,
      preventDefault(){this.prevented=true},
      stopImmediatePropagation(){this.stopped=true}
    };
    for(const handler of events.get(id)[type]||[])handler(ev);
    return ev;
  };
  emit('battleFactionStatsFloat','pointerdown',30,240);
  emit('battleFactionStatsFloat','pointermove',140,450);
  emit('battleFactionStatsFloat','pointerup',140,450);
  const pos=JSON.parse(storage.get('gmww_battle_free_icons_v1'));
  assert.ok(pos.battleFactionStatsFloat.x>0.2&&pos.battleFactionStatsFloat.y>0.4);
  const accidental=emit('battleFactionStatsFloat','click',140,450);
  assert.equal(accidental.stopped,true,'drag must not accidentally open popup');
  const untouched=emit('battleDayNoticeFloat','click',30,300);
  assert.equal(untouched.stopped,false,'normal tap must still open its action');
  assert.ok(!pos.battleDayNoticeFloat,'ordinary tap must not save or move any icon');
  // Re-render must neither rebind listeners nor reset manually positioned icon.
  const count=events.get('battleFactionStatsFloat').pointerdown.length;
  const location=panels.get('battleFactionStatsFloat').style.left;
  vm.runInContext('gmwwSetupFreeBattleIcons();',context);
  assert.equal(events.get('battleFactionStatsFloat').pointerdown.length,count);
  assert.equal(panels.get('battleFactionStatsFloat').style.left,location);
});


test('🌈 Thống kê phe tính số quân thật từ Server, cập nhật người chết và hiện dự báo tham khảo',()=>{
  const source=read('server-game/src/40-battle-and-timeline.part');
  const from=source.indexOf('function battleRenderFactionStats(){');
  const to=source.indexOf('function battleGallowsRender(phase){',from);
  assert.ok(from>0&&to>from,'Must test real GM faction renderer');
  const summary={innerHTML:''},forecast={textContent:''};
  const panel={hidden:false,querySelector:selector=>selector==='[data-faction-counts]'?summary:
    selector==='[data-faction-forecast]'?forecast:null};
  const scope={
    document:{getElementById:id=>id==='battleFactionStats'?panel:null},
    playSceneRuntime:{assignments:[
      {loginId:'u1',roleId:'wolf-1',factionId:'wolf'},
      {loginId:'u2',roleId:'villager-1',factionId:'village'},
      {loginId:'u3',roleId:'third-1',factionId:'third'}
    ],winProposal:null},
    playSceneState:{night:2},
    state:{cards:[]},
    playPlayerEffect:id=>id==='u1'?'dead':'alive',
    playEsc:value=>String(value),
    Map,Math,Number,String,Array
  };
  vm.runInNewContext(source.slice(from,to)+'\nbattleRenderFactionStats();',scope);
  assert.match(summary.innerHTML,/Phe Sói[\s\S]*?0 \/ 1/,'Dead Wolf must not count alive');
  assert.match(summary.innerHTML,/Phe Dân[\s\S]*?1 \/ 1/,'Living village role counted');
  assert.match(summary.innerHTML,/Phe Ba[\s\S]*?1 \/ 1/,'Third faction counted');
  assert.match(forecast.textContent,/Dự báo tham khảo/,'No invented Server victory declaration');
  panel.hidden=true;summary.innerHTML='sentinel';
  vm.runInNewContext('battleRenderFactionStats();',scope);
  assert.equal(summary.innerHTML,'sentinel','Closed stats must not unexpectedly redraw');
});
