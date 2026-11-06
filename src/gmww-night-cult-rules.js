/* GMWW — luật thuần: Già Làng ("18" Rung Chuông), Trưởng Phái ("25" kết nạp Giáo Dân), Tà Đạo (thêm/giết/chết theo). */
const login=v=>String(v??'').trim().replace(/^member:/,'').toLowerCase();
const same=(r,m)=>r&&String(r.matchId||'')===String(m||'');
const live=r=>r&&r.undone!==true&&r.noEffect!==true&&r.status!=='skipped';
const list=a=>Array.isArray(a)?a:[];
const roleOf=(as,id)=>list(as).find(a=>login(a?.loginId)===id)||null;
const deadBefore=(rows,m,id,night)=>list(rows).some(r=>same(r,m)&&r.type==='dead'&&r.effectActive!==false&&login(r.loginId)===id&&Number(r.night)<Number(night));
const isDead=(rows,m,id)=>list(rows).some(r=>same(r,m)&&r.type==='dead'&&r.effectActive!==false&&login(r.loginId)===id);
const notice=r=>r&&r.type==='effect_notice'&&live(r);

/* Già Làng: 2 mạng; 4 đêm đầu, mỗi lần Rung Chuông vô hiệu mọi tác động chết của đêm và mất 1 mạng; hết mạng thì chết. */
export function validBells({assignments=[],interactions=[],matchId='',night=99}={}){
  const out=[],seen=new Set();
  for(const r of list(interactions).filter(r=>same(r,matchId)&&notice(r)&&r.actionId==='18'&&Number(r.night)>=1&&Number(r.night)<=4&&Number(r.night)<=Number(night))
    .sort((a,b)=>Number(a.night)-Number(b.night))){
    const actor=login(r.actorId),a=roleOf(assignments,actor),k=actor+':'+r.night;
    if(a?.roleId!=='role_elder'||seen.has(k)||deadBefore(interactions,matchId,actor,r.night))continue;
    if(out.filter(x=>x.actor===actor).length>=2)continue;
    seen.add(k);out.push({actor,night:Number(r.night)});
  }
  return out;
}
export function elderBell({assignments=[],interactions=[],matchId='',night=1,cycleKey='',now=''}={}){
  const bells=validBells({assignments,interactions,matchId,night}),here=bells.filter(b=>b.night===Number(night));
  const rows=[];
  for(const b of here){
    if(bells.filter(x=>x.actor===b.actor).length>=2&&!isDead(interactions,matchId,b.actor)){
      const id='elder-lives:'+matchId+':'+b.actor;
      if(!list(interactions).some(x=>x?.id===id))rows.push({id,clientEventId:id,type:'dead',loginId:b.actor,matchId:String(matchId),night:Number(night),cycleKey:String(cycleKey),
        effectActive:true,actionId:'18',effectName:'Hết mạng',source:'night-cult-engine',createdAt:now,message:'Già Làng đã hết mạng.'});
    }
  }
  return {active:here.length>0,rows};
}

/* Trưởng Phái: Giáo Dân do mình kết nạp (mỗi đêm một người); Trưởng Phái chết thì Giáo Dân chết theo. */
export function sectFollowers({assignments=[],interactions=[],matchId=''}={}){
  const map=new Map();
  for(const r of list(interactions).filter(r=>same(r,matchId)&&notice(r)&&r.actionId==='25')){
    const actor=login(r.actorId),t=login(r.loginId),a=roleOf(assignments,actor);
    if(a?.roleId!=='role_sect_leader'||!t||t===actor||!roleOf(assignments,t)||deadBefore(interactions,matchId,actor,r.night))continue;
    const s=map.get(actor)||new Set();s.add(t);map.set(actor,s);
  }
  return map;
}

/* Tà Đạo: Đêm 1–5 mỗi đêm Thêm hoặc Giết (hành động đầu tiên trong đêm); sau Đêm 5 chỉ Giết. */
export function cultActions({assignments=[],interactions=[],matchId='',night=99}={}){
  const adds=[],kills=[],first=new Map();
  for(const r of list(interactions).filter(r=>same(r,matchId)&&notice(r)&&['action-cult-add','action-cult-kill'].includes(r.actionId)&&Number(r.night)<=Number(night))){
    const actor=login(r.actorId),t=login(r.loginId),a=roleOf(assignments,actor),k=actor+':'+r.night;
    if(a?.roleId!=='role_cult'||!t||t===actor||!roleOf(assignments,t)||deadBefore(interactions,matchId,actor,r.night)||deadBefore(interactions,matchId,t,r.night))continue;
    if(first.has(k))continue;
    if(r.actionId==='action-cult-add'){if(Number(r.night)>5||roleOf(assignments,t)?.roleId==='role_cult')continue;first.set(k,1);adds.push({actor,target:t,night:Number(r.night)})}
    else{first.set(k,1);kills.push({actor,target:t,night:Number(r.night)})}
  }
  return {adds,kills};
}
export function cultMembers({assignments=[],interactions=[],matchId='',night=99}={}){
  const m=new Map();
  for(const a of cultActions({assignments,interactions,matchId,night}).adds){const s=m.get(a.actor)||new Set();s.add(a.target);m.set(a.actor,s)}
  return m;
}
export function isCultMember({assignments=[],interactions=[],matchId='',loginId='',night=99}={}){
  const id=login(loginId);return [...cultMembers({assignments,interactions,matchId,night}).values()].some(s=>s.has(id));
}
/* Giết của Tà Đạo trong đêm `night`: bị Bảo Vệ/Bất Tử chặn (nhận qua `protectedIds`). */
export function cultKillDeaths({assignments=[],interactions=[],matchId='',night=1,cycleKey='',now='',protectedIds=[]}={}){
  const prot=new Set(list(protectedIds).map(login));
  return cultActions({assignments,interactions,matchId,night}).kills.filter(k=>k.night===Number(night)&&!prot.has(k.target)&&!isDead(interactions,matchId,k.target)).map(k=>{
    const id='cult-kill:'+matchId+':'+night+':'+k.target;
    return list(interactions).some(x=>x?.id===id)?null:{id,clientEventId:id,type:'dead',loginId:k.target,matchId:String(matchId),night:Number(night),cycleKey:String(cycleKey),
      effectActive:true,actionId:'action-cult-kill',effectName:'Tà Đạo Giết',source:'night-cult-engine',createdAt:now,message:'Bạn đã bị Tà Đạo giết.'};
  }).filter(Boolean);
}
/* Chết theo: Trưởng Phái -> Giáo Dân; Tà Đạo -> thành viên. Hai chiều không ngược lại. */
export function groupLinkedDeaths({assignments=[],interactions=[],matchId='',night=1,cycleKey='',now=''}={}){
  const rows=list(interactions),out=[];
  const groups=[...sectFollowers({assignments,interactions,matchId}),...cultMembers({assignments,interactions,matchId})];
  for(const [leader,members] of groups){
    const death=rows.find(r=>same(r,matchId)&&r.type==='dead'&&r.effectActive!==false&&login(r.loginId)===leader);
    if(!death)continue;
    for(const m of members){
      const id='group-link:'+matchId+':'+leader+':'+m;
      if(isDead(rows,matchId,m)||rows.some(r=>r?.id===id)||out.some(r=>r.id===id))continue;
      out.push({id,clientEventId:id,type:'dead',loginId:m,matchId:String(matchId),night:Number(death.night||night)||1,cycleKey:String(death.cycleKey||cycleKey),
        effectActive:true,actionId:'action-cult-death-link',effectName:'Chết theo',causeDeathId:String(death.id||''),source:'night-cult-engine',createdAt:now,
        message:'Bạn đã chết theo thủ lĩnh.'});
    }
  }
  return out;
}
