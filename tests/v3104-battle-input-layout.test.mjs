import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app=fs.readFileSync('server-game/current/app.js','utf8');
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const functionSlice=(a,b)=>app.slice(app.indexOf('function '+a+'('),app.indexOf('function '+b+'(',app.indexOf('function '+a+'(')));
const drop=vm.runInNewContext(functionSlice('battleResolveDropTarget','battleDropCandidates')+'\nbattleResolveDropTarget;');
const token=(id,x,y)=>({dataset:{playPlayerId:id},getBoundingClientRect:()=>({left:x-12,top:y-12,width:24,height:24})});

test('nearby drop resolves to named, unequivocal target, never neighbor',()=>{
  const p=[token('A',100,100),token('B',160,100)];
  assert.equal(drop(99,99,p).id,'A');
  assert.equal(drop(160,100,p).id,'B');
  assert.equal(drop(100,100,p,id=>id==='B').id,'B','invalid roles cannot be targeted');
  assert.deepEqual(JSON.parse(JSON.stringify(drop(900,900,p))),{id:'',ambiguous:false});
});

test('nearby players require explicit named selection instead of a guessed drag target',()=>{
  const p=[token('GM-A',100,100),token('GM-B',122,100)];
  assert.deepEqual(JSON.parse(JSON.stringify(drop(111,100,p))),{id:'',ambiguous:true});
  assert.ok(app.includes("battleOpenTargetSheet(d.id,'list',hit.ambiguous)"));
  assert.match(app,/Hai người đang quá gần nhau/);
  assert.match(app,/battleState\.dragAmbiguous=ambiguous/);
  assert.ok(app.includes('if(hit.id){')&&app.includes('battlePickTargetWithAudio(hit.id,d.id)'));
  assert.match(app,/setPointerCapture\?\.\(e\.pointerId\)/);
});

test('swipe is less demanding, prevents horizontal WKWebView scrolling, ignores swipe click',()=>{
  assert.match(app,/const minDistance=Math\.max\(38,Math\.min\(58,window\.innerWidth\*\.105\)\)/);
  assert.match(app,/Math\.abs\(dx\)>Math\.abs\(dy\)\*1\.12/);
  assert.match(app,/event\.preventDefault\(\)/);
  assert.match(app,/\{passive:false,capture:true\}/);
  assert.match(app,/battleState\.ignoreSwipeClick=Date\.now\(\)\+450/);
  assert.match(app,/if\(playSceneState\.step==='battle'&&Date\.now\(\)<Number\(battleState\.ignoreSwipeClick\|\|0\)\)return/);
});

test('battle uses exactly the same authoritative Seat Mẫu coordinates as GM and Player Web',()=>{
  const source=functionSlice('battleRoomDisplayPosition','renderPlayPlayers');
  const ctx={playSceneState:{step:'battle'}};
  vm.runInNewContext(source,ctx);
  const rendered=ctx.battleRoomDisplayPosition([28,40],1,12);
  assert.deepEqual(Array.from(rendered),[28,40]);
  ctx.playSceneState.step='seats';
  assert.deepEqual(Array.from(ctx.battleRoomDisplayPosition([28,40],1,12)),[28,40]);
  assert.match(app,/make\(m,sid\?battleRoomDisplayPosition\(pos,sid,seatCount\):pos,sid\|\|null\)/);
});

test('the bottom bar order is timer, horizontal actions, undo — all on one row',()=>{
  const begin=html.indexOf('id="battleBottomControls"');
  const clock=html.indexOf('id="playBattleClockFloat"',begin);
  const actions=html.indexOf('id="battleActionTray"',clock);
  const undo=html.indexOf('id="battleUndoFloat"',actions);
  const sheet=html.indexOf('id="battleTargetSheet"',undo);
  assert.ok(begin>0&&begin<clock&&clock<actions&&actions<undo&&undo<sheet);
  assert.match(css,/#battleBottomControls\.battle-bottom-controls-v3104\{/);
  assert.match(css,/display:flex!important;align-items:stretch!important/);
  assert.match(css,/#battleActionBar\.battle-action-scroll\{[\s\S]*?overflow-x:auto!important/);
  assert.match(app,/button\.addEventListener\('click',\(\)=>\{void battleUndoLast\(\)\}\)/);
});

test('gathering toolbar sizes each box to its label and GM menu has balanced tiered columns',()=>{
  assert.match(css,/#playGatherToolbar \.play-gather-toolbar-actions>button\{[\s\S]*?flex:0 0 auto!important;width:max-content!important/);
  assert.match(css,/#playGatherToolbar \.play-gather-toolbar-actions>button>b\{[\s\S]*?white-space:nowrap!important/);
  assert.match(css, /#battleWolfMenu \.battle-wolf-actions\{[\s\S]*?grid-template-columns:repeat\(6,minmax\(0,1fr\)\)!important/);
  for(const id of ['battleGMAudio','battleGMAuto','battleQuickRevive','battleQuickKill','battleExit','battleForceEnd'])
    assert.ok(html.includes('id="'+id+'"'),id);
  assert.match(css,/#battleQuickRevive,[\s\S]*?#battleForceEnd\{[\s\S]*?grid-column:span 3!important/);
});

test('battle screen 8–30 uses safe, identical seat coordinates and does not introduce a second perimeter',()=>{
  const ctx=vm.createContext({playSceneState:{step:'battle'}});
  vm.runInContext(fs.readFileSync('assets/village/village-layout.js','utf8'),ctx);
  vm.runInContext(functionSlice('battleRoomDisplayPosition','renderPlayPlayers'),ctx);
  const l=ctx.GMWW_VILLAGE_LAYOUT;
  for(let n=8;n<=30;n++){
    const source=l.positions(n,l.recommendedSeatShape(n));
    const screen=source.map((p,i)=>ctx.battleRoomDisplayPosition([p.x,p.y],i+1,n));
    assert.equal(screen.length,n);
    for(const p of screen)assert.equal(l.inside(p[0],p[1]),true,n+' player must remain within the courtyard');
    for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
      const dist=Math.hypot(screen[i][0]-screen[j][0],(screen[i][1]-screen[j][1])*1.78);
      assert.ok(dist>=5.2,n+' player '+i+' overlaps '+j+' (distance '+dist+')');
    }
    assert.ok(screen.every((p,i)=>!Number.isNaN(p[0])&&!Number.isNaN(p[1])));
  }
});
