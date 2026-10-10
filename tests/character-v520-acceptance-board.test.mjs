import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
 TEST_BOARD_VERSION,AUTO_TESTS,MANUAL_TESTS,PERFORMANCE_THRESHOLDS,
 median,normalizeResult,classifyPerformance,releaseReadiness
} from '../assets/characters/v5/test-gates-v520.mjs';
const html=fs.readFileSync(new URL('../assets/characters/v5/test-board-v520.html',import.meta.url),'utf8');
const board=fs.readFileSync(new URL('../assets/characters/v5/test-board-v520.mjs',import.meta.url),'utf8');
const studio=fs.readFileSync(new URL('../assets/characters/v5/character-master-v500.mjs',import.meta.url),'utf8');
const live=fs.readFileSync(new URL('../src/gmww-members-live.js',import.meta.url),'utf8');
const village=fs.readFileSync(new URL('../assets/village/village.mjs',import.meta.url),'utf8');
test('V5.20 exposes ten measurable automatic checks and five visible owner checks',()=>{
 assert.equal(TEST_BOARD_VERSION,'5.20-acceptance-board');
 assert.equal(AUTO_TESTS.length,10);
 assert.equal(MANUAL_TESTS.length,5);
 assert.equal(new Set(AUTO_TESTS.map(t=>t.id)).size,10);
 assert.ok(['engine','actions','directions','travel','sit','fallback','perf1','perf10','perf20','perf30'].every(id=>AUTO_TESTS.some(t=>t.id===id)));
 assert.ok(AUTO_TESTS.every(t=>t.required));
});
test('cannot approve live integration from CI/automatic test results alone',()=>{
 const passed=Object.fromEntries(AUTO_TESTS.map(t=>[t.id,{status:'pass'}]));
 const visual=Object.fromEntries(MANUAL_TESTS.map(t=>[t.id,true]));
 assert.equal(releaseReadiness(passed,visual,false).readyForLive,false);
 assert.equal(releaseReadiness(passed,{},true).readyForLive,false);
 assert.equal(releaseReadiness({...passed,perf30:{status:'fail'}},visual,true).readyForLive,false);
 assert.equal(releaseReadiness(passed,visual,true).readyForLive,true);
 assert.deepEqual(releaseReadiness({}, {}, false).pendingTests.map(String),AUTO_TESTS.map(t=>t.id));
});
test('unmeasured, slow and high-jitter devices fail performance gate',()=>{
 const p1=classifyPerformance('perf1',{fpsSamples:[55,56,57],p95Ms:26,actors:1});
 assert.equal(p1.status,'pass');
 const p30=classifyPerformance('perf30',{fpsSamples:[35,34,32,33],p95Ms:45,actors:30});
 assert.equal(p30.status,'pass');
 assert.equal(classifyPerformance('perf30',{fpsSamples:[25,27,28],p95Ms:35,actors:30}).status,'fail');
 assert.equal(classifyPerformance('perf30',{fpsSamples:[34,38],p95Ms:73,actors:30}).status,'fail');
 assert.equal(classifyPerformance('perf30',{fpsSamples:[],p95Ms:20,actors:30}).status,'fail');
 assert.equal(classifyPerformance('perf30',{fpsSamples:[60],p95Ms:20,actors:3}).status,'fail');
 assert.throws(()=>classifyPerformance('perf42',{}),/UNKNOWN_PERFORMANCE_TEST/);
 assert.equal(PERFORMANCE_THRESHOLDS.perf30.minFps,30);
 assert.equal(median([20,33,48,51]),40.5);
});
test('normalization rejects fake PASS and unknown test identifiers',()=>{
 assert.throws(()=>normalizeResult('unknown',{status:'pass'}),/UNKNOWN_AUTO_TEST/);
 assert.throws(()=>normalizeResult('perf30',{status:'success'}),/INVALID_TEST_STATUS/);
 assert.equal(normalizeResult('engine',{status:'fail',details:'x'.repeat(1000)}).details.length,240);
});
test('studio exposes live motion telemetry but does not activate in the room',()=>{
 assert.match(studio,/getActor:actorSnapshot/);
 assert.match(studio,/getMetrics:performanceSnapshot/);
 assert.match(studio,/p95Ms:p95/);
 assert.match(studio,/getWorldPosition|SkinnedMesh|animateSkinnedChibi/);
 assert.match(studio,/stop:\(\)=>/);
 assert.doesNotMatch(live,/characters\/v5/);
 assert.doesNotMatch(village,/characters\/v5/);
});
test('responsive test board measures actions, direction, seat transition, WebP and FPS locally',()=>{
 assert.match(html,/test-board-v520\.mjs/);
 assert.match(html,/id="studio"/);
 assert.match(html,/id="run"/);
 assert.match(html,/id="autoRows"/);
 assert.match(html,/id="manualRows"/);
 assert.match(html,/id="decision"/);
 assert.match(html,/CHƯA NGHIỆM THU/);
 for(const testId of AUTO_TESTS.map(t=>t.id))assert.ok(board.includes("'"+testId+"'"),testId);
 assert.match(board,/frame\.contentWindow/);
 assert.match(board,/classifyPerformance/);
 assert.match(board,/testSit/);
 assert.match(board,/testFallback/);
 assert.match(board,/navigator\.userAgent/);
 assert.match(board,/new Blob/);
 assert.doesNotMatch(board,/\/api\/rooms\/|\/api\/village\/move|\/api\/gm\//);
});
