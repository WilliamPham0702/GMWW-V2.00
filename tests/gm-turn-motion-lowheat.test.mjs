import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync('server-game/current/app.js','utf8');
const css=readFileSync('server-game/current/style.css','utf8');
const html=readFileSync('server-game/current/GMWW.html','utf8');
const atlas=readFileSync('server-game/current/gmww-shared-motion.js','utf8');
function extract(a,b){const i=app.indexOf(a),j=app.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,a);return app.slice(i,j).trim()}
const cmdPart=extract('function playCharacterAnimationCommand(','function playRigTextureUrl(');
const cmd=(step='battle')=>new Function('playSceneState','playActiveCharacterId','playWalkDirection',
 'return ('+cmdPart+')')({step},id=>id||'character-01',()=> 'right');
const m={loginId:'p1',gameCharacterId:'character-02',characterAnimation:{facing:'right'}};
test('GM walks out, runs back, holds in low-power idle, keeps Seat coordinates',()=>{
 const f=cmd(),walk=f(m,{battleTurnTravel:'out',battleTurnFacing:'left'});
 assert.equal(walk.motion,'walk');assert.equal(walk.state,'walking');assert.equal(walk.facing,'left');
 assert.equal(walk.paused,false);assert.equal(walk.lowPower,true);
 const run=f(m,{battleTurnTravel:'back',battleTurnFacing:'right'});
 assert.equal(run.motion,'run');assert.equal(run.state,'running');assert.equal(run.paused,false);
 const idle=f(m,{});assert.equal(idle.motion,'idle');assert.equal(idle.paused,true);
 const target=f(m,{battleTargetRunning:true});assert.equal(target.motion,'run');
 for(const x of [walk,run]){assert.equal(x.x,undefined);assert.equal(x.y,undefined)}
});
test('dead, frozen, expelled cannot move; outside GM battle stays idle',()=>{
 for(const effect of ['dead','frozen','expelled']){
  const state=cmd()(m,{battleTurnTravel:'out',effect});
  assert.equal(state.motion,'idle',effect);assert.equal(state.paused,true,effect);
 }
 assert.equal(cmd('lobby')(m,{battleTurnTravel:'out'}).motion,'idle');
});
const pure=extract('function gmwwFireWalkDestination(','function gmwwFireWalkRig(');
const point=new Function('return ('+pure+')')();
test('four corners approach without stepping onto fire or leaving view',()=>{
 const cx=180,cy=320,w=360,h=700;
 for(const [x,y] of [[12,12],[348,12],[12,688],[348,688]]){
  const p=point(x,y,cx,cy,w,h);
  assert.ok(p.x>=37&&p.x<=w-37&&p.y>=56&&p.y<=h-56,JSON.stringify(p));
  assert.ok(Math.hypot(p.x-cx,p.y-cy)>73,'outside fire core');
  assert.ok((p.x-cx)*(x-cx)>=0,'stay on correct fire side');
  assert.ok((p.y-cy)*(y-cy)>=0,'stay on correct fire side');
 }
});
test('eight walkers near same corner pick separate perimeter spaces',()=>{
 const spots=[];
 for(let i=0;i<8;i++){
  const p=point(16+i*2,16+i*2,180,320,360,700,spots);
  assert.ok(spots.every(x=>Math.hypot(x.x-p.x,x.y-p.y)>=34),'overlap '+i);
  spots.push(p);
 }
});
test('GPU two-trip animation, clock expiry and switch restore seats; no levitation',()=>{
 const code=extract('function gmwwFireWalkTravel(','function gmwwFireWalkSync(');
 assert.match(code,/token\.animate\(/);
 assert.match(code,/phase==='back'\?'ease-in':'ease-out'/);
 assert.doesNotMatch(code,/requestAnimationFrame\(|setInterval\(/);
 assert.match(app,/gmwwWalkExpired=expired;battleMarkPlayers\(\)/);
 assert.match(app,/gmwwFireWalkSync\(ring,actors,motionOn&&!battleState\.gmwwWalkExpired\)/);
 assert.match(app,/if\(!member\|\|\['dead','frozen','expelled'\]\.includes\(playPlayerEffect\(id\)\)\)\{gmwwFireWalkCancel/);
 assert.match(app,/gmwwFireWalkTravel\(el,member,'back'/); // timer expiry initiates run-home, never snaps
 assert.doesNotMatch(app,/is-gm-turn-floating/);
 assert.doesNotMatch(css,/is-gm-turn-floating|translate3d\(0,-100%,0\)/);
 assert.match(css,/is-gm-walking-fire/);
 assert.match(html,/id="battleGMTurnMotion"[^>]*>Đi bộ<\/button>/);
 assert.match(app,/prefers-reduced-motion: reduce/);
});
test('shared character atlas still caps GM low power to 15 FPS',()=>{
 assert.match(atlas,/root\._gmwwLowPower=command\.lowPower===true/);
 assert.match(atlas,/1000\/15/);
 assert.ok(atlas.includes('[...roots].some(root=>!root._gmwwLowPower||!root._gmwwPaused)')||atlas.includes('[...roots].some(root=>root.isConnected&&(!root._gmwwLowPower||!root._gmwwPaused))'));
});
test('6 source modules assemble exactly to shipped GM app',()=>{
 const parts=['00-core-and-library','10-library-and-settings','20-members-and-roster','30-village-and-setup','40-battle-and-timeline','50-roles-and-artifacts'].map(n=>readFileSync('server-game/src/'+n+'.part','utf8')).join('');
 assert.equal(parts,app);
});
