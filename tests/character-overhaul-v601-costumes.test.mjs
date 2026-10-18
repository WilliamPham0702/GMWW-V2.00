import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync(new URL('../assets/characters/overhaul-v600/approved-costumes-21-30.json',import.meta.url),'utf8'));
test('exactly ten reviewed muscle-chibi costumes 21–30 with matched avatar IDs',()=>{
 assert.equal(data.assets.length,10);
 assert.deepEqual(data.assets.map(x=>x.id),Array.from({length:10},(_,i)=>'character-'+String(i+21).padStart(2,'0')));
 assert.ok(data.assets.every(x=>x.avatar.endsWith(x.id+'/avatar.webp')&&x.glb.endsWith(x.id+'/skin.glb')&&x.artwork.endsWith(x.id+'/artwork.png')));
 assert.ok(data.assets.every(x=>x.approval==='costume appearance only'&&x.binaryCommitted===false));
 assert.deepEqual(data.animations,['Idle','Walk','Run','Result']);
});
test('new visual approval must never authorize an incomplete character production release',()=>{
 assert.equal(data.mainDeployApproved,false);
 assert.equal(data.productionChanged,false);
 assert.equal(data.iphoneDeviceVerified,false);
 assert.equal(data.sideRearApproved,false);
 assert.equal(data.animationBrowserVerified,false);
});
