import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {reconcileVillageChildren,villageMotionNeedsFrame} from '../assets/village/village.mjs';

class FakeContainer{
 constructor(children=[]){this.children=[...children];this.operations=0}
 get lastElementChild(){return this.children.at(-1)}
 insertBefore(node,before){
   this.operations++;
   const from=this.children.indexOf(node);if(from>=0)this.children.splice(from,1);
   const to=before?this.children.indexOf(before):-1;
   if(to<0)this.children.push(node);else this.children.splice(to,0,node);
 }
}
function node(id,holder){return{id,remove(){holder.children.splice(holder.children.indexOf(this),1)}}}

test('player DOM reconciliation keeps mounted actor identity without restarts',()=>{
 const host=new FakeContainer();const first=node('A',host),second=node('B',host),third=node('C',host);
 host.children=[first,second,third];
 reconcileVillageChildren(host,[first,second,third]);
 assert.equal(host.operations,0,'unchanged snapshot must not mutate the DOM');
 reconcileVillageChildren(host,[first,third,second]);
 assert.equal(host.children[0],first);
 assert.equal(host.children[1],third);
 assert.equal(host.children[2],second);
 assert.equal(host.operations,1,'only reordered actor is moved');
});
test('game animations run only when somebody is actually moving',()=>{
 assert.equal(villageMotionNeedsFrame([]),false);
 assert.equal(villageMotionNeedsFrame([{villageActivity:'sitting',sitUntil:Date.now()+5000,movementStatus:'idle'}]),false);
 assert.equal(villageMotionNeedsFrame([{movementStatus:'moving'}]),true);
});
test('Player Web reuses character rigs and measures real rendering work',()=>{
 const scene=fs.readFileSync('assets/village/village.mjs','utf8');
 const rig=fs.readFileSync('assets/village/character-renderer.mjs','utf8');
 const reporter=fs.readFileSync('assets/village/village-performance.mjs','utf8');
 const html=fs.readFileSync('assets/village/index.html','utf8');
 const raw=fs.readFileSync('src/gmww-members-live.js','utf8');
 const player=JSON.parse(raw.slice(raw.indexOf(' = ')+3).trim().replace(/;$/,''));
 assert.match(scene,/mountedPlayerNodes=new Map\(\)/);
 assert.match(scene,/const desiredPlayers=\[\];roster\.replaceChildren\(\)/);
 assert.match(scene,/reconcileVillageChildren\(players,desiredPlayers\)/);
 assert.match(scene,/if\(villageMotionNeedsFrame\(all\)&&!document\.hidden\)moveFrame=requestAnimationFrame\(animateMovementFrame\)/);
 assert.match(scene,/if\(sitWakeTimer\)\{clearTimeout\(sitWakeTimer\);sitWakeTimer=0\}/);
 assert.match(scene,/const el=mountedPlayerNodes\.get\(String\(data\.id\)\)/);
 assert.match(rig,/if\(root\.dataset\.gaitKey!==gaitKey\)/);
 assert.match(rig,/img\.getAttribute\('src'\)!==src/);
 assert.match(reporter,/sceneNodesReused/);
 assert.match(reporter,/fps,longTasks,worstLongTask/);
 assert.match(html,/village\.mjs\?v=perf2/);
 assert.match(player,/iframe\.src='\/village\/\?embed=1&v=302'/);
 assert.match(player,/mountedCharacters:Number\(d\.mountedCharacters\|\|0\)/);
});
