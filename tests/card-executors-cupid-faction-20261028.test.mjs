import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('Cupid saves Faction, roles, delivery and revision transactionally for Undo',()=>{
 const s=fs.readFileSync('src/index.js','utf8');
 assert.match(s,/const cupidTargets=roleUse\?\.roleId==="role_cupid"/);
 assert.ok(s.includes('"deliverySnapshot:"+id'));
 assert.ok(s.includes('cupidTargets.length?"meta":null'));
 assert.ok(s.includes('if(cupidTargets.length===2&&effectiveTargets.length===2)'));
 assert.ok(s.includes('roleCard:{...x.roleCard,factionId:"third"}'));
 assert.ok(s.includes('await this.ctx.storage.put("assignments",changed)'));
});
