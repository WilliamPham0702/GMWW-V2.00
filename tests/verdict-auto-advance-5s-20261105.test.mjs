import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const gm=fs.readFileSync(new URL('../server-game/src/40-battle-and-timeline.part',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../server-game/current/GMWW.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../server-game/current/app.js',import.meta.url),'utf8');
const player=fs.readFileSync(new URL('../src/player-web-src/30-rooms-and-realtime.part',import.meta.url),'utf8');

test('GM: không bấm thì sau 5 giây tự xác nhận phán quyết và qua bước kế',()=>{
 assert.match(gm,/battleVerdictTimer=setTimeout\(\(\)=>battleGallowsAcceptVerdict\(key\),Math\.max\(0,5000-elapsed\)\)/);
 assert.doesNotMatch(gm,/Math\.max\(0,30000-elapsed\)/);
 const fn=gm.slice(gm.indexOf('async function battleGallowsAcceptVerdict'),gm.indexOf('function battleRenderGallowsVerdict'));
 assert.match(fn,/command:'acknowledge'/,'Server xác nhận trước');
 assert.match(fn,/else void advancePlayPhase\(\)/,'rồi sang bước kế như bấm TIẾP TỤC');
 assert.ok(app.includes('Math.max(0,5000-elapsed)'),'app.js đóng gói khớp nguồn');
 assert.match(html,/tự qua bước sau 5 giây/);
 assert.doesNotMatch(html,/tự đóng sau 30 giây/);
});

test('Player Web: hộp phán quyết hiện đủ 5 giây rồi tự ẩn',()=>{
 const a=player.indexOf('function renderPublicGallowsVerdict(){'),b=player.indexOf('function syncGallowsVoteTags');
 assert.ok(a>=0&&b>a);
 const src=player.slice(a,b);
 assert.match(src,/Tự đóng sau 5 giây/);
 const run=(elapsedMs)=>{
  const panel={hidden:false,dataset:{},setAttribute(){},innerHTML:'',querySelector:()=>({textContent:''})};
  const now=1_000_000;
  const ctx={Date:{now:()=>now},Number,String,Array,
   state:{roomCode:'R1',serverClockOffsetMs:0,room:{cyclePhase:'morning'},players:[],gallows:{stage:'resolved',outcome:'dead',candidateId:'a',resolvedAt:now-elapsedMs,voteTotals:{}}},
   document:{getElementById:id=>id==='gmwwGallowsPublicVerdict'?panel:null,createElement:()=>({}),head:{append(){}},body:{append(){}}}};
  vm.runInNewContext(src+';renderPublicGallowsVerdict()',ctx);
  return panel.hidden;
 };
 assert.equal(run(1000),false,'1 giây: còn hiện');
 assert.equal(run(4900),false,'4,9 giây: còn hiện');
 assert.equal(run(5100),true,'sau 5 giây: ẩn');
 assert.equal(run(20000),true,'không còn hiện tới 30 giây');
});
