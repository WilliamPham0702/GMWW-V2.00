import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('server-game/current/GMWW.html','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');
const part=fs.readFileSync('server-game/src/20-members-and-roster.part','utf8');
const css=fs.readFileSync('server-game/current/style.css','utf8');
const start='/* GMWW V3.230 — thông báo thống nhất';
const end='/* END GMWW SETTINGS NOTICES V3.230 */';
function noticeSource(){
  const a=part.indexOf(start),b=part.indexOf(end,a);
  assert.ok(a>=0&&b>a,'missing notice source');
  return part.slice(a,b+end.length);
}
test('16 công cụ được giữ nguyên, hộp thông báo nằm ngoài grid 3 cột',()=>{
  const gridStart=html.indexOf('id="settingsToolsRail"');
  const gridEnd=html.indexOf('id="settingsNoticePanel"',gridStart);
  const endGrid=html.lastIndexOf('</div>',gridEnd);
  const rail=html.slice(gridStart,gridEnd);
  const ids=[...rail.matchAll(/<button\b[^>]*\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,16,ids.join(', '));
  assert.equal(new Set(ids).size,16);
  assert.ok(gridEnd>endGrid);
  assert.ok(html.indexOf('id="gmwwCloudflarePanel"',gridEnd)>gridEnd);
  assert.ok(!rail.includes('settingsOptimizeDOStatus'),'DO status must not stretch grid');
  assert.ok(!html.includes('id="settingsHealthSummary"'),'old inline status above grid should be removed');
  assert.match(html,/id="settingsNoticeList"[^>]*aria-live="polite"/);
  assert.match(html,/id="settingsNoticeClear"/);
  assert.match(css,/#settings #settingsNoticePanel \.settings-notice-list/);
  assert.match(css,/max-height:224px/);
});
test('GM source bundle đồng nhất và release V3.230',()=>{
  const parts=[
    '00-core-and-library.part','10-library-and-settings.part',
    '20-members-and-roster.part','30-village-and-setup.part',
    '40-battle-and-timeline.part','50-roles-and-artifacts.part'
  ].map(x=>fs.readFileSync('server-game/src/'+x,'utf8')).join('');
  assert.equal(app,parts,'GM packed app must match 6 source parts byte-for-byte');
  assert.match(app,/const VERSION='3\.230'/);
  assert.match(html,/<title>GMWW V3\.230<\/title>/);
  assert.match(fs.readFileSync('src/index.js','utf8'),/VERSION="V3\.230"/);
  assert.match(fs.readFileSync('.github/scripts/prepare-update-channel.mjs','utf8'),/V3\.230: Cài đặt/);
  assert.ok(fs.existsSync('docs/releases/GMWW-V3.230-settings-notices-20261026.md'));
});
test('Thông báo hiển thị an toàn: mới nhất trên đầu, trần 12, xoá không ảnh hưởng dữ liệu',()=>{
  function element(){
    const o={textContent:'',className:'',children:[],hidden:false,events:{},
      append(...nodes){this.children.push(...nodes)},
      prepend(node){node.parent=this;this.children.unshift(node)},
      replaceChildren(){this.children=[]},
      remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this)},
      addEventListener(type,fn){this.events[type]=fn},
      contains(){return true},
      get lastElementChild(){return this.children[this.children.length-1]},
      set dateTime(s){this._time=s}
    };
    return o;
  }
  const ids=['settingsNoticePanel','settingsNoticeList','settingsNoticeEmpty','settingsNoticeCount',
    'settingsNoticeClear','settingsToolsRail','opsAutoCheck','gmwwCfState'];
  const elements=Object.fromEntries(ids.map(id=>[id,element()]));
  const doc={getElementById(id){return elements[id]||null},createElement(){return element()}};
  const context={document:doc,Date,MutationObserver:undefined};
  vm.createContext(context);
  vm.runInContext(noticeSource()+'\nthis.push=pushSettingsNotice;this.history=gmwwSettingsNoticeHistory;',context);
  context.push('settingsOptimizeDO','ok','<b>thành công</b>');
  assert.equal(elements.settingsNoticeList.children.length,1);
  const first=elements.settingsNoticeList.children[0];
  assert.equal(first.children[1].children[1].textContent,'<b>thành công</b>');
  assert.equal(elements.settingsNoticeEmpty.hidden,true);
  for(let n=0;n<20;n++)context.push('checkServerHealth',n%2?'bad':'ok','lần '+n);
  assert.equal(elements.settingsNoticeList.children.length,12);
  assert.equal(context.history.length,12);
  assert.equal(elements.settingsNoticeList.children[0].children[1].children[1].textContent,'lần 19');
  const original=context.history.length;
  context.push('tool-not-whitelisted','ok','ignored');
  assert.equal(context.history.length,original);
  elements.settingsNoticeClear.events.click();
  assert.equal(elements.settingsNoticeList.children.length,0);
  assert.equal(elements.settingsNoticeEmpty.hidden,false);
  assert.equal(elements.settingsNoticeCount.textContent,'0 thông báo');
});
test('Tất cả status đẩy vào box, không thay đổi Core hay endpoint DO',()=>{
  const part10=fs.readFileSync('server-game/src/10-library-and-settings.part','utf8');
  assert.match(part10,/gmwwSettingsNoticeFromActive\(\['auditLocalData','clearRuntimeCache'/);
  assert.match(part10,/gmwwSettingsNoticeFromActive\(\['runSystemDiagnostics'/);
  assert.match(part10,/gmwwSettingsNoticeFromActive\(\['checkServerHealth'/);
  assert.match(part,/pushSettingsNotice\('settingsOptimizeDO','ok'/);
  assert.match(part,/pushSettingsNotice\('settingsRunHealth'/);
  assert.ok(!part.includes('settingsOptimizeDOStatus'));
  assert.match(part,/if\(!silent\).*?pushSettingsNotice\(targetId/s);
  assert.match(part,/gmwwSettingsNoticeHistory\.length>12/);
  assert.ok(!/innerHTML\s*=/.test(noticeSource()),'notice rendering must use textContent');
});
