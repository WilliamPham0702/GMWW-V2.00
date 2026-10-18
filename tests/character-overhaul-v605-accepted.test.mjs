import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {extractGlbFromReviewHtml,parseGlb,retargetCharacter21,validateCharacter21,APPROVED_SOURCE_SHA256,ACCEPTED_CHARACTER_ID,JOINTS,CLIPS} from '../scripts/vendor-character21-v605.mjs';
import accepted from '../assets/characters/overhaul-v600/character-21-v605-accepted.json' with {type:'json'};
test('Owner accepted Character 21 iPhone only, no game-wide production authorization',()=>{
 assert.equal(accepted.characterId,ACCEPTED_CHARACTER_ID);
 assert.equal(accepted.approvedOnIphone,true);
 assert.equal(accepted.approvedForMain,false);
 assert.equal(accepted.approvedForProduction,false);
 assert.equal(accepted.appliesToOtherCharacters,false);
 assert.equal(accepted.sourceSHA256,APPROVED_SOURCE_SHA256);
 assert.deepEqual(accepted.actions,CLIPS);
 assert.equal(JOINTS.length,16);
 assert.equal(accepted.directions,8);
});
test('Static art cannot masquerade as rigged character',()=>{
 assert.throws(()=>extractGlbFromReviewHtml('<html>static</html>'),/MISSING_V605_BASE64_GLB/);
 assert.throws(()=>parseGlb(Buffer.alloc(100)),/INVALID_GLTF2_CONTAINER/);
 assert.throws(()=>validateCharacter21({skins:[],meshes:[]}),/JOINTS_NOT_V510_16/);
});
test('Vendored model is Character 21, with eight directions and the four original animations',()=>{
 const file='assets/characters/overhaul-v600/character-21/skin.glb';
 if(!fs.existsSync(file))return; // Draft stage: workflow makes this binary and then runs this test.
 const doc=parseGlb(fs.readFileSync(file)).json;
 validateCharacter21(doc);
 assert.equal(doc.nodes[0].extras.gmwwSkin.characterId,'character-21');
 assert.equal(doc.extras.gmwwCharacterSkin.approvedForProduction,false);
});
