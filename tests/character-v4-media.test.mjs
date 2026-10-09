import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const atlasPath=new URL('../assets/characters/v4/approved-two-characters.avif',import.meta.url);
const worker=fs.readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
const page=fs.readFileSync(new URL('../assets/characters/v4/index.html',import.meta.url),'utf8');
const manifest=JSON.parse(fs.readFileSync(new URL('../assets/characters/v4/manifest.json',import.meta.url),'utf8'));
test('approved two-character transparent 4-way atlas is a real AVIF asset',()=>{
 const raw=fs.readFileSync(atlasPath);
 assert.ok(raw.length>10000&&raw.length<60000);
 assert.equal(raw.toString('ascii',4,12),'ftypavif');
});
test('Worker crop maps front / left / back / right and retains fallback for other accounts',()=>{
 assert.match(worker,/async function gameCharacterV4Sprite\(/);
 assert.match(worker,/front:0,left:1,back:2,right:3/);
 assert.match(worker,/id==='character-02'\?-145:0/);
 assert.match(worker,/newPortrait=await gameCharacterV4Sprite\(env,id,request\)/);
 assert.match(worker,/if\(newPortrait\)return newPortrait/);
 assert.match(worker,/walk-v263/);
});
test('V4 gallery shows 2 artwork cards, 4 portraits and interactive avatar in action lab',()=>{
 assert.match(worker,/approved-two-characters\\.avif/);
 assert.match(page,/data-view="front"/);
 assert.match(page,/data-view="left"/);
 assert.match(page,/data-view="back"/);
 assert.match(page,/data-view="right"/);
 assert.match(page,/id="labCharacter"/);
 assert.match(page,/Nàng Biển/);
 assert.match(page,/Chàng Biển/);
 assert.ok(manifest.characters.slice(0,2).every(c=>c.artworkTestReady));
 assert.ok(manifest.characters.slice(2).every(c=>!c.artworkTestReady));
 assert.ok(!page.includes('id="labArrow"'));
});
