import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const raw=fs.readFileSync(new URL('../assets/characters/v4/manifest.json',import.meta.url),'utf8');
const m=JSON.parse(raw);
test('new characters: 20 unique fresh identities awaiting master approval',()=>{
 assert.equal(m.characters.length,20);
 assert.equal(new Set(m.characters.map(x=>x.id)).size,20);
 assert.equal(m.characters[0].id,'character-01');
 assert.equal(m.characters[0].role,'master');
 assert.ok(m.characters.slice(1).every(x=>x.role==='pending-master-approval'));
 assert.ok(m.characters.every(x=>x.designStatus==='not-approved'&&!x.reviewedByOwner));
});
test('4 anatomically distinct view placeholders and exactly 9 allowed actions',()=>{
 assert.deepEqual(m.policy.directionViews,['front','left','right','back']);
 assert.deepEqual(m.policy.actionIds,['idle','walk','run','sit','sit-down','stand-up','wave','vote','result']);
 assert.deepEqual(m.policy.resultVariants,['win','lose']);
 for(const ch of m.characters)assert.deepEqual(Object.keys(ch.views),m.policy.directionViews);
});
test('legacy files preserved but forbidden as new skin; production and scaling gated',()=>{
 assert.equal(m.policy.preserveLegacyAssetsUntilMigration,true);
 assert.equal(m.policy.mergeProductionBeforeApproval,false);
 assert.equal(m.policy.requireMasterApprovalBeforeScaling,true);
 assert.equal(m.policy.neverUseOldCharacterAssetsAsRig,true);
 assert.equal(m.policy.headTiltDegrees,0);
 assert.deepEqual(m.policy.reviewSizesPx,[70,90,110]);
 assert.equal(m.policy.maxConcurrentPlayers,30);
 assert.ok(!raw.includes('chibi-01.webp'));
});
