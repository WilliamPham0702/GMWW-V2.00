// Public GitHub Issues are the source of truth for GMWW tracked work.
export const GMWW_TASK_SOURCE="https://api.github.com/repos/WilliamPham0702/GMWW-V2.00/issues?state=all&per_page=100";
const urgency=title=>{const m=String(title||"").match(/\bP([012])\b/i);return m?Number(m[1]):3};
const VIETNAMESE_ISSUE_SUMMARIES={
  50:"Kiểm tra cơ chế đăng nhập và quyền GM; cần loại bỏ đăng nhập thành viên thiếu mật khẩu, đồng thời bảo vệ thông tin xác thực của quản trị viên.",
  51:"Hoàn thiện trung tâm vận hành trong Cài Đặt: theo dõi sức khỏe hệ thống, hiển thị cảnh báo và hướng dẫn xử lý sự cố.",
  52:"Kiểm tra dung lượng ảnh, tốc độ tải nhân vật chuyển động và hiệu quả lưu bộ nhớ đệm; tối ưu mà không ảnh hưởng hình ảnh đang dùng."
};
const summary=(body,number,title)=>{
  if(VIETNAMESE_ISSUE_SUMMARIES[number])return VIETNAMESE_ISSUE_SUMMARIES[number];
  const lines=String(body||"").split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith("#")&&!s.startsWith("- [")&&!s.startsWith(String.fromCharCode(96))&&s.length>19)
    .map(s=>s.replace(/^[-*]\s+/,"").replace(/[_*]/g,"").slice(0,180));
  const first=lines[0]||"";
  const englishClues=(first.match(/\b(?:the|and|with|current|remaining|required|requirements|work|performance|issue|should|must|existing|deployments?|authentication)\b/gi)||[]).length;
  if(englishClues>=2){
    const viTitle=String(title||"").replace(/^P[012]\s*[—:-]?\s*/i,"").trim();
    return /[à-ỹđ]/i.test(viTitle)?"Nội dung cần kiểm tra và thực hiện: "+viTitle.slice(0,145)+".":"Công việc cần được đối chiếu với yêu cầu gốc trước khi nghiệm thu.";
  }
  return first||"Yêu cầu được ghi nhận và đang được theo dõi.";
};
export function normalizeGmwwTasks(rows){
  if(!Array.isArray(rows))throw new Error("TASK_SOURCE_INVALID");
  const tasks=rows.filter(item=>item&&!item.pull_request&&Number.isInteger(item.number)&&item.number>0)
    .map(item=>{
      const labels=Array.isArray(item.labels)?item.labels.map(x=>String(x?.name||"").toLowerCase()):[],
        active=labels.some(x=>/in.progress|doing|wip|đang.thực.hiện|đang.xử.lý/.test(x))||/đang\s+thực\s+hiện/i.test(String(item.title||"")),
        done=item.state==="closed",
        state=done?(item.state_reason==="completed"?"completed":item.state_reason==="not_planned"?"skipped":"closed"):(active?"doing":"pending"),
        priority=urgency(item.title);
      return {
        number:item.number,title:String(item.title||"Công việc GMWW").slice(0,140),
        summary:summary(item.body,item.number,item.title),state,priority:priority===3?null:"P"+priority,
        updatedAt:String(item.updated_at||""),
        url:"https://github.com/WilliamPham0702/GMWW-V2.00/issues/"+item.number
      };
    });
  const open=tasks.filter(x=>x.state==="doing"||x.state==="pending")
    .sort((a,b)=>(a.state==="doing"?0:1)-(b.state==="doing"?0:1)
      ||(a.priority?Number(a.priority.slice(1)):3)-(b.priority?Number(b.priority.slice(1)):3)
      ||b.number-a.number);
  const history=tasks.filter(x=>x.state!=="doing"&&x.state!=="pending").sort((a,b)=>b.number-a.number);
  return {open,history,totals:{open:open.length,doing:open.filter(x=>x.state==="doing").length,
    pending:open.filter(x=>x.state==="pending").length,history:history.length}};
}
// GitHub Issues includes pull requests in the same paginated feed.
// Read every page so both unfinished requests and completed history remain visible.
const GMWW_TASK_MAX_PAGES=50;
export async function fetchGmwwTasks(fetchFn=fetch){
  const seen=new Set(),rows=[];
  let nextUrl=GMWW_TASK_SOURCE;
  while(nextUrl){
    if(seen.has(nextUrl))throw new Error("TASK_SOURCE_PAGE_LOOP");
    if(seen.size>=GMWW_TASK_MAX_PAGES)throw new Error("TASK_SOURCE_PAGE_LIMIT");
    // Follow only GitHub issue listing links for our public repository.
    if(!nextUrl.startsWith("https://api.github.com/repos/WilliamPham0702/GMWW-V2.00/issues?"))
      throw new Error("TASK_SOURCE_PAGE_INVALID");
    seen.add(nextUrl);
    const response=await fetchFn(nextUrl,{
      method:"GET",headers:{"accept":"application/vnd.github+json","user-agent":"GMWW-Workboard"},
      cf:{cacheEverything:true,cacheTtl:120}
    });
    if(!response.ok)throw new Error("TASK_SOURCE_HTTP_"+response.status);
    const page=await response.json();
    if(!Array.isArray(page))throw new Error("TASK_SOURCE_INVALID");
    rows.push(...page);
    const link=response.headers?.get("link")||"";
    const found=link.match(/<([^>]+)>;\s*rel="next"/i);
    nextUrl=found?found[1]:null;
  }
  return normalizeGmwwTasks(rows);
}
