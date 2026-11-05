/* GMWW — luật thuần cho nhóm Sói biến thể (05/11/2026). Không I/O; suy ra từ lịch sử interactions của đúng ván. */
const login=v=>String(v??'').trim().replace(/^member:/,'').toLowerCase();
const same=(r,m)=>r&&String(r.matchId||'')===String(m||'');
const live=r=>r&&r.undone!==true&&r.noEffect!==true&&r.status!=='skipped';
const list=a=>Array.isArray(a)?a:[];
import {cultMembers} from './gmww-night-cult-rules.js';
const roleOf=(as,id)=>list(as).find(a=>login(a?.loginId)===id)||null;
const deadBefore=(rows,m,id,night)=>list(rows).some(r=>same(r,m)&&r.type==='dead'&&r.effectActive!==false&&login(r.loginId)===id&&Number(r.night)<Number(night));
const deadAny=(rows,m,id)=>list(rows).some(r=>same(r,m)&&r.type==='dead'&&r.effectActive!==false&&login(r.loginId)===id);
const setFaction=(a,f)=>({...a,faction:f,factionId:f,roleCard:{...(a.roleCard||{}),factionId:f}});

export const CONVERT_ACTIONS=Object.freeze({'action-demon-wolf-convert':'role_demon_wolf','action-wolf-brother-bite':'role_wolf_brother'});

/* Sói còn sống đầu đêm `night` (theo phe hiệu lực của đêm trước). */
function aliveWolvesAt({assignments,interactions,matchId,night}){
  const eff=effectiveAssignments({assignments,interactions,matchId,night,skipPack:true,convs:Number(night)>1?validConversions({assignments,interactions,matchId,night:Number(night)-1}):[]});
  return eff.filter(a=>String(a.faction||'')==='wolf'&&!deadBefore(interactions,matchId,login(a.loginId),night));
}

/* Chuyển đổi hợp lệ trong đêm `night`: Sói Quỷ (≤3 lần/ván) hoặc Lang Huynh Đệ khi là Sói duy nhất. */
export function validConversions({assignments=[],interactions=[],matchId='',night=1}={}){
  const rows=list(interactions).filter(r=>same(r,matchId)&&r.type==='effect_notice'&&CONVERT_ACTIONS[r.actionId]&&live(r)&&Number(r.night)<=Number(night))
    .sort((a,b)=>Number(a.night)-Number(b.night));
  const used=new Map(),out=[];
  for(const r of rows){
    const actor=login(r.actorId),target=login(r.loginId),a=roleOf(assignments,actor),t=roleOf(assignments,target);
    if(!a||!t||actor===target||a.roleId!==CONVERT_ACTIONS[r.actionId])continue;
    const n=Number(r.night);
    if(deadBefore(interactions,matchId,actor,n)||deadBefore(interactions,matchId,target,n))continue;
    if(a.roleId==='role_wolf_brother'){
      const alive=aliveWolvesAt({assignments,interactions,matchId,night:n});
      if(alive.length!==1||login(alive[0].loginId)!==actor)continue;
    }
    if(a.roleId==='role_demon_wolf'&&(used.get(actor)||0)>=3)continue;
    used.set(actor,(used.get(actor)||0)+1);
    out.push({actor,target,night:n,roleId:a.roleId});
  }
  return out;
}

/* Phe hiệu lực của từng người ở đêm `night`: bị chuyển hóa -> Sói (từ đêm sau); Sói Lai -> Dân từ Đêm 5; Sói Lạc Bầy đánh dấu chưa vào đàn trước Đêm 3. */
export function effectiveAssignments({assignments=[],interactions=[],matchId='',night=1,skipPack=false,convs=null}={}){
  const conv=convs||validConversions({assignments,interactions,matchId,night});
  // Cupid: hai người được ghép thuộc Phe Ba.
  const pairRows=list(interactions).filter(r=>same(r,matchId)&&r.actionId==='action-cupid-pair'&&live(r)),byActor=new Map();
  for(const r of pairRows){const k=login(r.actorId),l=byActor.get(k)||[];if(!l.includes(login(r.loginId)))l.push(login(r.loginId));byActor.set(k,l)}
  const cult=new Set([...cultMembers({assignments,interactions,matchId,night:Number(night)-1}).values()].flatMap(x=>[...x]));
  const cursed=new Set(list(interactions).filter(r=>same(r,matchId)&&r.actionId==='artifact-curse-convert'&&live(r)&&Number(r.night)<Number(night)).map(r=>login(r.loginId)));
  const lovers=new Set([...byActor.values()].filter(l=>l.length===2).flat());
  return list(assignments).map(a=>{
    const id=login(a?.loginId);let out=a;
    const c=conv.find(x=>x.target===id&&x.night<Number(night));
    if(c&&String(a.faction||a.factionId||a.roleCard?.factionId||'').toLowerCase()!=='wolf')out=setFaction(a,'wolf');
    if(a?.roleId==='role_hybrid_wolf'&&Number(night)>=5)out=setFaction(a,'village');
    if(!skipPack&&a?.roleId==='role_lone_wolf'&&Number(night)<3)out={...out,packExcluded:true};
    const idol=list(interactions).find(r=>same(r,matchId)&&r.actionId==='action-wild-child-idol'&&live(r)&&login(r.actorId)===id);
    if(a?.roleId==='role_wild_child'&&idol&&deadBefore(interactions,matchId,login(idol.loginId),night))out=setFaction(out,'wolf');
    if(cursed.has(id))out=setFaction(out,'wolf');
    if(lovers.has(id)||cult.has(id))out=setFaction(out,'third');
    return out;
  });
}

/* Sói Con: đêm kế tiếp sau khi chết, Bầy Sói được Cắn hai mục tiêu (một đêm). */
export function cubExtraBite({assignments=[],interactions=[],matchId='',night=1}={}){
  const cubs=list(assignments).filter(a=>a?.roleId==='role_wolf_cub').map(a=>login(a.loginId));
  return list(interactions).some(r=>same(r,matchId)&&r.type==='dead'&&r.effectActive!==false&&cubs.includes(login(r.loginId))&&Number(r.night)+1===Number(night));
}

/* Sói Đá: Da Đá chặn 1 tác động gây chết (trừ Treo Cổ). Chỉ tiêu hao khi tác động thực sự làm Sói Đá chết. */
export function stoneSkinFilter({assignments=[],interactions=[],matchId='',night=1,cycleKey='',victims=[],now=''}={}){
  const out=[],remaining=[];
  for(const v of list(victims)){
    const id=login(v),a=roleOf(assignments,id);
    const used=list(interactions).some(r=>same(r,matchId)&&r.actionId==='action-stone-wolf-life'&&login(r.loginId)===id&&live(r))||out.some(r=>login(r.loginId)===id);
    if(a?.roleId==='role_stone_wolf'&&!used&&!deadAny(interactions,matchId,id)){
      out.push({id:'stone-skin:'+matchId+':'+night+':'+id,type:'effect_notice',loginId:id,actorId:id,matchId:String(matchId),night:Number(night),
        cycleKey:String(cycleKey),effectActive:false,actionId:'action-stone-wolf-life',effectName:'Da Đá',source:'wolf-variant-engine',createdAt:now,
        message:'Da Đá đã chặn một tác động gây chết.'});
    }else remaining.push(v);
  }
  return {victims:remaining,rows:out};
}

/* Sói Lửa: là Sói duy nhất còn sống -> Lửa Lan; người sát bên (theo hướng GM chọn) chết vào sáng 2 ngày sau. */
export function fireSpreadDeaths({assignments=[],interactions=[],players={},matchId='',night=1,cycleKey='',now=''}={}){
  const seated=Object.values(players&&typeof players==='object'?players:{}).filter(p=>login(p?.loginId)&&Number(p?.seatId)>0)
    .map(p=>({loginId:login(p.loginId),seatId:Number(p.seatId)})).sort((a,b)=>a.seatId-b.seatId||a.loginId.localeCompare(b.loginId));
  const out=[];
  for(const r of list(interactions)){
    if(!same(r,matchId)||r.type!=='effect_notice'||r.actionId!=='action-fire-wolf-bite'||!live(r))continue;
    const bn=Number(r.night);if(bn+2!==Number(night))continue;
    const actor=login(r.actorId),origin=login(r.loginId),a=roleOf(assignments,actor);
    if(a?.roleId!=='role_fire_wolf'||!['left','right'].includes(r.direction))continue;
    const alive=aliveWolvesAt({assignments,interactions,matchId,night:bn});
    if(alive.length!==1||login(alive[0].loginId)!==actor)continue;
    const n=seated.findIndex(x=>x.loginId===origin);
    if(n<0||seated.length<2||new Set(seated.map(x=>x.seatId)).size!==seated.length)continue;
    const step=r.direction==='right'?-1:1,next=seated[(n+step+seated.length)%seated.length];
    if(!next||next.loginId===origin||deadAny(interactions,matchId,next.loginId))continue;
    const id='fire-spread:'+matchId+':'+bn+':'+next.loginId;
    if(list(interactions).some(x=>x?.id===id))continue;
    out.push({id,clientEventId:id,type:'dead',loginId:next.loginId,matchId:String(matchId),night:Number(night),cycleKey:String(cycleKey),
      effectActive:true,actionId:'action-fire-wolf-bite',effectName:'Lửa Lan',source:'wolf-variant-engine',createdAt:now,
      message:'Bạn đã chết vì Lửa Lan.'});
  }
  return out;
}

/* Thông báo riêng cho người vừa bị chuyển hóa khi bắt đầu đêm chuyển phe. */
export function convertNotices({assignments=[],interactions=[],matchId='',night=1,cycleKey='',now=''}={}){
  return validConversions({assignments,interactions,matchId,night}).filter(c=>c.night+1===Number(night)&&!deadBefore(interactions,matchId,c.target,night))
    .map(c=>({id:'convert-notice:'+matchId+':'+night+':'+c.target,type:'effect_notice',loginId:c.target,actorId:'gm',matchId:String(matchId),
      night:Number(night),cycleKey:String(cycleKey),effectActive:false,actionId:'action-convert-notice',effectName:'Chuyển Hóa',privateNotice:true,
      source:'wolf-variant-engine',createdAt:now,message:'Bạn đã bị chuyển sang Phe Sói từ đêm nay. Hãy cùng Bầy Sói hành động.'}))
    .filter(r=>!list(interactions).some(x=>x?.id===r.id));
}
