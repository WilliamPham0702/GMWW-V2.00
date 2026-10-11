import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const begin=app.indexOf('function initBattleSwipeNavigation(){');
const end=app.indexOf('function initBattleControls(){',begin);
const swipeSource=app.slice(begin,end);

test('compact battle action dock has no helper instructions, fits its actions, scrolls horizontally',()=>{
  const tray=html.split('id="battleActionTray"')[1]?.split('id="battleUndoFloat"')[0]||'';
  assert.match(tray,/id="battleActionTrayTitle"/);
  assert.match(tray,/id="battleActionBar"/);
  assert.doesNotMatch(tray,/Giữ và kéo lên Người Chơi|Nhấn hai lần để chọn mục tiêu/);
  const compact=css.slice(css.indexOf('/* Compact, content-sized night ACTION dock.'));
  assert.match(compact,/#battleActionTray\.battle-action-tray-v399\s*\{/);
  assert.match(compact,/width:max-content!important/);
  assert.match(compact,/max-width:calc\(100vw/);
  assert.match(compact,/height:auto!important/);
  assert.match(compact,/overflow-x:auto!important/);
  assert.match(compact,/touch-action:pan-x/);
  assert.match(app,/initBattleSwipeNavigation\(\);/);
  assert.ok(begin>0&&end>begin,'swipe runtime must be installed before controls');
});

function harness(){
  const listeners={root:{},document:{}},navigation=[];
  const root={
    dataset:{},
    contains(target){return target?.inside!==false},
    addEventListener(type,callback){listeners.root[type]=callback},
  };
  const document={
    getElementById(id){return id==='playShell'?root:null},
    addEventListener(type,callback){listeners.document[type]=callback},
  };
  const state={step:'battle',phase:'night'};
  const busy={busy:false,drag:null,targetSheet:false,roster:false,details:false,wolfOpen:false,clockOpen:false};
  const runtime={busy:false};
  let now=1000;
  const env={document,window:{innerWidth:390},Date:{now:()=>now},
    playSceneState:state,playSceneRuntime:runtime,battleState:busy,
    battleNavigateRelative:delta=>navigation.push(delta)};
  vm.runInNewContext(swipeSource+'\ninitBattleSwipeNavigation();',env);
  const target=(zone='scene')=>({
    inside:true,
    closest(selector){
      if(zone==='action'&&selector.includes('#battleActionTray'))return this;
      if(zone==='timeline'&&selector.includes('#playBattleTop'))return this;
      if(zone==='token'&&selector.includes('#playPlayerRing [data-play-player-id]'))return this;
      if(zone==='token'&&selector.startsWith('button,input,'))return this;
      if(zone==='button'&&selector.startsWith('button,input,'))return this;
      return null;
    },
  });
  const start=(x,y,zone='scene')=>{
    const point={clientX:x,clientY:y,identifier:0};
    listeners.root.touchstart({target:target(zone),touches:[point]});
  };
  const endTouch=(x,y)=>{
    now+=220;
    const point={clientX:x,clientY:y,identifier:0};
    listeners.document.touchend({touches:[],changedTouches:[point]});
  };
  return {start,endTouch,navigation,state,busy,runtime,listeners,target,
    swipe(x1,y1,x2,y2,zone='scene'){start(x1,y1,zone);endTouch(x2,y2)},
  };
}

test('iPhone finger swipe left advances; finger swipe right returns to previous role',()=>{
  const h=harness();
  h.swipe(330,250,130,255);
  h.swipe(90,260,290,250);
  assert.deepEqual(h.navigation,[1,-1]);
});

test('vertical scroll, short movement and action/timeline gestures do not change roles',()=>{
  const h=harness();
  h.swipe(220,160,180,420);
  h.swipe(220,160,190,162);
  h.swipe(330,200,90,200,'action');
  h.swipe(330,200,90,200,'timeline');
  h.swipe(330,200,90,200,'button');
  assert.deepEqual(h.navigation,[]);
});

test('swipe can begin on player token without disabling single tap and touch cancellation',()=>{
  const h=harness();
  h.swipe(330,250,150,250,'token');
  h.start(300,230);
  h.listeners.document.touchcancel({});
  h.endTouch(100,230);
  assert.deepEqual(h.navigation,[1]);
});

test('do not change night turns while busy, a target sheet is open, or daytime',()=>{
  const h=harness();
  h.busy.targetSheet=true;h.swipe(320,160,90,160);
  h.busy.targetSheet=false;h.runtime.busy=true;h.swipe(320,160,90,160);
  h.runtime.busy=false;h.state.phase='day';h.swipe(320,160,90,160);
  assert.deepEqual(h.navigation,[]);
});

test('synthetic pointer-touch swipe still navigates in iPhone WebKit regression tests',()=>{
  const h=harness();
  h.listeners.root.pointerdown({pointerType:'touch',pointerId:4,clientX:330,clientY:220,target:h.target()});
  h.listeners.document.pointerup({pointerType:'touch',pointerId:4,clientX:120,clientY:225});
  assert.deepEqual(h.navigation,[1]);
});

test('pen gestures retain navigation support without a touch double-trigger',()=>{
  const h=harness();
  h.listeners.root.pointerdown({pointerType:'pen',pointerId:9,clientX:330,clientY:220,target:h.target()});
  h.listeners.document.pointerup({pointerType:'pen',pointerId:9,clientX:120,clientY:225});
  assert.deepEqual(h.navigation,[1]);
});
