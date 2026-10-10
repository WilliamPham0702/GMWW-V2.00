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
test('Worker crop maps all directions and uses V4 static art only as animation fallback',()=>{
 assert.match(worker,/async function gameCharacterV4Sprite\(/);
 assert.match(worker,/front:0,left:1,back:2,right:3/);
 assert.match(worker,/id==='character-02'\?-145:0/);
 const start=worker.indexOf('async function gameCharacterFrame(');
 const end=worker.indexOf('async function gameCharacterImage(',start);
 const route=worker.slice(start,end);
 assert.match(route,/walk-v263/);
 assert.match(route,/walk-v266-left/);
 assert.match(route,/const preview=await gameCharacterV4Sprite\(env,id,request\)/);
 assert.match(route,/if\(preview\)return preview/);
 assert.ok(route.indexOf('walk-v263')<route.indexOf('const preview=await gameCharacterV4Sprite'), 'animation must be used before static art');
});
test('V4 gallery shows 2 artwork cards, 4 portraits and interactive avatar in action lab',()=>{
 assert.ok(worker.includes('approved-two-characters.avif'));

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
