// GMWW Online chat: private, server-authoritative permissions.
// The room's night queue is the single source of truth; never infer access from faction alone.
const normalize=id=>String(id||'').trim().toLowerCase().replace(/^member:/,'');
const active=(row,match,now)=>row&&row.effectActive!==false&&(!row.matchId||String(row.matchId)===String(match||''))&&(!row.expiresAt||Date.parse(row.expiresAt)>now);
export function chatBlockedByEffects(rows,match,loginId,now=Date.now()){
  const id=normalize(loginId);
  let dead=false,expelled=false,mute=false;
  for(const x of Array.isArray(rows)?rows:[]){
    if(normalize(x?.loginId)!==id||!active(x,match,now))continue;
    if(x.type==='dead')dead=true;
    if(x.type==='expelled')expelled=true;
    if(x.type==='status'&&x.statusId==='mute')mute=true;
  }
  return{dead,expelled,mute};
}
function stepGroups(step){
  if(!step||typeof step!=='object')return [];
  if(['wolf-introduction','wolf-pack-bite'].includes(step.kind)){
    const members=step.kind==='wolf-introduction'?step.recognitionIds:step.loginIds;
    return[{id:'wolves',members:(members||[]).map(normalize)}];
  }
  if(step.kind==='role-group')return(step.roles||[]).map(r=>({id:'role:'+String(r.roleId||''),members:(r.loginIds||[]).map(normalize)}));
  if(step.kind==='role')return[{id:'role:'+String(step.roleId||''),members:(step.loginIds||[]).map(normalize)}];
  return [];
}
export function chatPolicy({meta,players,rows,runtime,loginId,bans={},now=Date.now()}){
  const id=normalize(loginId),member=players?.['member:'+id];
  if(!id||!member||String(meta?.phase||'')!=='running')
    return{canRead:false,canSend:false,channel:null,reason:'CHAT_NOT_IN_RUNNING_ROOM'};
  const effects=chatBlockedByEffects(rows,meta?.matchId,id,now);
  const blocked=effects.dead||effects.expelled||effects.mute||bans[id]===true;
  const reason=effects.dead?'CHAT_DEAD':effects.expelled?'CHAT_EXPELLED':effects.mute?'CHAT_MUTED_ARTIFACT':bans[id]===true?'CHAT_MUTED_GM':null;
  const phase=String(meta.cyclePhase||'');
  if(phase==='morning'||phase==='day')
    return{canRead:true,canSend:!blocked,channel:'day',scope:'village',reason};
  if(phase!=='night'||effects.dead||effects.expelled)
    return{canRead:false,canSend:false,channel:null,reason:reason||'CHAT_NIGHT_CLOSED'};
  const step=!runtime?.completed?runtime?.queue?.[runtime.cursor]:null;
  const groups=stepGroups(step);
  // One person cannot bridge unrelated night groups in a shared queue step.
  const permitted=groups.filter(g=>g.members.length>=2&&g.members.includes(id)&&
    g.members.filter(other=>{
      const e=chatBlockedByEffects(rows,meta?.matchId,other,now);
      return !!players['member:'+other]&&!e.dead&&!e.expelled;
    }).length>=2);
  if(permitted.length!==1)return{canRead:false,canSend:false,channel:null,reason:'CHAT_NIGHT_NOT_SHARED'};
  const group=permitted[0],channel='night:'+String(meta.cycleKey||'')+':'+String(step.id||'')+':'+group.id;
  return{canRead:true,canSend:!blocked,channel,scope:'secret',reason};
}
export function chatNormalizeText(value){
  if(typeof value!=='string')return'';
  return value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,280);
}
