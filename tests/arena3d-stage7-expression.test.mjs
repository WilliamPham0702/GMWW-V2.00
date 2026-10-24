import test from 'node:test';
import assert from 'node:assert/strict';
import {expressionFrame,renderQualityBudget} from '../assets/village/arena-3d/stage7-expression-motion.mjs';
import {readFileSync} from 'node:fs';
test('GĐ7 expression deterministic and reduced-motion safe',()=>{
 const a=expressionFrame({time:900,index:3,casting:true,moving:true});
 assert.deepEqual(a,expressionFrame({time:900,index:3,casting:true,moving:true}));
 assert.ok(a.smile>.2);assert.ok(a.eyeFocus>0);
 const quiet=expressionFrame({time:900,index:3,moving:true,reducedMotion:true});
 assert.equal(quiet.blink,0);assert.equal(quiet.hairSway,0);assert.equal(quiet.footLift,0);
});
test('GĐ7 adaptive render budgets 6–30 players',()=>{
 for(const n of [6,12,20,30]){
  const quality=renderQualityBudget({characters:n,fps:60});
  assert.ok(quality.maxCharacters===n);
  const eco=renderQualityBudget({characters:n,fps:14,lowPower:true});
  assert.equal(eco.tier,'eco');assert.equal(eco.particles,4);
  assert.ok(eco.pixelRatioCap<=quality.pixelRatioCap);
  assert.equal(renderQualityBudget({characters:n,reducedMotion:true}).animationHz,12);
 }
});
test('GĐ7 no private role or gameplay authority in cosmetic layer',()=>{
 const src=readFileSync('assets/village/arena-3d/stage7-expression-motion.mjs','utf8').replace(/^\s*\/\/.*$/gm,'');
 for(const forbidden of ['gmToken','roleName','faction','secretTarget','fetch(','localStorage'])assert.ok(!src.includes(forbidden));
});

test('GĐ7 renderer imports the actual quality budget dependency',()=>{
 const src=readFileSync('assets/village/arena-3d/character-atelier.mjs','utf8');
 assert.match(src,/import\s*\{[^}]*renderQualityBudget[^}]*\}\s*from\s*['"]\.\/stage7-expression-motion\.mjs['"]/);
 assert.match(src,/setQualityFps/);
 assert.match(src,/animationHz=renderQualityBudget/);
});

test('GĐ7 measured FPS is connected to animation throttle',()=>{
 const live=readFileSync('assets/village/arena-3d/live.mjs','utf8');
 assert.match(live,/field\.setQualityFps\(fps\)/);
 assert.match(live,/document\.body\.dataset\.gmwwStage7=STAGE7_VERSION/);
});
