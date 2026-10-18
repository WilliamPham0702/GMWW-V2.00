import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import costumes from '../assets/characters/overhaul-v600/approved-costumes-21-30.json' with {type:'json'};
test('22–30 outfit approvals are not 8-view skinned/animated approvals',()=>{
 const rows=costumes.assets.filter(c=>/^character-(2[2-9]|30)$/.test(c.id));
 assert.equal(rows.length,9);assert.ok(rows.every(c=>c.approval==='costume appearance only'&&c.binaryCommitted===false));
 assert.equal(costumes.sideRearApproved,false);assert.equal(costumes.mainDeployApproved,false);
});
test('staging gallery embeds approved costume source and does not activate 22–30 GLBs',()=>{
 const source=fs.readFileSync(new URL('../scripts/build-character22-30-art-review.mjs',import.meta.url),'utf8');
 assert.ok(source.includes('gmww-character-v600-review.williampham0702.workers.dev'));
 assert.ok(source.includes('UNAPPROVED_ARTWORK_ROSTER'));
 const p='assets/character-v605-review/index.html';
 if(!fs.existsSync(p))return; // Regular npm test runs before staging build; staged pipeline exercises the built file.
 const html=fs.readFileSync(p,'utf8');
 for(let n=22;n<=30;n++)assert.ok(html.includes('character-'+n));
 assert.ok(html.includes('gmww-character-v600-review.williampham0702.workers.dev'));
 assert.ok(html.includes('Chỉ duyệt artwork'));
 assert.ok(!html.includes('22/skin.glb')&&!html.includes('character-22/skin.glb'));
 const gm=fs.readFileSync('assets/character-v605-gm/GMWW.html','utf8');
 assert.ok(gm.includes('/character-v605-review/index.html'));
});
