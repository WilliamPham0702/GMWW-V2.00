import test from 'node:test';
import assert from 'node:assert/strict';
import {createArenaAdaptiveQuality} from '../assets/village/arena-3d/render-optimization.mjs';
import {renderQualityBudget} from '../assets/village/arena-3d/stage7-expression-motion.mjs';
test('GĐ13 low-end mobile: 3 consecutive slow VISIBLE GPU frames enter eco tier',()=>{
 const q=createArenaAdaptiveQuality({severeFrames:3});
 assert.equal(q.observe(0,true),false);
 assert.equal(q.observe(420,true),false);
 assert.equal(q.observe(830,true),false);
 assert.equal(q.observe(1240,true),true);
 const tier=renderQualityBudget({characters:30,lowPower:q.lowPower,fps:2});
 assert.equal(tier.tier,'eco');assert.equal(tier.pixelRatioCap,.85);
});
test('GĐ13 single sleep/long frame, hidden tab or debugger pause do NOT force eco',()=>{
 const q=createArenaAdaptiveQuality({severeFrames:3});
 q.observe(0);q.observe(440);q.observe(470);q.observe(3100);
 assert.equal(q.lowPower,false);
 q.observe(3520);q.observe(3940);q.observe(4350,false);
 assert.equal(q.lowPower,false,'hidden tab cancels repeated lag signal');
 q.observe(4800);q.observe(5200);q.observe(5600);
 assert.equal(q.lowPower,false,'only two consecutive long gaps after re-entry');
 q.reset();assert.equal(q.lowPower,false);
});
test('GĐ13 existing adaptive recovery stays compatible with accepted Stage5 behaviour',()=>{
 const q=createArenaAdaptiveQuality({windowSize:4,slowWindows:2,fastWindows:2,cooldownMs:0});
 let t=0;q.observe(t);
 for(let i=0;i<8;i++){t+=48;q.observe(t)}
 assert.equal(q.lowPower,true);
 for(let i=0;i<8;i++){t+=16;q.observe(t)}
 assert.equal(q.lowPower,false);
});
