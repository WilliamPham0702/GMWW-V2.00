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
