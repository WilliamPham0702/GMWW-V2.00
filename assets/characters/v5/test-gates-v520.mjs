// Character V5.20 acceptance gates: human-confirmed release only.
// This pure module can be tested under Node and in iPhone Safari without DOM.
export const TEST_BOARD_VERSION='5.20-acceptance-board';
export const AUTO_TESTS=Object.freeze([
 {id:'engine',name:'WebGL + 16 xương thật',required:true,group:'Kỹ thuật'},
 {id:'actions',name:'9 Action: đứng/đi/chạy/ngồi/đứng dậy/tương tác',required:true,group:'Chuyển động'},
 {id:'directions',name:'8 hướng nhìn, không trượt ngang',required:true,group:'Chuyển động'},
 {id:'travel',name:'Đi/chạy tới đích và dừng đúng tọa độ',required:true,group:'Chuyển động'},
 {id:'sit',name:'Ngồi → đứng → đi, không giật tư thế',required:true,group:'Chuyển động'},
 {id:'fallback',name:'Ảnh WebP cũ vẫn tải được',required:true,group:'An toàn'},
 {id:'perf1',name:'Hiệu năng thực tế: 1 nhân vật',required:true,group:'Hiệu năng'},
 {id:'perf10',name:'Hiệu năng thực tế: 10 nhân vật',required:true,group:'Hiệu năng'},
 {id:'perf20',name:'Hiệu năng thực tế: 20 nhân vật',required:true,group:'Hiệu năng'},
 {id:'perf30',name:'Hiệu năng thực tế: 30 nhân vật',required:true,group:'Hiệu năng'}
]);
export const MANUAL_TESTS=Object.freeze([
 {id:'visual',name:'Ngoại hình Chàng Biển hiển thị đẹp, không vỡ hoặc lỗi khớp'},
 {id:'foot',name:'Chân bám đất, tay chân chuyển nhịp tự nhiên, không đi ngang kiểu cua'},
 {id:'sitVisual',name:'Tư thế ngồi/đứng đẹp và không cắt cơ thể khi nhìn trên iPhone'},
 {id:'touch',name:'Chạm chọn vị trí, điều khiển và xoay máy ổn định trên iPhone'},
 {id:'noRegression',name:'Không ảnh hưởng dữ liệu phòng, vai trò, Artifact và Làng hiện tại'}
]);
export const PERFORMANCE_THRESHOLDS=Object.freeze({
 perf1:{minFps:45,maxP95Ms:40},
 perf10:{minFps:35,maxP95Ms:48},
 perf20:{minFps:30,maxP95Ms:55},
 perf30:{minFps:30,maxP95Ms:55}
});
export function normalizeResult(id,result){
 if(!AUTO_TESTS.some(t=>t.id===id))throw new Error('UNKNOWN_AUTO_TEST');
 const status=result?.status;
 if(!['pass','fail','pending'].includes(status))throw new Error('INVALID_TEST_STATUS');
 return {id,status,details:String(result.details||'').slice(0,240)};
}
export function median(values){
 if(!Array.isArray(values)||!values.length)return 0;
 const ordered=values.filter(Number.isFinite).slice().sort((a,b)=>a-b);
 if(!ordered.length)return 0;
 const i=Math.floor(ordered.length/2);
 return ordered.length%2?ordered[i]:(ordered[i-1]+ordered[i])/2;
}
export function classifyPerformance(testId,metrics){
 const threshold=PERFORMANCE_THRESHOLDS[testId];
 if(!threshold)throw new Error('UNKNOWN_PERFORMANCE_TEST');
 const fps=median(metrics?.fpsSamples||[]);
 const p95=Number(metrics?.p95Ms);
 const actors=Number(metrics?.actors);
 const expected=Number(testId.replace('perf',''));
 if(!Number.isFinite(p95)||p95<=0||fps<=0||actors!==expected)
   return {status:'fail',fps:Math.round(fps),p95Ms:Math.round(p95||0),details:'Thiếu phép đo thực tế hoặc số nhân vật không khớp'};
 const passed=fps>=threshold.minFps&&p95<=threshold.maxP95Ms;
 return {status:passed?'pass':'fail',fps:Math.round(fps),p95Ms:Math.round(p95),details:
  Math.round(fps)+' FPS trung vị, P95 '+Math.round(p95)+' ms / chuẩn ≥'+threshold.minFps+' FPS, P95 ≤'+threshold.maxP95Ms+' ms'};
}
export function releaseReadiness(autoResults={},manualResults={},ownerApproved=false){
 const autoPassed=AUTO_TESTS.every(t=>autoResults[t.id]?.status==='pass');
 const manualPassed=MANUAL_TESTS.every(t=>manualResults[t.id]===true);
 const failIds=AUTO_TESTS.filter(t=>autoResults[t.id]?.status==='fail').map(t=>t.id);
 const pendingIds=AUTO_TESTS.filter(t=>autoResults[t.id]?.status!=='pass'&&autoResults[t.id]?.status!=='fail').map(t=>t.id);
 return {autoPassed,manualPassed,ownerApproved:ownerApproved===true,
  readyForLive:autoPassed&&manualPassed&&ownerApproved===true,
  failedTests:failIds,pendingTests:pendingIds,
  status:failIds.length?'fail':(!autoPassed||!manualPassed||!ownerApproved?'pending':'pass')};
}
