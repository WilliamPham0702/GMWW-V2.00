// V5.20 on-device acceptance suite. Runs ONLY against the separate Studio iframe.
// No changes to production game/IPA, no writes to room data.
import {
 AUTO_TESTS,MANUAL_TESTS,TEST_BOARD_VERSION,PERFORMANCE_THRESHOLDS,
 normalizeResult,classifyPerformance,releaseReadiness
} from './test-gates-v520.mjs';
const $=id=>document.getElementById(id);
const frame=$('studio'),results={},manual={};
let running=false,api=null;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const names=Object.fromEntries(AUTO_TESTS.map(t=>[t.id,t]));
function setTest(id,status,details=''){
 results[id]=normalizeResult(id,{status,details});
 const row=document.querySelector('[data-test-id="'+id+'"]');
 if(row){
  row.dataset.status=status;
  row.querySelector('.test-result').textContent=status==='pass'?'ĐẠT':status==='fail'?'CHƯA ĐẠT':'CHƯA TEST';
  row.querySelector('.test-details').textContent=details||'—';
 }
 renderSummary();
}
function renderSummary(){
 const status=releaseReadiness(results,manual,false);
 const pass=AUTO_TESTS.filter(t=>results[t.id]?.status==='pass').length;
 const failures=status.failedTests.length;
 $('counter').textContent=pass+'/'+AUTO_TESTS.length+' bài tự động đạt';
 $('failed').textContent=failures?failures+' bài chưa đạt':'';
 $('review').textContent=MANUAL_TESTS.filter(t=>manual[t.id]).length+'/'+MANUAL_TESTS.length+' hạng mục trực quan đã xác nhận';
 const eligible=status.autoPassed&&status.manualPassed;
 $('decision').dataset.status=eligible?'pass':failures?'fail':'pending';
 $('decision').textContent=eligible?
 'ĐỦ ĐIỀU KIỆN GỬI CHỦ DỰ ÁN XÁC NHẬN — CHƯA TÍCH HỢP GAME':
 failures?'CHƯA ĐẠT — KHÔNG ĐƯA VÀO GAME':
 'CHƯA NGHIỆM THU — GAME CHÍNH KHÔNG THAY ĐỔI';
 $('download').disabled=!Object.keys(results).length&&!Object.values(manual).some(Boolean);
}
function addRows(){
 const body=$('autoRows'),man=$('manualRows');
 for(const test of AUTO_TESTS){
  const tr=document.createElement('tr');tr.dataset.testId=test.id;tr.dataset.status='pending';
  const tdTitle=document.createElement('td'),tdStatus=document.createElement('td'),tdDetail=document.createElement('td');
  const name=document.createElement('b');name.textContent=test.name;
  const cat=document.createElement('small');cat.textContent=test.group;
  tdTitle.append(name,cat);
  tdStatus.className='test-result';tdStatus.textContent='CHƯA TEST';
  tdDetail.className='test-details';tdDetail.textContent='—';
  tr.append(tdTitle,tdStatus,tdDetail);body.append(tr);
 }
 for(const test of MANUAL_TESTS){
  const label=document.createElement('label');label.className='checkrow';
  const input=document.createElement('input');input.type='checkbox';input.name=test.id;
  input.addEventListener('change',()=>{manual[test.id]=input.checked;renderSummary();});
  const span=document.createElement('span');span.textContent=test.name;
  label.append(input,span);man.append(label);
 }
 renderSummary();
}
function waitForEngine(timeoutMs=18000){
 return new Promise((resolve,reject)=>{
  const start=performance.now();
  function poll(){
   try{
    const w=frame.contentWindow;
    const target=w?.GMWW_MASTER_V500;
    if(target&&w.document.documentElement.dataset.gmwwV500==='ready')return resolve(target);
    if(w?.document.documentElement.dataset.gmwwV500==='error')
      return reject(new Error('WebGL không khả dụng; kiểm tra lỗi trên Studio'));
   }catch(err){return reject(new Error('Không truy cập được iframe Studio: '+err.message));}
   if(performance.now()-start>timeoutMs)return reject(new Error('WebGL tải quá lâu hoặc lỗi khởi tạo'));
   setTimeout(poll,120);
  }
  poll();
 });
}
const wrap=rad=>Math.atan2(Math.sin(rad),Math.cos(rad));
async function execute(id,fn){
 $('current').textContent='Đang kiểm tra: '+names[id].name;
 setTest(id,'pending','Đang đo trên thiết bị hiện tại…');
 try{
  const outcome=await fn();
  if(outcome&&outcome.status==='fail')setTest(id,'fail',outcome.details||'Không đạt tiêu chí');
  else setTest(id,'pass',outcome?.details||'Đạt trên thiết bị hiện tại');
 }catch(err){
  setTest(id,'fail',String(err?.message||err));
 }
 await sleep(90);
}
const assert=(condition,msg)=>{if(!condition)throw new Error(msg);};
async function testEngine(){
 const data=api.getActor(),p=api.getMetrics();
 assert(data?.meshIsSkinned&&data.skeletonBones===16,'Chưa có SkinnedMesh đủ 16 xương');
 assert(p.geometry.bones===16,'Sai dữ liệu skeleton');
 assert(p.actors===1,'Không khởi tạo được 1 nhân vật');
 assert(p.frames>0,'Trình dựng 3D không chạy rAF');
 return {details:'WebGL hoạt động · 16 bone · 1 SkinnedMesh'};
}
async function testActions(){
 const actions=api.actions;
 assert(actions.length===9,'Chưa đủ 9 Action');
 for(const action of actions){
  api.reset();await sleep(70);
  api.setAction(action);await sleep(action==='sit-down'?710:260);
  const data=api.getActor();
  const accepted=action==='sit-down'?data.action==='sit':data.action===action;
  assert(accepted,'Action '+action+' không chuyển đúng trạng thái ('+data.action+')');
  assert(data.bones.length===16,'Action '+action+' làm mất xương');
  assert(data.bones.every(b=>[b.x,b.y,b.z].every(Number.isFinite)),'Tư thế '+action+' chứa giá trị lỗi');
  if(action==='wave')assert(Math.abs(data.bones[7].x)>.3,'Tay phải không vẫy');
  if(action==='vote')assert(Math.abs(data.bones[7].x)>1,'Không giơ tay biểu quyết');
  if(action==='walk')assert(Math.abs(data.bones[10].x-data.bones[13].x)>.02,'Hai chân không luân phiên');
 }
 api.reset();
 return {details:'9/9 Action hoạt động và cập nhật trực tiếp bone'};
}
async function testDirections(){
 const dirs=api.facings;
 assert(dirs.length===8,'Thiếu 8 hướng');
 const increments=Math.PI/4;
 for(let i=0;i<dirs.length;i++){
  api.reset();
  api.setFacing(dirs[i]);
  await sleep(470);
  const d=api.getActor();
  const desired=Math.atan2(Math.sin(i*increments),Math.cos(i*increments));
  assert(Math.abs(wrap(d.yaw-desired))<.16,'Sai hướng '+dirs[i]+' ('+d.yaw.toFixed(2)+' rad)');
 }
 api.reset();
 return {details:'8/8 hướng quay bằng bone model thật'};
}
async function testTravel(){
 api.reset();await sleep(120);
 const a=api.getActor();
 api.walkTo(a.x+1,a.z,false);
 await sleep(1500);
 const b=api.getActor();
 assert(b.x-a.x>.85,'Nhân vật không đi tới mục tiêu');
 assert(b.goal===null,'Nhân vật không dừng khi đến đích');
 assert(Math.abs(b.x-(a.x+1))<.06,'Dừng không đúng tọa độ');
 return {details:'Bước đi đủ 1 đơn vị, dừng đúng tọa độ'};
}
async function testSit(){
 api.reset();await sleep(100);
 api.setAction('sit-down');await sleep(800);
 const seated=api.getActor();
 assert(seated.action==='sit'&&seated.seated,'Không chuyển được đứng → ngồi');
 api.walkTo(seated.x+1,seated.z,false);
 await sleep(100);
 const transition=api.getActor();
 assert(transition.action==='stand-up','Đi từ tư thế ngồi không chuyển đứng dậy trước');
 await sleep(1650);
 const done=api.getActor();
 assert(done.x-seated.x>.85,'Ngồi → đứng → đi không tới đích');
 assert(done.goal===null,'Ngồi → đứng → đi không dừng');
 api.reset();
 return {details:'Ngồi, đứng dậy, bước đi và dừng đúng'};
}
async function testFallback(){
 const response=await fetch('/api/game-characters/character-01/frame/1',{cache:'no-store'});
 assert(response.ok,'Ảnh WebP dự phòng HTTP '+response.status);
 const bytes=new Uint8Array(await response.arrayBuffer());
 const riff=String.fromCharCode(...bytes.slice(0,4));
 const webp=String.fromCharCode(...bytes.slice(8,12));
 assert(bytes.length>1000&&riff==='RIFF'&&webp==='WEBP','Ảnh dự phòng sai định dạng');
 return {details:'WebP dự phòng '+Math.round(bytes.length/1024)+' KB · HTTP '+response.status};
}
async function testPerformance(id){
 const expected=Number(id.replace('perf',''));
 api.reset();api.setCount(expected);await sleep(1200);
 const fpsSamples=[];
 const initial=api.getMetrics(),previousFrames=initial.frames;
 const checkpoints=6;
 for(let i=0;i<checkpoints;i++){
  await sleep(550);
  fpsSamples.push(api.getMetrics().fps);
 }
 const final=api.getMetrics(),frameGain=final.frames-previousFrames;
 assert(frameGain>12,'Không vẽ được đủ khung hình');
 const result=classifyPerformance(id,{fpsSamples,p95Ms:final.p95Ms,actors:final.actors});
 return {status:result.status,details:result.details+' · '+final.drawCalls+' draw calls'};
}
async function run(){
 if(running)return;
 running=true;$('run').disabled=true;
 $('download').disabled=true;
 $('current').textContent='Đang khởi tạo kiểm thử thực tế…';
 for(const t of AUTO_TESTS)setTest(t.id,'pending','Chưa thực hiện trong đợt đo này');
 try{
  api=await waitForEngine();
  api.stop();api.setCount(1);await sleep(450);
  await execute('engine',testEngine);
  if(results.engine.status==='fail')throw new Error('WebGL không khởi tạo đúng; dừng bài test tiếp theo');
  await execute('actions',testActions);
  await execute('directions',testDirections);
  await execute('travel',testTravel);
  await execute('sit',testSit);
  await execute('fallback',testFallback);
  for(const id of ['perf1','perf10','perf20','perf30'])await execute(id,()=>testPerformance(id));
  $('current').textContent='Đã chạy xong · xem kết quả và xác nhận trực quan';
 }catch(err){
  $('current').textContent='Kiểm thử dừng: '+String(err?.message||err);
  if(!results.engine||results.engine.status==='pending')setTest('engine','fail',String(err?.message||err));
 }finally{
  try{api?.setCount(1);api?.reset();}catch{}
  running=false;$('run').disabled=false;
  renderSummary();
 }
}
function downloadReport(){
 const ua=navigator.userAgent;
 const obj={
  version:TEST_BOARD_VERSION,createdAt:new Date().toISOString(),
  device:{userAgent:ua,viewport:[innerWidth,innerHeight],pixelRatio:devicePixelRatio},
  source:'/characters/v5/',automatic:AUTO_TESTS.map(t=>results[t.id]||{id:t.id,status:'pending'}),
  visual:MANUAL_TESTS.map(t=>({id:t.id,checked:manual[t.id]===true})),
  metrics:api?.getMetrics()||null,
  approval:releaseReadiness(results,manual,false),
  notice:'Bài đo trên thiết bị, KHÔNG tự bật nhân vật vào Player Web/IPA. Chỉ chủ dự án xác nhận nghiệm thu.'
 };
 const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob);
 const link=document.createElement('a');link.href=url;link.download='gmww-character-v520-test-report.json';
 document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
$('run').addEventListener('click',run);
$('download').addEventListener('click',downloadReport);
$('studioOpen').addEventListener('click',()=>window.open('/characters/v5/','_blank','noopener'));
addRows();
frame.addEventListener('load',()=>{$('current').textContent='Studio đã mở · nhấn CHẠY TOÀN BỘ TEST';});
