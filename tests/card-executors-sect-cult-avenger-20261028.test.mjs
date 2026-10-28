import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {STATUS_DEFS} from '../src/gmww-public-room-contract.js';
test('Trưởng Phái marks member without blocking power; Tà Đạo blocks special powers',()=>{
 assert.equal(STATUS_DEFS.sect_member.blocks,false);
 assert.equal(STATUS_DEFS.disabled_permanent.blocks,true);
 const s=fs.readFileSync('src/index.js','utf8');
 for(const text of ["roleId==='role_cult'","CULT_RECRUITMENT_FIRST_FIVE_NIGHTS_ONLY",
  'roleUse.actionId===\'25\'?\'sect_member\':\'disabled_permanent\'',
  'AVENGER_NIGHT_ONE_TARGET_INVALID'])assert.ok(s.includes(text));
});
test('Kẻ Báo Thù privately inherits targets faction, not another Role',()=>{
 const s=fs.readFileSync('src/index.js','utf8');
 assert.ok(s.includes('avengerTargets.length===1&&effectiveTargets.length===1'));
 assert.ok(s.includes('roleCard:{...x.roleCard,factionId:faction}'));
 assert.ok(s.includes('avengerTargets.length)?"meta":null'));
});
