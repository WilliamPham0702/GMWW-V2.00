import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const app=readFileSync('server-game/current/app.js','utf8');
const first=app.indexOf('function gmwwHomeTop3Ranked(rows)');
const last=app.indexOf('function gmwwHomeOpenMemberRanking()',first);
if(first<0||last<0)throw Error('Không tìm thấy Top 3 của GM');

function mockElement(tag){
 return {
  tag,children:[],dataset:{},attributes:{},style:{},
  classList:{items:[],add(v){this.items.push(v)}},
  append(...nodes){this.children.push(...nodes)},
  replaceChildren(...nodes){this.children=[...nodes]},
  setAttribute(k,v){this.attributes[k]=v},
  addEventListener(){},
  remove(){this.removed=true}
 };
}

test('Render ba bục dùng đúng ID hồ sơ và không dùng avatar cũ',()=>{
 const target=mockElement('div'),status=mockElement('p');
 const document={
  getElementById:id=>id==='gmwwHomeTop3'?target:id==='gmwwHomeTop3Status'?status:null,
  createElement:mockElement
 };
 const context={
  document,GMWW_SERVER_BASE:'https://gmww.example.test',
  memberStats:member=>({w:member.stats.wins,l:member.stats.losses,games:member.stats.wins+member.stats.losses}),
  gmwwHomeOpenMemberRanking:()=>{}
 };
 vm.runInNewContext(app.slice(first,last),context);
 const members=[
  {displayName:'A Trung',loginId:'trung',gameCharacterId:'character-27',avatarId:'character-01',stats:{wins:1,losses:0}},
  {displayName:'Bin',loginId:'bin',gameCharacterId:'character-08',avatarId:'character-02',stats:{wins:1,losses:0}},
  {displayName:'Đông Hoàng',loginId:'hoang',gameCharacterId:'character-36',avatarId:'character-03',stats:{wins:1,losses:0}}
 ];
 context.gmwwHomeRenderTop3(members);
 assert.equal(target.children.length,3);
 for(const [i,[rank,id,name]] of [[2,'character-08','Bin'],[1,'character-27','A Trung'],[3,'character-36','Đông Hoàng']].entries()){
  const card=target.children[i];
  assert.equal(card.dataset.rank,String(rank));
  assert.deepEqual(card.children.map(x=>x.className),[
   'gmww-home-podium-stage-v3211','gmww-home-podium-platform-v3213','gmww-home-podium-info-v3213'
  ]);
  const image=card.children[0].children[1].children[0];
  assert.equal(image.dataset.memberCharacterId,id);
  assert.equal(image.src,'https://gmww.example.test/api/game-characters/'+id+'/image?rev=c40-4');
  assert.ok(!image.src.includes('/originals/'));
  assert.equal(card.children[2].children[1].textContent,name);
  assert.equal(card.children[2].children[2].textContent,'100%');
  assert.equal(card.children[2].children[5].textContent,'1 thắng / 1 ván');
 }
});

test('Đổi Character của thành viên thì trang chủ đọc ID mới, không bám ảnh cũ',()=>{
 const target=mockElement('div'),status=mockElement('p');
 const context={
  document:{getElementById:id=>id==='gmwwHomeTop3'?target:status,createElement:mockElement},
  GMWW_SERVER_BASE:'https://gmww.example.test',
  memberStats:m=>({w:m.stats.wins,l:m.stats.losses,games:m.stats.wins+m.stats.losses}),
  gmwwHomeOpenMemberRanking:()=>{}
 };
 vm.runInNewContext(app.slice(first,last),context);
 const m={loginId:'a',displayName:'A',gameCharacterId:'character-04',avatarId:'character-11',stats:{wins:2,losses:1}};
 context.gmwwHomeRenderTop3([m]);
 assert.equal(target.children[0].children[0].children[1].children[0].dataset.memberCharacterId,'character-04');
 m.gameCharacterId='character-22';
 context.gmwwHomeRenderTop3([m]);
 assert.equal(target.children[0].children[0].children[1].children[0].dataset.memberCharacterId,'character-22');
});
