import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const src=p=>fs.readFileSync(p,'utf8');
const village=src('assets/village/village.mjs');
const parent=src('src/player-web-src/20-village-and-profile.part');

test('Snap chọn Character hợp lệ gần nhất, không hút người chết hoặc người không đủ điều kiện',()=>{
  const start=village.indexOf('      const snapCandidate=(x,y)=>{');
  const end=village.indexOf('      const highlight=node=>',start);
  assert.ok(start>0&&end>start,'Missing focused snap selection function');
  const code=village.slice(start,end);
  const make=(id,x,y,valid)=>({id,valid,getBoundingClientRect:()=>({left:x-20,top:y-20,width:40,height:40})});
  const dead=make('dead',100,100,false),alice=make('alice',115,110,true),
    bob=make('bob',148,148,true),remote=make('remote',600,600,true);
  const scope={document:{querySelectorAll:()=>[dead,alice,bob,remote]},eligibleNode:n=>n.valid,Math};
  assert.equal(vm.runInNewContext(code+'\nsnapCandidate(108,105).id',scope),'alice');
  assert.equal(vm.runInNewContext(code+'\nsnapCandidate(152,145).id',scope),'bob');
  assert.equal(vm.runInNewContext(code+'\nsnapCandidate(370,370)',scope),null);
});

test('Cờ đỏ to, hút rõ Character, trạng thái tạm và nút OK / Khôi Phục nằm trên làng',()=>{
  assert.match(village,/width:clamp\(72px,18vw,100px\)/);
  assert.match(village,/fill="#eb3047"/);
  assert.match(village,/gmww-gallows-snap-target/);
  assert.match(village,/outline:4px solid #ffdf6c/);
  assert.match(village,/filter:brightness\(1\.28\)/);
  assert.match(village,/flag\.classList\.toggle\('gmww-snap-near'/);
  assert.match(village,/data-gallows-ok/);
  assert.match(village,/data-gallows-reset/);
  assert.match(village,/gmww:gallows-preview-nominate/);
  assert.match(village,/gmww:gallows-confirm-nominate/);
  assert.match(village,/gmww:gallows-reset-nominate/);
});

test('Thả cờ CHỈ là preview; OK mới gửi Server, Khôi Phục quay về đống lửa',()=>{
  const move=village.slice(village.indexOf("flag.addEventListener('pointermove'"),village.indexOf("flag.addEventListener('pointercancel'"));
  assert.match(move,/post\('gmww:gallows-preview-nominate',pendingId\)/);
  assert.doesNotMatch(move,/sendGallowsChoice|fetch\(|\/api\/rooms/);
  assert.match(village,/if\(!pendingId\)return;\s*post\('gmww:gallows-confirm-nominate',pendingId\)/);
  assert.match(village,/const reset=\(\)=>\{[\s\S]*?atFire\(\);[\s\S]*?post\('gmww:gallows-reset-nominate'\)/);
  assert.match(parent,/if\(d\.type==='gmww:gallows-confirm-nominate'\)/);
  assert.match(parent,/if\(id===String\(state\.gallowsSelectedId\|\|''\)\)void sendGallowsChoice\('nominate',id\)/);
  assert.match(parent,/if\(d\.type==='gmww:gallows-reset-nominate'\)/);
  assert.match(parent,/state\.gallowsSelectedId='';\s*renderGallowsWidget\(\);syncVillageFrame\(true\)/);
  assert.match(parent,/gallowsEligibleTargets:/);
  assert.match(parent,/event\.origin!==location\.origin/);
});

test('Người không đủ điều kiện không thể được xác nhận qua iframe',()=>{
  assert.match(parent,/validActor=g\?\.mode==='auto'&&gallowsCurrentStage\(\)==='nominating'/);
  assert.match(parent,/validTarget=id&&id!==me&&\(g\.eligible\|\|\[\]\)\.includes\(id\)/);
  assert.match(parent,/!\(p\.statusTags\|\|\[\]\)\.some\(tag=>tag\.statusId==='dead'\)/);
  assert.match(village,/eligibleNode\(snapNode\)/);
  assert.match(village,/allowed\.includes\(id\)/);
});
