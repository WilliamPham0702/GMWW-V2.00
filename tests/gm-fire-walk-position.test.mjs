import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync('server-game/current/app.js','utf8');
const css=readFileSync('server-game/current/style.css','utf8');
const source=app.slice(app.indexOf('function gmwwFireWalkDestination('),app.indexOf('function battleMarkPlayers('));
assert.ok(source.startsWith('function gmwwFireWalkDestination('),'walker function missing');
const commands=[];
const member={loginId:'yeu-tinh',gameCharacterId:'character-02'};
const doc={
  getElementById:()=>null,
  querySelector:()=>({getBoundingClientRect:()=>({left:172,top:314,width:56,height:56})})
};
const walker=new Function('document','getComputedStyle','CSS','playUpdateCharacterRig','playPlayerEffect','battleMember',
  source+'\nreturn {gmwwFireWalkSync,gmwwFireWalkDestination};')(
  doc,
  token=>({translate:token.style.translate||'none'}),
  {supports:prop=>prop==='translate'},
  (_,__,command)=>{commands.push(command);return true},
  ()=>'alive',id=>id==='yeu-tinh'?member:null
);
function actor(){
 const a=[],c=new Set(),style={left:'10%',top:'13%',translate:'',zIndex:'',
   removeProperty(p){if(p==='z-index')this.zIndex='';else if(p==='translate')this.translate='';}};
 const token={style,isConnected:true,dataset:{playPlayerId:'yeu-tinh'},classList:{
  add:k=>c.add(k),remove:k=>c.delete(k),contains:k=>c.has(k)},
  querySelector:()=>({}),
  animate(frames,options){let resolve;const finished=new Promise(r=>resolve=r);
   const animation={frames,options,finished,cancel(){},complete(){resolve()}};a.push(animation);return animation;}
 };
 return {token,animations:a};
}
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
test('Yêu Tinh visually LEAVES seat, stands at fire, and RUNS home',async()=>{
 const a=actor(),ring={getBoundingClientRect:()=>({left:0,top:0,width:400,height:700}),
   querySelectorAll:()=>[a.token]};
 walker.gmwwFireWalkSync(ring,new Set(['yeu-tinh']),true);
 assert.equal(a.animations.length,1,'must animate token, not just change facing');
 const outward=a.animations[0];
 assert.equal(outward.frames[0].translate,'0px 0px');
 assert.notEqual(outward.frames[1].translate,'0px 0px','no visual displacement!');
 assert.equal(Object.hasOwn(outward.frames[1],'transform'),false,'must preserve CSS seat positioning');
 assert.equal(commands.at(-1).battleTurnTravel,'out');
 outward.complete();await flush();
 assert.equal(a.token.dataset.gmwwFireWalk,'hold');
 assert.equal(a.token.style.translate,outward.frames[1].translate,'actor must remain beside fire');
 assert.equal(commands.at(-1).battleTurnTravel,'hold');
 assert.equal(commands.at(-1).battleTurnFacing,a.token.dataset.gmwwFireRestFacing,'face fire while idle');
 walker.gmwwFireWalkSync(ring,new Set(),true);
 assert.equal(a.animations.length,2,'must run home after turn');
 const inward=a.animations[1];
 assert.equal(inward.frames[0].translate,outward.frames[1].translate);
 assert.equal(inward.frames[1].translate,'0px 0px');
 assert.equal(commands.at(-1).battleTurnTravel,'back');
 inward.complete();await flush();
 assert.equal(a.token.style.translate,'','exact original seat after return');
 assert.equal(a.token.dataset.gmwwFireWalk,'');
});
test('four corners reach outside perimeter, not fire center',()=>{
 for(const [x,y] of [[12,12],[388,12],[12,688],[388,688]]){
  const p=walker.gmwwFireWalkDestination(x,y,200,342,400,700);
  assert.ok(p.x>=37&&p.x<=363&&p.y>=56&&p.y<=644);
  assert.ok(Math.hypot(p.x-200,p.y-342)>73);
 }
});
test('legacy levitation preference is not reused to disable approved walking',()=>{
 assert.match(app,/GMWW_GM_FIRE_WALK_V2/);
 assert.match(css,/will-change:translate/);
 assert.doesNotMatch(css,/is-gm-turn-floating/);
 assert.match(app,/gmwwWalkExpired=expired;battleMarkPlayers\(\)/);
 assert.match(app,/gmwwFireWalkSync\(ring,actors,motionOn&&!battleState\.gmwwWalkExpired\)/);
});
test('two small compositor animations, no background movement loop',()=>{
 const code=source.slice(source.indexOf('function gmwwFireWalkTravel('),source.indexOf('function gmwwFireWalkSync('));
 assert.match(code,/\{translate:from\},\{translate:target\}/);
 assert.match(code,/token\.style\.translate=target/);
 assert.doesNotMatch(code,/requestAnimationFrame\(|setInterval\(/);
 assert.doesNotMatch(code,/token\.style\.transform=/);
});

test('when timer expires, actor RUNS home instead of snapping instantly',async()=>{
 const a=actor(),ring={getBoundingClientRect:()=>({left:0,top:0,width:400,height:700}),
   querySelectorAll:()=>[a.token]};
 const actors=new Set(['yeu-tinh']);
 walker.gmwwFireWalkSync(ring,actors,true);
 a.animations[0].complete();await flush();
 assert.equal(a.token.dataset.gmwwFireWalk,'hold');
 walker.gmwwFireWalkSync(ring,actors,false);
 assert.equal(a.animations.length,2,'expiry must create a Run-home animation');
 assert.equal(a.token.dataset.gmwwFireWalk,'back','must not immediately snap to seat');
 assert.equal(a.token.style.translate,a.animations[0].frames[1].translate,'remain off seat while running home');
 a.animations[1].complete();await flush();
 assert.equal(a.token.style.translate,'','home offset cleared after Run completes');
});
