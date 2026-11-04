/* WOLF-01 — private night recognition. Never publish these rows in public room/WS DTOs. */
const login=value=>String(value||'').trim().toLowerCase().replace(/^member:/,'');
const folded=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
const wolfFaction=value=>{const f=folded(value);return f==='wolf'||f==='wolves'||f.includes('phe soi')||f==='soi'};
export function wolfPackMembers(assignments=[],interactions=[],matchId=''){
  const match=String(matchId||''),blocked=new Set((Array.isArray(interactions)?interactions:[]).filter(r=>
    r?.effectActive!==false&&['dead','expelled'].includes(String(r?.type||''))&&
    (!r?.matchId||String(r.matchId)===match)).map(r=>login(r.loginId)));
  const roster=new Map();
  for(const row of Array.isArray(assignments)?assignments:[]){
    const id=login(row?.loginId);
    if(!id||blocked.has(id))continue;
    const faction=row?.faction??row?.factionId??row?.roleCard?.factionId;
    const originallyWolf=row?.roleId!=='role_human_wolf'&&(wolfFaction(row?.roleCard?.factionId)||/^(?:role_.*wolf.*|wolf|regular-wolf|alpha-wolf)$/.test(String(row?.roleId||'')));
    if(faction?!wolfFaction(faction):!originallyWolf)continue;
    // Original role identity survives a faction conversion; only the viewer's
    // private pack roster may see it, and only while the recognition turn is active.
    roster.set(id,{loginId:id,roleName:String(row?.roleName||row?.roleCard?.name||'Vai Trò').slice(0,80),
      converted:!originallyWolf&&wolfFaction(faction)});
  }
  return [...roster.values()].sort((a,b)=>a.loginId.localeCompare(b.loginId));
}
export function shouldWakeWolfPack(night,members=[],previousIds=[]){
  const n=Math.max(1,Number(night)||1),ids=new Set(members.map(row=>login(row?.loginId)).filter(Boolean));
  return ids.size>=2&&(n===1||[...ids].some(id=>!previousIds.includes(id)));
}
export function privateWolfRecognition(meta,runtime,viewerId,members,now=Date.now()){
  if(String(meta?.phase||'')!=='running'||String(meta?.cyclePhase||'')!=='night'||
    !runtime||runtime.completed||Number(runtime.night)!==Number(meta.cycleNight))return null;
  const step=runtime.queue?.[runtime.cursor];
  if(step?.kind!=='wolf-introduction')return null;
  const deadline=Date.parse(runtime.deadlineAt||'');
  if(Number.isFinite(deadline)&&deadline<=now)return null;
  const owner=login(viewerId),roster=(Array.isArray(members)?members:[]).filter(x=>!Array.isArray(step.recognitionIds)||step.recognitionIds.includes(x.loginId));
  if(!owner||roster.length<2||!roster.some(x=>x.loginId===owner))return null;
  return {matchId:String(meta.matchId||''),night:Number(meta.cycleNight),turnId:String(step.id||'wolf-introduction'),
    deadlineAt:Number.isFinite(deadline)?new Date(deadline).toISOString():null,
    labels:roster.map(x=>({loginId:x.loginId,roleName:x.roleName,converted:x.converted}))};
}

/* Only peers in the same current role-group subgroup are visible. This is a
 * private /me-only projection, not a public room or broadcast field. */
export function privateRoleGroupRecognition(meta,runtime,viewerId,assignments=[],rows=[],now=Date.now()){
  if(String(meta?.phase||'')!=='running'||String(meta?.cyclePhase||'')!=='night'||
    !runtime||runtime.completed||Number(runtime.night)!==Number(meta.cycleNight))return null;
  const step=runtime.queue?.[runtime.cursor];
  if(!step||!['role','role-group'].includes(step.kind))return null;
  const deadline=Date.parse(runtime.deadlineAt||'');
  if(Number.isFinite(deadline)&&deadline<=now)return null;
  const owner=login(viewerId),groups=step.kind==='role-group'?step.roles||[]:[step];
  const activeGroups=groups.filter(group=>(group.loginIds||[]).map(login).includes(owner));
  if(activeGroups.length!==1)return null;
  const group=activeGroups[0],ids=new Set((group.loginIds||[]).map(login));
  if(ids.size<2||!String(group.roleId||''))return null;
  const match=String(meta.matchId||''),blocked=new Set((Array.isArray(rows)?rows:[]).filter(r=>
    r?.effectActive!==false&&['dead','expelled'].includes(String(r?.type||''))&&
    (!r?.matchId||String(r.matchId)===match)&&(!r?.expiresAt||Date.parse(r.expiresAt)>now)
  ).map(r=>login(r.loginId)));
  const labels=new Map();
  for(const row of Array.isArray(assignments)?assignments:[]){
    const id=login(row?.loginId);
    if(!id||!ids.has(id)||blocked.has(id)||String(row?.roleId||'')!==String(group.roleId)||
      (row?.matchId&&String(row.matchId)!==match))continue;
    labels.set(id,{loginId:id,roleName:String(row.roleName||row?.roleCard?.name||'Vai Trò').slice(0,80),converted:false});
  }
  if(labels.size<2||!labels.has(owner))return null;
  return {matchId:match,night:Number(meta.cycleNight),turnId:String(step.id||''),
    deadlineAt:Number.isFinite(deadline)?new Date(deadline).toISOString():null,
    labels:[...labels.values()]};
}
