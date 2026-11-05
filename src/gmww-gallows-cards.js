/* GMWW — luật thuần cho nhóm Treo Cổ (05/11/2026): Kẻ Ngốc, Người Yêu Hòa Bình, Thẩm Phán. */
const login=v=>String(v??'').trim().replace(/^member:/,'').toLowerCase();
const same=(r,m)=>r&&String(r.matchId||'')===String(m||'');
const live=r=>r&&r.undone!==true&&r.noEffect!==true&&r.effectActive!==false&&r.status!=='skipped';
const list=a=>Array.isArray(a)?a:[];

/* Kẻ Ngốc: Treo Cổ lần đầu không chết (mất quyền bỏ phiếu đến hết ván); lần hai chết. */
export function foolEscapes({assignments=[],interactions=[],matchId='',candidateId=''}={}){
  const id=login(candidateId),a=list(assignments).find(x=>login(x?.loginId)===id);
  if(a?.roleId!=='role_fool')return false;
  return !list(interactions).some(r=>same(r,matchId)&&r.actionId==='action-fool-escape'&&live(r)&&login(r.loginId)===id);
}
export function foolEscapeRow({matchId,cycleKey='',night=1,candidateId,gallowsId='',now=''}){
  const id=login(candidateId);
  return {id:'fool-escape:'+matchId+':'+id,type:'effect_notice',loginId:id,actorId:id,matchId:String(matchId),cycleKey:String(cycleKey),night:Number(night),
    effectActive:true,actionId:'action-fool-escape',effectName:'Kẻ Ngốc thoát chết',gallowsId,source:'gallows-cards',createdAt:now,
    message:'Kẻ Ngốc bị Treo Cổ lần đầu nên không chết và mất quyền bỏ phiếu đến hết ván.'};
}
export function foolVoteBans({interactions=[],matchId=''}={}){
  return [...new Set(list(interactions).filter(r=>same(r,matchId)&&r.actionId==='action-fool-escape'&&live(r)).map(r=>login(r.loginId)))];
}
/* Người Yêu Hòa Bình: chỉ được biểu quyết CỨU (phiếu Treo Cổ không tính). */
export function peaceLoverIds({assignments=[]}={}){
  return list(assignments).filter(a=>a?.roleId==='role_peace_lover').map(a=>login(a.loginId));
}
/* Thẩm Phán: Phán Quyết Kép đang hiệu lực trong ngày `day`. */
export function judgeDoubleActive({interactions=[],matchId='',day=1}={}){
  return list(interactions).some(r=>same(r,matchId)&&r.actionId==='action-judge-double'&&r.undone!==true&&r.noEffect!==true&&Number(r.night)===Number(day));
}
