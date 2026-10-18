import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import roster from '../assets/characters/overhaul-v600/portraits-22-30-v606-staging.json' with {type:'json'};
import costumes from '../assets/characters/overhaul-v600/approved-costumes-21-30.json' with {type:'json'};

const id='character-22';
const row=roster.characters.find(c=>c.id===id);
const outfit=costumes.assets.find(c=>c.id===id);
const asset='assets/characters/overhaul-v600/character-22/';
const directions=['front','front-right','right','back-right','back','back-left','left','front-left'];
const actions=['Idle','Walk','Run','Result'];
test('Character 22 source is genuine approved art, not a copied Character 21 model',()=>{
 assert.ok(row&&outfit);
 assert.equal(outfit.approval,'costume appearance only');
 const p='assets'+row.avatar;
 assert.ok(existsSync(p),'missing original avatar');
 const bytes=readFileSync(p);
 assert.equal(bytes.byteLength,row.bytes);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256);
});
test('Character 22 cannot be promoted from portrait to playable without a verified unique model',()=>{
 const model=asset+'skin.glb';
 const approval=asset+'rig-acceptance.json';
 if(!existsSync(model)||!existsSync(approval)){
  assert.equal(row.availableGLB,false,'portrait-only roster must remain disabled');
  assert.deepEqual(row.availableActions,[]);
  assert.equal(row.validArtworkViews,1);
  return;
 }
 const a=JSON.parse(readFileSync(approval,'utf8'));
 const buf=readFileSync(model);
 assert.equal(buf.toString('ascii',0,4),'glTF');
 assert.equal(buf.readUInt32LE(4),2);
 assert.equal(buf.readUInt32LE(8),buf.length);
 assert.equal(a.characterId,id);
 assert.equal(a.sha256,createHash('sha256').update(buf).digest('hex'));
 assert.equal(a.boneCount,16);
 assert.deepEqual(a.directions,directions);
 assert.deepEqual(a.actions,actions);
 assert.equal(a.stagingOnly,true);
 assert.equal(a.productionEnabled,false);
 assert.equal(a.ownerAcceptedOnIphone,true,'do not activate before owner acceptance');
});
