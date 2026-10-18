export const PROD_WORKER="gmww-v2-00";
export const GRACE_MS=24*60*60*1000;
export const RETAIN=new Set(["keep-preview","retain-preview"]);

export function classifyPreview(p,prs,openPrs,namespaces,productionIds,now=Date.now()){
  if(!p||!p.id||!p.slug||!p.name)return{reason:"INVALID_PREVIEW"};
  const matches=prs.filter(x=>x.head?.ref===p.name&&x.head?.repo?.full_name==="WilliamPham0702/GMWW-V2.00"&&x.base?.ref==="main");
  if(matches.length!==1)return{reason:"PR_NOT_UNIQUE_OR_UNLINKED"};
  const pr=matches[0];
  if(pr.state!=="closed"||openPrs.some(x=>x.head?.ref===p.name))return{reason:"PR_OPEN"};
  if(pr.labels?.some(x=>RETAIN.has(String(x.name||"").toLowerCase())))return{reason:"RETAIN_LABEL"};
  const closed=Date.parse(pr.closed_at||"");
  if(!Number.isFinite(closed)||now-closed<GRACE_MS)return{reason:"COOLDOWN"};
  const deployed=Date.parse(p.deployed_on||p.updated_on||p.created_on||"");
  if(!Number.isFinite(deployed)||deployed>closed)return{reason:"PREVIEW_CHANGED_AFTER_CLOSE"};
  const wanted=PROD_WORKER+"_"+p.slug+"_RoomDurableObject";
  const list=namespaces.filter(x=>x.name===wanted&&x.script===PROD_WORKER);
  if(list.length!==1||!list[0].id)return{reason:"NAMESPACE_NOT_UNIQUE"};
  if(!(productionIds instanceof Set)||!productionIds.size||productionIds.has(list[0].id))return{reason:"PRODUCTION_PROTECTED"};
  return{reason:"CANDIDATE",previewId:p.id,preview:p.name,namespaceId:list[0].id,pr:pr.number};
}

export function emptyStorage(response){
  return response?.success===true&&Array.isArray(response.result)&&
    response.result.length===0&&!response.result_info?.cursor&&
    response.result_info?.count===0;
}
