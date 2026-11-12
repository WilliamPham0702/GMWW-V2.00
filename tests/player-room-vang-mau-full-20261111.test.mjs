import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PLAYER_ROOM_ROLE_CATALOG} from '../src/player-room-role-catalog.js';

const part=readFileSync('src/player-web-src/37-player-rooms.part','utf8');
const worker=readFileSync('src/index.js','utf8');

test('Chọn Ván reproduces the Server picker controls and keeps per-match settings separate',()=>{
  assert.match(part,/VÁN GỢI Ý/);
  assert.match(part,/✨ AUTO VÁN/);
  assert.match(part,/\+ THÊM MỚI/);
  assert.match(part,/CÓ SỬ DỤNG ARTIFACT/);
  assert.match(part,/THỜI GIAN THỰC HIỆN/);
  assert.match(part,/THỜI GIAN RIÊNG TỪNG VAI/);
  assert.match(part,/matchOverrides/);
  assert.match(worker,/const override=body\.matchOverrides/);
  assert.match(worker,/artifactsEnabled=override\.artifactsEnabled===true/);
});

test('Thiết kế Ván Mẫu uses the full Server core role library and matching catalog controls',()=>{
  assert.equal(PLAYER_ROOM_ROLE_CATALOG.length,28);
  for(const id of ['role_old_witch','role_snow_wolf','role_guard','role_seer','role_wolf','role_villager'])
    assert.ok(PLAYER_ROOM_ROLE_CATALOG.some(r=>r.roleId===id),id);
  assert.match(worker,/new Map\(PLAYER_ROOM_ROLE_CATALOG\.map/);
  assert.match(part,/Tìm Lá Bài theo tên hoặc Phe/);
  assert.match(part,/Thường dùng/);
  assert.match(part,/Phe Sói/);
  assert.match(part,/gmww-pr-role-gallery/);
  assert.match(part,/\/api\/gm\/template-role-artwork\//);
  assert.doesNotMatch(part,/resolveArtwork\(/,'Server-only resolver must not break the Player Web designer');
  assert.match(part,/gmww-pr-faction-totals/);
  assert.match(part,/QUAY LẠI CHỌN VÁN/);
  assert.match(part,/save\.textContent='LƯU'/);
});

test('AUTO VÁN keeps the Server balancing result equal to the selected player count',()=>{
  const extract=name=>{
    const start=part.indexOf('function '+name+'(');assert.ok(start>=0,name);
    const open=part.indexOf('{',start);let depth=0,quote='',escape=false;
    for(let i=open;i<part.length;i++){
      const c=part[i];if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote='';continue}
      if(c==='\''||c==='"'||c==='`'){quote=c;continue}
      if(c==='{')depth++;else if(c==='}'&&--depth===0)return part.slice(start,i+1);
    }
    throw new Error('Unclosed function '+name);
  };
  const compose=new Function(extract('factionFor')+';'+extract('composeAutoDeck')+';return composeAutoDeck')();
  const deck=compose(PLAYER_ROOM_ROLE_CATALOG,14,[]);
  assert.equal(deck.roles.reduce((n,r)=>n+r.count,0),14);
  assert.ok(deck.roles.some(r=>r.roleId==='role_wolf'));
  assert.ok(deck.roles.some(r=>r.roleId==='role_seer'));
});
