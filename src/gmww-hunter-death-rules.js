// Thợ Săn: a confirmed hunt is a DEFERRED choice; it kills the chosen
// player only when the hunter actually dies, never at selection time.
// Pure rule used by Server, DEMO and regression tests.
const clean=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/đ/gi,'d').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const id=value=>String(value??'').trim().replace(/^member:/,'');
export const isHunterRole=assignment=>{
  const role=clean(assignment?.roleId||''),name=clean(assignment?.roleName||assignment?.roleCard?.name||'');
  return ['role hunter','role huntsman','hunter','huntsman'].includes(role)||
    name==='tho san'||name.startsWith('tho san ');
};
export function hunterLinkedDeaths({assignments=[],interactions=[],matchId='',night=Infinity}={}){
  const rows=Array.isArray(interactions)?interactions:[],match=String(matchId||'');
  if(!match)return [];
  const matches=r=>r&&String(r.matchId||'')===match;
  const hunters=new Set((Array.isArray(assignments)?assignments:[])
    .filter(isHunterRole).map(x=>id(x.loginId)).filter(Boolean));
  const result=[];
  for(const hunter of hunters){
    const deaths=rows.filter(r=>matches(r)&&r.type==='dead'&&r.effectActive!==false&&
      id(r.loginId)===hunter&&Number(r.night||0)<=night);
    if(!deaths.length)continue;
    const marks=rows.filter(r=>matches(r)&&id(r.actorId)===hunter&&id(r.loginId)!==hunter&&
      id(r.loginId)&&r.artifactId!=='__irrelevant__'&&!r.artifactId&&
      r.type!=='dead'&&r.noEffect!==true&&r.status!=='skipped'&&
      String(r.actionId||r.effectId||r.effectName||'').trim()&&
      Number(r.night||0)>0&&Number(r.night||0)<=night);
    if(!marks.length)continue;
    marks.sort((a,b)=>Number(a.night||0)-Number(b.night||0)||
      String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
    // Latest hunter choice is binding; losing earlier targets cannot be killed.
    const marked=marks.at(-1),target=id(marked.loginId);
    if(rows.some(r=>matches(r)&&r.type==='dead'&&r.effectActive!==false&&id(r.loginId)===target))continue;
    for(const death of deaths){
      const deathId=String(death.id||'');
      const consequenceId='hunter-last-shot:'+match+':'+deathId+':'+target;
      if(rows.some(r=>String(r.id||'')===consequenceId))continue;
      result.push({id:consequenceId,type:'dead',loginId:target,actorId:hunter,
        matchId:match,night:Number(death.night||night),cycleKey:String(death.cycleKey||''),
        source:'hunter-death-engine',actionId:'action_hunter_last_shot',
        effectName:'Thợ Săn',effectActive:true,causeDeathId:deathId,
        message:'Thợ Săn đã chết; mục tiêu được săn phải chết theo.'});
      break;
    }
  }
  return result;
}
