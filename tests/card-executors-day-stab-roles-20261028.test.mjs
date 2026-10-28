import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('Kỵ Sỹ and Hoàng Tử apply different faction predicates and reveal only actor',()=>{
 const s=fs.readFileSync('src/index.js','utf8');
 assert.match(s,/roleId==="role_cavalier"&&actionId==="action-knight-stab"/);
 assert.match(s,/roleId==="role_prince"&&actionId==="action-g7-prince-stab"/);
 assert.match(s,/roleId==="role_prince"&&isThird\(selected\)/);
 assert.match(s,/revealedActorRole:roleId/);
 assert.match(s,/roleName:roleId==="role_cavalier"\?"Kỵ Sỹ":"Hoàng Tử"/);
 assert.ok(!s.includes('targetRoleRevealedByStab'));
});
