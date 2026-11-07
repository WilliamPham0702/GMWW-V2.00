/* Tráng Gương (artifact_23) — pure rules. The owner copies the ACTIVE functions of a
 * target's role and is woken again right after that role's turn, every following night.
 * Nothing here touches storage; the Durable Object persists the link. */
export const MIRROR_ARTIFACT_ID='artifact_23';
const login=value=>String(value??'').trim().replace(/^member:/,'').toLowerCase();
const actionOf=fn=>String(fn?.actionId||fn?.id||'');

/* Functions a mirror owner may use at night: active, night/any, and never the pack-only bite. */
export function mirrorFunctions(card){
  const fns=Array.isArray(card?.functions)?card.functions:[];
  return fns.filter(fn=>fn&&fn.passive!==true&&actionOf(fn)!=='action_wolf_bite'&&
    (!fn.phase||['night','any','both'].includes(String(fn.phase))));
}
export function mirrorLinkKey(matchId,ownerId){return 'mirrorLink:'+String(matchId||'')+':'+login(ownerId)}
export function mirrorLinkPrefix(matchId){return 'mirrorLink:'+String(matchId||'')+':'}

export function buildMirrorLink({matchId,ownerId,targetId,role,night,now}){
  const card=role?.roleCard||{};
  return {matchId:String(matchId||''),ownerId:login(ownerId),targetId:login(targetId),
    roleId:String(role?.roleId||''),roleName:String(role?.roleName||card.name||'Vai Trò').slice(0,80),
    roleCard:{...card,functions:mirrorFunctions(card)},createdNight:Math.max(1,Number(night)||1),createdAt:now||new Date().toISOString()};
}

/* A normal 'role' turn, so every client (GM and Player) offers the copied role's actions. */
export function mirrorStep(link,durationSec=45){
  const owner=login(link.ownerId);
  return {id:'mirror:'+owner+':'+String(link.roleId),kind:'role',mirror:true,label:'Tráng Gương',
    roleId:String(link.roleId),loginIds:[owner],playerIds:['member:'+owner],artifacts:[],
    durationSec:Math.max(0,Number(durationSec)||0),status:'pending'};
}

/* Insert one 'Tráng Gương' turn right after the last turn of the copied role. Only positions
 * after `minIndex` qualify, so a turn that already passed never wakes the owner late. */
export function insertMirrorSteps(queue,links,{minIndex=0,durationFor}={}){
  let inserted=0;
  const ordered=[...(Array.isArray(links)?links:[])].sort((a,b)=>String(a.ownerId).localeCompare(String(b.ownerId)));
  for(const link of ordered){
    const step=mirrorStep(link,typeof durationFor==='function'?durationFor(link.roleId):45);
    if(queue.some(s=>s?.id===step.id))continue;
    let at=-1;
    for(let i=queue.length-1;i>=0;i--){
      const s=queue[i];
      if(!s||s.mirror||s.kind==='village-wakeup')continue;
      if(String(s.roleId||'')===step.roleId||(Array.isArray(s.roles)&&s.roles.some(r=>String(r?.roleId||'')===step.roleId))){at=i;break}
    }
    if(at<0||at<minIndex)continue;
    let pos=at+1;while(queue[pos]?.mirror)pos++;
    queue.splice(pos,0,step);inserted++;
  }
  return inserted;
}
