import test from "node:test";
import assert from "node:assert/strict";
import {normalizeGmwwTasks,fetchGmwwTasks,GMWW_TASK_SOURCE} from "../src/gmww-task-board.js";
const rows=[
  {number:50,title:"P0 Chuyển đổi xác thực",state:"open",labels:[],body:"## Lý do\n- Cần xác thực an toàn và bảo vệ phiên người chơi."},
  {number:51,title:"P1 Tích hợp Health Center",state:"open",labels:[{name:"in-progress"}],body:"## Mục tiêu\n- Đang kiểm tra chức năng trong Cài Đặt."},
  {number:52,title:"P2 Tối ưu artwork",state:"open",labels:[],body:"## Công việc\n- Cần đo hiệu suất tải nhân vật."},
  {number:53,title:"Chức năng hoàn tất",state:"closed",state_reason:"completed",labels:[]},
  {number:54,title:"Đề xuất không thực hiện",state:"closed",state_reason:"not_planned",labels:[]},
  {number:99,title:"PR liên quan",state:"open",pull_request:{url:"https://github.com"},labels:[]}
];
test("Workboard sorts unfinished work and separates accurate history",()=>{
  const d=normalizeGmwwTasks(rows);
  assert.deepEqual(d.open.map(x=>x.number),[51,50,52]);
  assert.equal(d.open[0].state,"doing");
  assert.equal(d.open[1].priority,"P0");
  assert.deepEqual(d.history.map(x=>x.number),[54,53]);
  assert.equal(d.history[0].state,"closed");
  assert.equal(d.history[1].state,"completed");
  assert.equal(d.totals.open,3);
});
test("Workboard fetches public issues read-only without credentials",async()=>{
  let calls=0;
  const mock=async(url,opts)=>{
    calls++;assert.equal(url,GMWW_TASK_SOURCE);assert.equal(opts.method,"GET");
    assert.ok(!("authorization" in opts.headers));
    return new Response(JSON.stringify(rows),{headers:{"content-type":"application/json"}});
  };
  const result=await fetchGmwwTasks(mock);
  assert.equal(result.open.length,3);assert.equal(calls,1);
});
test("Unplanned closed work is not misrepresented as completed",()=>{
  const d=normalizeGmwwTasks(rows);
  assert.equal(d.history.find(x=>x.number===54).state,"closed");
  assert.equal(d.history.find(x=>x.number===53).state,"completed");
});
test("Source errors are explicit instead of fabricated progress",async()=>{
  await assert.rejects(fetchGmwwTasks(async()=>new Response("Unavailable",{status:503})),/TASK_SOURCE_HTTP_503/);
  assert.throws(()=>normalizeGmwwTasks({}),/TASK_SOURCE_INVALID/);
});

test("Worker exposes tracked requests on a read-only public GET endpoint",async()=>{
  const {readFileSync}=await import("node:fs");
  const worker=readFileSync(new URL("../src/index.js",import.meta.url),"utf8");
  const app=readFileSync(new URL("../server-game/current/app.js",import.meta.url),"utf8");
  assert.match(worker,/url\.pathname==="\/api\/operations\/tasks"&&request\.method==="GET"/);
  assert.match(worker,/await fetchGmwwTasks\(\)/);
  assert.match(app,/gmwwTasksRefresh/);
  assert.match(app,/gmwwTasksOpenList/);
  assert.match(app,/gmwwTasksDoneList/);
});
test("An explicit in-progress title reflects tracked ongoing work without requiring labels",()=>{
  const x=normalizeGmwwTasks([{number:61,title:"P1 — Đang thực hiện: nhân vật ngồi xếp bằng",state:"open",labels:[]}]);
  assert.equal(x.open[0].state,"doing");
});

test("Workboard includes every GitHub Issues page, excluding PRs",async()=>{
  const page2=GMWW_TASK_SOURCE+"&page=2";
  const seen=[];
  const get=async(url)=>{
    seen.push(url);
    if(url===GMWW_TASK_SOURCE){
      return new Response(JSON.stringify([
        {number:64,title:"P0 Đang thực hiện kiểm kê",state:"open",labels:[]},
        {number:63,title:"PR V3.26",state:"closed",pull_request:{url:"https://api.github.com/pr/63"}}
      ]),{headers:{link:'<'+page2+'>; rel="next", <'+page2+'>; rel="last"'}});
    }
    if(url===page2)return new Response(JSON.stringify([
      {number:62,title:"Đã hoàn thành giao diện V3.26",state:"closed",state_reason:"completed",labels:[]},
      {number:50,title:"P0 Bảo mật",state:"open",labels:[]}
    ]));
    throw new Error("Unexpected page "+url);
  };
  const data=await fetchGmwwTasks(get);
  assert.deepEqual(seen,[GMWW_TASK_SOURCE,page2]);
  assert.deepEqual(data.open.map(x=>x.number),[64,50]);
  assert.deepEqual(data.history.map(x=>x.number),[62]);
  assert.equal(data.totals.open,2);
  assert.equal(data.totals.history,1);
});
test("Workboard never truncates completed history",()=>{
  const data=normalizeGmwwTasks(Array.from({length:45},(_,i)=>({number:i+1,title:"Hoàn thành "+i,state:"closed",state_reason:"completed"})));
  assert.equal(data.history.length,45);
});
test("Workboard rejects unsafe pagination links",async()=>{
  const fake=async()=>new Response("[]",{headers:{link:'<https://evil.example/issues?page=2>; rel="next"'}});
  await assert.rejects(fetchGmwwTasks(fake),/TASK_SOURCE_PAGE_INVALID/);
});
