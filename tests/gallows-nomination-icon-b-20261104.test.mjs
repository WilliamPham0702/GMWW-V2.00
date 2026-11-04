import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const gm='server-game/current/action-icons/gmww-gallows-nominate-b.png';
const player='assets/village/gmww-gallows-nominate-b.png';
const sha=x=>createHash('sha256').update(x).digest('hex');

test('Icon B: both GM and Player carry one identical 128px transparent PNG',()=>{
  const a=readFileSync(gm),b=readFileSync(player);
  assert.deepEqual(a,b);
  assert.equal(sha(a),'386c02b68a16f450941d1f422b403088b2385a5df385dcd0b1b3b467b81c12d1');
  assert.equal(a.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(a.readUInt32BE(16),128);assert.equal(a.readUInt32BE(20),128);
  assert.ok(a.includes(Buffer.from('tRNS')),'PNG must preserve alpha transparency');
});

test('Player drag icon is standalone artwork with same snap/preview/OK behavior',()=>{
  const code=readFileSync('assets/village/village.mjs','utf8');
  assert.match(code,/gmww-gallows-nominate-art\{[^}]*width:36px;height:36px/);
  assert.match(code,/new URL\('\.\/gmww-gallows-nominate-b\.png',import\.meta\.url\)/);
  assert.match(code,/icon\.draggable=false;flag\.replaceChildren\(icon\)/);
  assert.match(code,/width:48px;height:48px;display:flex/);
  assert.match(code,/background:transparent;border:0;box-shadow:none/);
  for(const evt of ['gmww:gallows-preview-nominate','gmww:gallows-confirm-nominate','gmww:gallows-reset-nominate']){
    assert.ok(code.includes(evt),evt);
  }
});

test('GM opens nomination with matching asset; no API, rules, IPA, or data change',()=>{
  const css=readFileSync('server-game/current/style.css','utf8');
  assert.match(css,/#battleGallowsPanel \[data-gallows-command="open"\]::before/);
  assert.match(css,/action-icons\/gmww-gallows-nominate-b\.png/);
  const html=readFileSync('server-game/current/GMWW.html','utf8');
  assert.match(html,/data-gallows-command="open"/);
});
