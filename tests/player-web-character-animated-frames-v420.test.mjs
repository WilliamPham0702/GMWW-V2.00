import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const source=fs.readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
test('Player Web uses animated frame assets before static V4 fallback',()=>{
 const begin=source.indexOf('async function gameCharacterFrame('),end=source.indexOf('async function gameCharacterImage(',begin);
 assert.ok(begin>=0&&end>begin);
 const fn=source.slice(begin,end);
 const walking=fn.indexOf('"/characters/walk-v263/"');
 const preview=fn.indexOf('await gameCharacterV4Sprite(env,id,request)');
 assert.ok(walking>=0&&preview>walking,'V4 preview must not suppress animated frames');
 assert.match(fn,/if\(number<=2\)\{const preview=/);
});

test('Static V4 four-direction character portrait stays on image endpoint',()=>{
 const begin=source.indexOf('async function gameCharacterImage('),end=source.indexOf('function firstFreeSeat(',begin);
 assert.ok(begin>=0&&end>begin);
 const route=source.slice(begin,end);
 assert.match(route,/if\(Number\(m\[1\]\)<=2\)\{const portrait=await gameCharacterV4Sprite\(env,id,request\);if\(portrait\)return portrait;\}/);
 assert.ok(route.indexOf('gameCharacterV4Sprite(env,id,request)')<route.indexOf('gameCharacterFrame(env,id,1,request)'), 'full portrait must be served before frame-1 walk thumbnail');
});
