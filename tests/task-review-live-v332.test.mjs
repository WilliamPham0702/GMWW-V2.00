import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const worker=fs.readFileSync('src/index.js','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

class ElementMock {
  constructor(tag) {this.tagName=tag;this.children=[];this.className='';this.events={};this.attributes={};this.dataset={};this.textContent='';}
  append(...items){this.children.push(...items)}
  setAttribute(k,v){this.attributes[k]=v}
  addEventListener(k,fn){this.events[k]=fn}
  get childElementCount(){return this.children.length}
}
function descend(node){return [node,...node.children.flatMap(descend)]}

test('V3.37 truly renders owner review buttons in a pending task card',()=>{
  const start=app.indexOf('function gmwwTaskReviewLink('),end=app.indexOf('async function gmwwTasksRefresh(',start);
  assert.ok(start>=0 && end>start,'task UI code located');
  const source=app.slice(start,end);
  const ctx={document:{createElement:tag=>new ElementMock(tag)},window:{confirm:()=>true},Date,Number,String};
  vm.createContext(ctx);
  const task=vm.runInContext(source+'\ngmwwTaskItem({number:91,title:"Nghiệm thu",state:"pending",summary:"Test",updatedAt:"2026-10-08T01:00:00Z"});',ctx);
  const actions=descend(task).filter(n=>n.tagName==='a');
  assert.equal(actions.length,2);
  assert.equal(actions[0].href,'https://github.com/WilliamPham0702/GMWW-V2.00/issues/91');
  assert.equal(actions[1].href,actions[0].href);
  assert.ok(actions[0].textContent.includes('XÁC NHẬN HOÀN THÀNH'));
  assert.ok(actions[1].textContent.includes('BỎ QUA'));
  assert.ok(actions.every(a=>a.target==='_self'),'WKWebView must navigate in current frame to invoke UIApplication.open');
  assert.equal(typeof actions[0].events.click,'function');
});

test('V3.37 IPA view announces real task-action readiness and reloads after successful OTA',()=>{
  assert.equal(pkg.version,'3.46.0');
  assert.match(worker,/VERSION="V3\.46",NATIVE_SHELL_VERSION="3\.17",UPDATE_CHANNEL_REV="runtime-346"/);
  assert.match(html,/<title>GMWW V3\.46<\/title>/);
  assert.match(html,/id="gmwwTaskReviewHealth"/);
  assert.match(html,/data-ready="false"/);
  assert.match(app,/reviewState\.dataset\.ready=ready\?'true':'false'/);
  assert.match(app,/querySelectorAll\('\.gmww-task-review-link\.completed'\)/);
  assert.match(app,/setTimeout\(\(\)=>\{if\(!gmwwNativePost\('restartRuntime'\)\)window\.location\.reload\(\)\},300\)/);
  assert.match(css,/\.gmww-task-review-health\[data-ready="false"\]/);
  assert.doesNotMatch(app,/setTimeout\(\(\)=>gmwwTasksRefresh\(\{silent:false\}\),500\)/);
  assert.match(app,/getElementById\('gmwwTasksReload'\)/);
});
