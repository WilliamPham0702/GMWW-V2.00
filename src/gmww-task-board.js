// Public GitHub Issues are the source of truth for GMWW tracked work.
export const GMWW_TASK_SOURCE="https://api.github.com/repos/WilliamPham0702/GMWW-V2.00/issues?state=all&per_page=100";
const urgency=title=>{const m=String(title||"").match(/\bP([012])\b/i);return m?Number(m[1]):3};
const summary=text=>String(text||"").split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith("#")&&!s.startsWith("- [")&&!s.startsWith(String.fromCharCode(96))&&s.length>19).map(s=>s.replace(/^[-*]\s+/,"").replace(/[_*]/g,"").slice(0,180))[0]||"Yêu cầu được ghi nhận và đang được theo dõi.";
export function normalizeGmwwTasks(rows){
  if(!Array.isArray(rows))throw new Error("TASK_SOURCE_INVALID");
  const tasks=rows.filter(item=>item&&!item.pull_request&&Number.isInteger(item.number)&&item.number>0)
    .map(item=>{
      const labels=Array.isArray(item.labels)?item.labels.map(x=>String(x?.name||"").toLowerCase()):[],
        active=labels.some(x=>/in.progress|doing|wip|đang.thực.hiện|đang.xử.lý/.test(x))||/đang\s+thực\s+hiện/i.test(String(item.title||"")),
        done=item.state==="closed",
        state=done?(item.state_reason==="completed"?"completed":"closed"):(active?"doing":"pending"),
        priority=urgency(item.title);
      return {
        number:item.number,title:String(item.title||"Công việc GMWW").slice(0,140),
        summary:summary(item.body),state,priority:priority===3?null:"P"+priority,
        updatedAt:String(item.updated_at||""),
        url:"https://github.com/WilliamPham0702/GMWW-V2.00/issues/"+item.number
      };
    });
  const open=tasks.filter(x=>x.state==="doing"||x.state==="pending")
    .sort((a,b)=>(a.state==="doing"?0:1)-(b.state==="doing"?0:1)
      ||(a.priority?Number(a.priority.slice(1)):3)-(b.priority?Number(b.priority.slice(1)):3)
      ||b.number-a.number);
  const history=tasks.filter(x=>x.state!=="doing"&&x.state!=="pending").sort((a,b)=>b.number-a.number).slice(0,30);
  return {open,history,totals:{open:open.length,doing:open.filter(x=>x.state==="doing").length,
    pending:open.filter(x=>x.state==="pending").length,history:history.length}};
}
export async function fetchGmwwTasks(fetchFn=fetch){
  const response=await fetchFn(GMWW_TASK_SOURCE,{
    method:"GET",headers:{"accept":"application/vnd.github+json","user-agent":"GMWW-Workboard"},
    cf:{cacheEverything:true,cacheTtl:120}
  });
  if(!response.ok)throw new Error("TASK_SOURCE_HTTP_"+response.status);
  return normalizeGmwwTasks(await response.json());
}
