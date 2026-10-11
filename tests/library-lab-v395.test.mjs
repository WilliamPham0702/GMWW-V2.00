import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const script=html.match(/<script id="gmww-lab-script">([\s\S]*?)<\/script>/)?.[1];
function simulate(nights,scenario){
 class Element{
  constructor(){this.children=[];this.value='';this.textContent='';this.handlers={};this.className='';}
  addEventListener(name,cb){this.handlers[name]=cb;}
  append(...parts){this.children.push(...parts);}
  replaceChildren(...parts){this.children=[...parts];}
 }
 const ids=new Map(['gmwwLabRun','gmwwLabNights','gmwwLabScenario','gmwwLabSummary','gmwwLabLog'].map(id=>[id,new Element()]));
 const document={getElementById:id=>ids.get(id),createElement:()=>new Element()};
 vm.runInNewContext(script,{document},{timeout:3000});
 ids.get('gmwwLabNights').value=String(nights);
 ids.get('gmwwLabScenario').value=scenario;
 ids.get('gmwwLabRun').handlers.click();
 return {summary:ids.get('gmwwLabSummary').textContent,log:ids.get('gmwwLabLog').children};
}
test('Lab is the first and initial Library pane without removing existing tabs',()=>{
 assert.ok(script,'Simulator source must exist');
 assert.match(html,/<button class="libtab active" data-lib="lab">/);
 assert.match(html,/<section class="libpane active" id="lib-lab"/);
 assert.ok(html.indexOf('data-lib="lab"')<html.indexOf('data-lib="cards"'));
 assert.match(html,/<section class="libpane" id="lib-cards"/);
 assert.match(html,/<section class="libpane" id="lib-artifacts"/);
});
test('Lab runs isolated simulations across multiple nights',()=>{
 for(const nights of [3,5,10]){
  const v=simulate(nights,'all');
  assert.equal(v.log.length,nights);
  assert.match(v.summary,new RegExp(nights+' đêm · '+(nights*5)+' PASS / 0 FAIL'));
  assert.ok(v.log.every(n=>n.children.length===6));
 }
});
test('Frozen seer is blocked by reference oracle, but is not claimed as real Engine PASS',()=>{
 const v=simulate(5,'freeze');
 assert.match(v.summary,/5 PASS \/ 0 FAIL/);
 assert.match(v.summary,/CHƯA kiểm thử Engine thực/);
 assert.match(html,/MÔ PHỎNG THAM CHIẾU/);
});
test('Lab simulator never sends real room API calls or writes storage',()=>{
 assert.doesNotMatch(script,/\b(fetch\s*\(|XMLHttpRequest\s*\(|localStorage\s*\.|sessionStorage\s*\.|indexedDB\s*\.)/);
 assert.doesNotMatch(script,/\/api\/|\/gm\/|\/player\//);
});
