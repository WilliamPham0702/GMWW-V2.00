import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync('assets/village/gp2-qa.html','utf8');
const js=fs.readFileSync('assets/village/gp2-qa.mjs','utf8');
const worker=fs.readFileSync('src/index.js','utf8');

test('GP2 QA is an isolated Worker asset, not the live player game entry',()=>{
 assert.match(worker,/url\.pathname\.startsWith\("\/village\/"\)/);
 assert.match(html,/<title>GMWW GP2 — QA không ghi dữ liệu<\/title>/);
 assert.match(html,/gp2-qa\.mjs\?v=1/);
 assert.doesNotMatch(fs.readFileSync('assets/village/index.html','utf8'),/gp2-qa\.mjs/);
 assert.doesNotMatch(fs.readFileSync('server-game/current/GMWW.html','utf8'),/gp2-qa\.mjs/);
});

test('GP2 QA uses production Character atlas engine and immutable actor dimensions',()=>{
 assert.match(js,/mountCharacterRenderer\(portrait/);
 assert.match(js,/character-.*String\(p\.seatId\)/);
 assert.match(html,/width:56px;height:74px/);
 assert.match(js,/gp2ActorCollisionPairs\(seats/);
 assert.match(js,/getState:/);
});

test('GP2 QA has a controlled local Day and Night art picker, never publishes',()=>{
 assert.match(html,/id="dayfile"/);assert.match(html,/id="nightfile"/);
 assert.match(js,/URL\.createObjectURL\(file\)/);
 assert.match(js,/URL\.revokeObjectURL/);
 assert.doesNotMatch(js,/(?:fetch|XMLHttpRequest|sendBeacon)\s*\(/);
 assert.doesNotMatch(js,/\.postMessage\s*\(/);
 assert.match(js,/stage\.setPointerCapture/);
 assert.match(js,/camera\.fromViewport/);
});
