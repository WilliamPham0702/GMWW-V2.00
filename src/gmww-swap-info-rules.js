/* GMWW — luật thuần nhóm đổi/kế thừa và thông tin (05/11/2026): Hầu Gái, Ba Anh Em, Hồn Ma, Cô Bé Ti Hí. */
const login=v=>String(v??'').trim().replace(/^member:/,'').toLowerCase();
const same=(r,m)=>r&&String(r.matchId||'')===String(m||'');
const live=r=>r&&r.undone!==true&&r.noEffect!==true&&r.status!=='skipped';
const list=a=>Array.isArray(a)?a:[];
const isDead=(rows,m,id)=>list(rows).some(r=>same(r,m)&&r.type==='dead'&&r.effectActive!==false&&login(r.loginId)===id);
const norm=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/gi,'d').toLowerCase().trim();

/* Hầu Gái: sau khi một người bị Treo Cổ, nhận vai trò của người đó từ đêm kế tiếp (một lần). */
export function maidSuccession({assignments=[],interactions=[],matchId='',night=1}={}){
  const rows=list(interactions),out=[];
  for(const a of list(assignments)){
    if(a?.roleId!=='role_maid')continue;
    const actor=login(a.loginId);
    if(isDead(rows,matchId,actor))continue;
    const act=rows.filter(r=>same(r,matchId)&&(r.actionId==='action-maid-inherit')&&login(r.actorId)===actor&&live(r)&&Number(r.night)<Number(night))
      .sort((x,y)=>Number(y.night)-Number(x.night))[0];
    if(!act)continue;
    const hanged=rows.filter(r=>same(r,matchId)&&r.type==='dead'&&r.effectActive!==false&&r.gallowsId&&Number(r.night)<=Number(act.night)&&login(r.loginId)!==actor)
      .sort((x,y)=>Number(y.night)-Number(x.night))[0];
    if(!hanged)continue;
    const src=list(assignments).find(x=>login(x?.loginId)===login(hanged.loginId));
    if(!src?.roleId)continue;
    out.push({kind:'maid',actorId:actor,sourceId:login(src.loginId),sourceRoleId:String(src.roleId),fromRoleId:'role_maid',night:Number(night)});
  }
  return out;
}

/* Ba Anh Em: Đêm 1 mỗi người được biết hai người còn lại. */
export function threeBrothersNotices({assignments=[],interactions=[],matchId='',night=1,cycleKey='',now=''}={}){
  if(Number(night)!==1)return [];
  const bros=list(assignments).filter(a=>a?.roleId==='role_three_brothers').map(a=>({id:login(a.loginId),name:a.displayName||login(a.loginId)}));
  if(bros.length<2)return [];
  return bros.map(b=>({id:'three-brothers:'+matchId+':'+b.id,type:'effect_notice',loginId:b.id,actorId:'gm',matchId:String(matchId),night:1,
    cycleKey:String(cycleKey),effectActive:false,actionId:'action-three-brothers-recognize',effectName:'Ba Anh Em',privateNotice:true,
    brotherIds:bros.filter(x=>x.id!==b.id).map(x=>x.id),source:'swap-info-engine',createdAt:now,
    message:'Hai người anh em của bạn: '+bros.filter(x=>x.id!==b.id).map(x=>x.name).join(', ')+'.'}))
    .filter(r=>!list(interactions).some(x=>x?.id===r.id));
}

/* Hồn Ma: sau khi chết, mỗi ngày 1 từ, không nhắc tên người chơi; vi phạm mất quyền đến hết ván. */
export function ghostCheck({word='',actorId='',assignments=[],players={},interactions=[],matchId='',day=1}={}){
  const actor=login(actorId),rows=list(interactions);
  const a=list(assignments).find(x=>login(x?.loginId)===actor);
  if(a?.roleId!=='role_ghost')return {ok:false,error:'GHOST_NOT_GHOST'};
  if(!isDead(rows,matchId,actor))return {ok:false,error:'GHOST_NOT_DEAD'};
  if(rows.some(r=>same(r,matchId)&&r.actionId==='action-ghost-violation'&&login(r.loginId)===actor&&live(r)))return {ok:false,error:'GHOST_MUTED'};
  const w=String(word).trim();
  if(!w||/\s/.test(w)||w.length>30)return {ok:false,error:'GHOST_ONE_WORD_ONLY'};
  if(rows.some(r=>same(r,matchId)&&r.actionId==='action-ghost-message'&&login(r.loginId)===actor&&live(r)&&Number(r.night)===Number(day)))return {ok:false,error:'GHOST_ALREADY_TODAY'};
  const nw=norm(w).replace(/[^a-z0-9]/g,'');
  const names=new Set();
  for(const p of [...list(assignments),...Object.values(players&&typeof players==='object'?players:{})]){
    if(!p)continue;
    for(const v of [p.loginId,p.displayName,p.name,p.nickname]){
      for(const part of norm(v).split(/[^a-z0-9]+/).filter(x=>x.length>=2))names.add(part);
    }
  }
  if(nw&&names.has(nw))return {ok:false,error:'GHOST_NAME_FORBIDDEN',violation:true};
  return {ok:true,word:w};
}

/* Cô Bé Ti Hí: bị Sói phát hiện (Player Web, mặc định KHÔNG) thì chết, xuyên Bảo Vệ/Bất Tử. */
export function peekDeaths({assignments=[],interactions=[],matchId='',night=1,cycleKey='',now=''}={}){
  const rows=list(interactions),out=[];
  for(const r of rows){
    if(!same(r,matchId)||r.type!=='effect_notice'||r.actionId!=='action-peek'||!live(r)||Number(r.night)!==Number(night))continue;
    const peeker=login(r.actorId),a=list(assignments).find(x=>login(x?.loginId)===peeker);
    if(a?.roleId!=='role_peeking_girl'||isDead(rows,matchId,peeker))continue;
    const detected=rows.some(d=>same(d,matchId)&&d.actionId==='action-peek-detect'&&d.detected===true&&live(d)&&Number(d.night)===Number(night)&&login(d.loginId)===peeker&&
      list(assignments).some(w=>login(w?.loginId)===login(d.actorId)&&String(w.faction||w.factionId||w.roleCard?.factionId||'').toLowerCase()==='wolf'));
    const id='peek-caught:'+matchId+':'+night+':'+peeker;
    if(!detected||rows.some(x=>x?.id===id))continue;
    out.push({id,clientEventId:id,type:'dead',loginId:peeker,matchId:String(matchId),night:Number(night),cycleKey:String(cycleKey),effectActive:true,
      actionId:'action-peek',effectName:'Hí Mắt',source:'swap-info-engine',createdAt:now,message:'Bạn bị Sói phát hiện khi hí mắt và đã chết.'});
  }
  return out;
}

/* Ti Hí: những người đang hí mắt trong đêm mà Bầy Sói CHƯA quyết định phát hiện hay không. */
export function peekPending({assignments=[],interactions=[],matchId='',night=1}={}){
  const rows=list(interactions);
  return [...new Set(rows.filter(r=>same(r,matchId)&&r.type==='effect_notice'&&r.actionId==='action-peek'&&live(r)&&Number(r.night)===Number(night))
    .map(r=>login(r.actorId)))].filter(p=>list(assignments).some(a=>login(a?.loginId)===p&&a.roleId==='role_peeking_girl')&&!isDead(rows,matchId,p)&&
    !rows.some(d=>same(d,matchId)&&d.actionId==='action-peek-detect'&&live(d)&&Number(d.night)===Number(night)&&login(d.loginId)===p));
}
export function peekDecisionRows({assignments=[],interactions=[],matchId='',night=1,cycleKey='',wolfId='',detected=false,now=''}={}){
  const wolf=list(assignments).find(a=>login(a?.loginId)===login(wolfId));
  if(!wolf||String(wolf.faction||wolf.factionId||wolf.roleCard?.factionId||'').toLowerCase()!=='wolf'||isDead(interactions,matchId,login(wolfId)))return [];
  return peekPending({assignments,interactions,matchId,night}).map(p=>({id:'peek-decision:'+matchId+':'+night+':'+p,type:'effect_notice',loginId:p,actorId:login(wolfId),
    matchId:String(matchId),night:Number(night),cycleKey:String(cycleKey),effectActive:false,actionId:'action-peek-detect',detected:detected===true,
    effectName:'Ti Hí',source:'swap-info-engine',createdAt:now,message:detected===true?'Bầy Sói đã phát hiện Ti Hí.':'Bầy Sói không phát hiện Ti Hí.'}));
}
