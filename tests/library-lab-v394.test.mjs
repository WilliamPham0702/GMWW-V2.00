import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const source=html.match(/<script id="gmww-lab-script">([\s\S]*?)<\/script>/)?.[1];
function boot(){
  class Node {
    constructor(){this.children=[];this.value='';this.textContent='';this.handlers={};this.className='';}
    addEventListener(type,handler){this.handlers[type]=handler;}
    append(...children){this.children.push(...children);}
    replaceChildren(...children){this.children=[...children];}
  }
  const ids=new Map(['gmwwLabRun','gmwwLabNights','gmwwLabScenario','gmwwLabSummary','gmwwLabLog'].map(id=>[id,new Node()]));
  const document={
    getElementById:id=>ids.get(id)||null,
    createElement:()=>new Node()
  };
  vm.runInNewContext(source,{document,Set,Number,String},{timeout:2000});
  const run=(nights,scenario)=>{
    ids.get('gmwwLabNights').value=String(nights);
    ids.get('gmwwLabScenario').value=scenario;
    ids.get('gmwwLabRun').handlers.click();
    return {summary:ids.get('gmwwLabSummary').textContent,nights:ids.get('gmwwLabLog').children};
  };
  return {run};
}
test('Lab is first Library tab and opens as the initial visible pane',()=>{
  assert.ok(source,'Lab simulator script must be embedded in the OTA HTML');
  const lab=html.indexOf('data-lib="lab"'),cards=html.indexOf('data-lib="cards"');
  assert.ok(lab>0&&lab<cards);
  assert.match(html,/<section class="libpane active" id="lib-lab"/);
  assert.match(html,/<button class="libtab active" data-lib="lab"/);
  assert.match(html,/<section class="libpane" id="lib-cards"/);
});
test('Lab reference simulator runs five scenarios across 3 and 10 nights with event logs',()=>{
  const simulator=boot();
  for(const nights of [3,10]){
    const result=simulator.run(nights,'all');
    assert.equal(result.nights.length,nights);
    assert.match(result.summary,new RegExp(nights+' đêm · '+(nights*5)+' PASS / 0 FAIL'));
    assert.ok(result.nights.every(x=>x.children.length===6),'header plus five checks per night');
  }
});
test('Lab supports isolated freeze test and labels outcomes as simulation only',()=>{
  const result=boot().run(5,'freeze');
  assert.match(result.summary,/5 PASS \/ 0 FAIL/);
  assert.match(result.summary,/CHƯA kiểm thử Engine thực/);
  assert.ok(result.nights.every(x=>x.children.length===2));
  assert.match(html,/MÔ PHỎNG THAM CHIẾU/);
});
test('Lab code cannot call network or mutate persistent game data',()=>{
  assert.doesNotMatch(source,/\b(fetch|XMLHttpRequest|localStorage|sessionStorage|indexedDB)\b/);
  assert.doesNotMatch(source,/\/api\/|\/gm\/|\/player\//);
});
