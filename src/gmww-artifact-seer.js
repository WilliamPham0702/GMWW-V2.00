/* GMWW — Mắt Tiên Tri (artifact_18): người giữ xem chung kết quả soi của Tiên Tri trong đêm. */
import {resolveNightReveal} from './gmww-wolf-night-resolution.js';
const login=v=>String(v??'').trim().replace(/^member:/,'').toLowerCase();
const list=a=>Array.isArray(a)?a:[];
export function seerShareNotices({assignments=[],interactions=[],matchId='',night=1,cycleKey='',now=''}={}){
  const rows=list(interactions),m=String(matchId);
  const dead=id=>rows.some(r=>String(r?.matchId||'')===m&&r.type==='dead'&&r.effectActive!==false&&login(r.loginId)===id);
  const holders=list(assignments).filter(a=>String(a?.artifactId||'')==='artifact_18').map(a=>login(a.loginId)).filter(id=>id&&!dead(id));
  if(!holders.length)return [];
  const out=[];
  for(const r of rows){
    if(String(r?.matchId||'')!==m||r.actionId!=='action_seer'||r.undone===true||Number(r.night)!==Number(night))continue;
    const actor=list(assignments).find(a=>login(a?.loginId)===login(r.actorId));
    if(actor?.roleId!=='role_seer')continue;
    const reveal=resolveNightReveal({actionId:'action_seer',targetIds:[login(r.loginId)],assignments});
    if(!reveal)continue;
    for(const h of holders){
      const id='artifact-eye:'+m+':'+night+':'+h+':'+login(r.loginId);
      if(rows.some(x=>x?.id===id)||out.some(x=>x.id===id))continue;
      out.push({id,type:'effect_notice',loginId:h,actorId:h,matchId:m,night:Number(night),cycleKey:String(cycleKey),effectActive:false,
        actionId:'artifact-eye-share',artifactId:'artifact_18',source:'artifact-rules',createdAt:now,
        message:'Mắt Tiên Tri: Tiên Tri soi '+login(r.loginId)+' → '+reveal.message});
    }
  }
  return out;
}
