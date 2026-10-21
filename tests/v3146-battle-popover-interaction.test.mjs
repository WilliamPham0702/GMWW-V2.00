import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');

test('V3.146: battle popovers have no corner X and keep explicit HỦY/OK action controls',()=>{
  for(const id of ['battleResultClose','battleTargetClose','battleWolfClose','battleDetailsClose','battleRosterClose']){
    assert.ok(!html.includes('id="'+id+'"'),id+' must not occupy layout space');
  }
  for(const id of ['battleTargetCancel','battleTargetConfirm','battleResultGrip','battleTargetGrip']){
    assert.ok(html.includes('id="'+id+'"'),id+' must remain usable');
  }
  assert.ok(source.includes("void battleConfirm(true)"),'confirmed action stays Server-backed');
  assert.ok(source.includes("battleAdvanceConfirmedTurn()"),'result dismissal preserves the next-turn rule');
});

test('V3.146: all GM action overlays dismiss on an outside pointer tap',()=>{
  const checks=[
    "if(result&&!result.hidden&&!result.contains(target))battleCloseResultPopup()",
    "if(picker&&!picker.hidden&&!picker.contains(target)&&",
    "battleCloseTargetSheet();",
    "if(transfer&&!transfer.hidden&&!transfer.contains(target)&&",
    "battleState.wolfOpen=false;changed=true;",
    "battleState.details=false;battleState.roster=false;changed=true;"
  ];
  for(const statement of checks)assert.ok(source.includes(statement),statement);
  assert.ok(source.includes("!inside('#battleWolfMenu,.play-core-pearl')"),'firepit toggle cannot reopen from an outside-dismiss');
  assert.ok(source.includes("battleBindAuxiliaryDrag('battleWolfMenu','header')"));
  assert.ok(source.includes("battleBindAuxiliaryDrag('battleDetails','.play-battle-turn')"));
  assert.ok(source.includes("battleBindAuxiliaryDrag('battleDetails','#battleRoster > header')"));
  assert.ok(source.includes("battlePlaceTargetSheet(sheet,drag.left+e.clientX-drag.startX"),'target chooser must stay draggable');
  assert.ok(source.includes("battleState.ignoreConfirmClickUntil"),'dragging the OK control cannot trigger an accidental confirmation');
});

test('V3.146: title drag clamps the GM menu inside the iPhone viewport',()=>{
  const beginning=source.indexOf('function battleBindAuxiliaryDrag(');
  const ending=source.indexOf('/* V3.135:',beginning);
  assert.ok(beginning>=0&&ending>beginning);
  const events={};
  const handle={
    dataset:{},
    addEventListener:(name,fn)=>{events[name]=fn},
    setPointerCapture:()=>{},releasePointerCapture:()=>{}
  };
  const styles={};
  const panel={
    hidden:false,offsetWidth:200,offsetHeight:120,
    querySelector:()=>handle,
    getBoundingClientRect:()=>({left:100,top:90,width:200,height:120}),
    dataset:{},classList:{toggle:()=>{},remove:()=>{},add:()=>{}},
    style:{left:'',setProperty:(name,value)=>{styles[name]=value},removeProperty:()=>{}}
  };
  const win={innerWidth:320,innerHeight:640,addEventListener:()=>{},visualViewport:null};
  const ctx={
    document:{getElementById:()=>panel},window:win,gmwwMenuSnap:()=>null,
    battleTargetClampPosition:(width,height,left,top)=>({
      left:Math.max(6,Math.min(320-width-6,left)),
      top:Math.max(6,Math.min(640-height-6,top))
    })
  };
  const bind=vm.runInNewContext(source.slice(beginning,ending)+';battleBindAuxiliaryDrag',ctx);
  bind('battleDetails','.play-battle-turn');
  const common={pointerId:8,button:0,pointerType:'touch',target:{closest:()=>null},preventDefault:()=>{}};
  events.pointerdown({...common,clientX:110,clientY:100});
  events.pointermove({...common,clientX:500,clientY:900});
  assert.equal(styles.left,'114px');
  assert.equal(styles.top,'514px');
  assert.equal(styles.transform,'none');
  events.pointerup(common);
  assert.equal(handle.dataset.gmOverlayDragReady,'1');
});

test('V3.146: every battle overlay shares the exact frosted-glass surface token of Timeline',()=>{
  assert.ok(css.includes('var(--gmww-stage-glass-v330)!important'));
  for(const selector of [
    '#battleTargetSheet.battle-target-sheet-v399','#battleResultPopup.gmww-battle-result-popup',
    '#playBattleDock #battleWolfMenu','#playBattleDock #battleDetails',
    '#battleTransferPanel .gmww-transfer-card'
  ])assert.ok(css.includes(selector),selector);
  assert.ok(css.includes('backdrop-filter:blur(13px) saturate(145%)!important'));
  assert.ok(!html.includes('GMWW V3.145</title>'));
});
