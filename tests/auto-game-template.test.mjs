import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const part=readFileSync('server-game/src/40-battle-and-timeline.part','utf8');
const runtime=readFileSync('server-game/current/app.js','utf8');
const html=readFileSync('server-game/current/GMWW.html','utf8');
const actions=readFileSync('server-game/src/50-roles-and-artifacts.part','utf8');
const begin='function gmAutoRankTemplates(',end='function gmAutoShowSummary(';
const extract=text=>text.slice(text.indexOf(begin),text.indexOf(end));
const context=vm.createContext({});
vm.runInContext(extract(part)+'\n globalThis.compose=gmAutoComposeRoles; globalThis.rank=gmAutoRankTemplates;',context);
const {compose,rank}=context;
const sample=[
  ['role_wolf','Sói Thường','wolf'],['role_wolf_seer','Sói Tiên Tri','wolf'],
  ['role_alpha_wolf','Sói Trùm','wolf'],['role_wolf_cub','Sói Con','wolf'],
  ['role_snow_wolf','Sói Tuyết','wolf'],['role_wolf_hunter','Sói Thợ Săn','wolf'],
  ['role_villager','Dân Làng','village'],['role_seer','Tiên Tri','village'],
  ['role_guard','Bảo Vệ','village'],['role_witch','Phù Thủy','village'],
  ['role_hunter','Thợ Săn','village'],['role_spiritualist','Nhà Tinh Thần Học','village'],
  ['role_fox','Hồ Ly','village'],['role_aura_seer','Tiên Tri Hào Quang','village'],
  ['role_piper','Kẻ Thổi Sáo','village'],['role_maiden','Thiếu Nữ','village'],
  ['role_fairy','Yêu Tinh','village'],['role_knight','Hiệp Sĩ','village'],
  ['role_bear_god','Thần Gấu','village'],
  ['role_assassin','Sát Thủ','third'],['role_destroyer','Kẻ Hủy Diệt','third']
].map(([id,name,factionId])=>({id,name,factionId}));

test('role setup: exact count, two sides and third side from 10 players',()=>{
  for(const n of [3,4,5,6,7,8,9,10,11,12,15,20,25,30]){
    const generated=compose(sample,n);
    assert.equal(generated.roles.reduce((s,r)=>s+r.count,0),n,'count for '+n);
    assert.ok(generated.counts.wolf>=1,'wolf for '+n);
    assert.ok(generated.counts.village>generated.counts.wolf,'village majority for '+n);
    assert.equal(generated.counts.third,n>=10?1:0,'third side for '+n);
    for(const role of generated.roles){
      const canonical=sample.find(r=>r.id===role.roleId);
      assert.ok(canonical,'unknown role '+role.roleId);
      assert.equal(role.factionId,canonical.factionId);
    }
  }
});
test('repeated AUTO taps produce a different role composition, including small rooms',()=>{
  for(const n of [3,5,6,10,12,30]){
    const first=compose(sample,n);
    const second=compose(sample,n,[first.signature]);
    assert.notEqual(first.signature,second.signature,'repeat for '+n);
  }
});
test('a missing canonical role or missing third side is refused',()=>{
  assert.throws(()=>compose(sample.filter(r=>r.id!=='role_wolf'),8),/Thiếu Sói Thường/);
  assert.throws(()=>compose(sample.filter(r=>r.factionId!=='third'),10),/Thiếu vai Phe Ba/);
  assert.throws(()=>compose(sample,2),/3–30/);
});
test('saved templates are suggested by nearest size, exact match first',()=>{
  const ranked=rank([{name:'Ván 8',playerCount:8},{name:'Ván 15',playerCount:15},{name:'Ván 10',playerCount:10}],10);
  assert.equal(ranked[0].name,'Ván 10');
  assert.equal(ranked[1].name,'Ván 8');
});
test('GM integration keeps generated previews local until CHỌN VÁN and retains role delivery gates',()=>{
  assert.equal(extract(part),extract(runtime),'generated runtime and editable source diverged');
  assert.match(html,/id="playGameAuto"/);
  assert.match(html,/id="playGameAutoSummary"/);
  assert.match(actions,/getElementById\('playGameAuto'\).*gmAutoPreviewGame/);
  const preview=part.slice(part.indexOf('async function gmAutoPreviewGame('),part.indexOf('function playFactionLabel('));
  assert.doesNotMatch(preview,/gmApi\s*\(/);
  assert.match(part,/id==='__auto__'\?await gmApi\('\/api\/gm\/game-templates',\{method:'PUT'/);
  assert.match(part,/playRoomApi\('\/template-assets'/);
  assert.match(part,/playRoomApi\('\/config'/);
  assert.match(part,/playPublishStage\('roles'\)/);
});
