import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const gmCss=fs.readFileSync('server-game/current/style.css','utf8');
const app=fs.readFileSync('server-game/current/app.js','utf8');

// Extract the renderPlayPlayers() body so assertions target that function only.
function functionBody(source,name){
  const start=source.indexOf('function '+name+'(');
  assert.ok(start>=0,name+' must exist');
  const open=source.indexOf('{',start);
  let depth=0;
  for(let i=open;i<source.length;i++){
    if(source[i]==='{')depth++;
    else if(source[i]==='}'){depth--;if(depth===0)return source.slice(start,i+1)}
  }
  throw new Error('unterminated '+name);
}

test('renderPlayPlayers re-applies battle markers after rebuilding the ring',()=>{
  const body=functionBody(app,'renderPlayPlayers');
  assert.match(body,/ring\.innerHTML='';/);
  assert.match(body,/if\(playSceneState\.step==='battle'\)battleMarkPlayers\(\);/);
});

test('battle actor uses a gold star marker, not the old text chip or rectangular outline',()=>{
  assert.match(gmCss,/is-battle-actor\.is-seat-occupied:not\(\.is-gm-rider\)::before\{[^}]*animation:gmwwTurnLeaf/);
  assert.doesNotMatch(gmCss,/ĐẾN LƯỢT/);
  assert.doesNotMatch(gmCss,/is-battle-actor \.play-player-avatar\{[^}]*outline:3px solid/);
});

test('battle target uses a rotating mint ring and MỤC TIÊU label, not a dashed outline',()=>{
  assert.match(gmCss,/is-battle-target:not\(\.is-frozen\) \.play-player-avatar:before\{content:""/);
  assert.match(gmCss,/is-battle-target:after\{content:"MỤC TIÊU"/);
  assert.doesNotMatch(gmCss,/outline:3px dashed #d6fff8/);
});

test('target ring does not collide with frozen effect pseudo-elements',()=>{
  // frozen uses avatar :before/:after; the target ring must skip frozen tokens.
  assert.match(gmCss,/is-battle-target:not\(\.is-frozen\)/);
});

test('turn and target animations respect reduced motion',()=>{
  assert.match(gmCss,/@media\(prefers-reduced-motion:reduce\)\{[^}]*is-battle-actor\.is-seat-occupied[^}]*animation:none/);
  assert.match(gmCss,/@keyframes gmwwTargetSpin/);
  assert.match(gmCss,/@keyframes gmwwTurnLeaf/);
});
