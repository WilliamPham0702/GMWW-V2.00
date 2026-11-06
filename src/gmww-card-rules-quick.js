/* GMWW — luật thuần cho nhóm lá "nhanh" (05/11/2026). Không I/O, dùng cho Server và test.
 * Mọi hiệu lực được suy ra từ lịch sử interactions của đúng ván (matchId), không lưu trạng thái riêng. */
const login=v=>String(v??'').trim().replace(/^member:/,'').toLowerCase();
const same=(r,m)=>r&&String(r.matchId||'')===String(m||'');
const live=r=>r&&r.undone!==true&&r.noEffect!==true&&r.status!=='skipped';
const isDead=(rows,m,id)=>rows.some(r=>same(r,m)&&r.type==='dead'&&r.effectActive!==false&&login(r.loginId)===id);
const roleOf=(assignments,id)=>(Array.isArray(assignments)?assignments:[]).find(a=>login(a?.loginId)===id)||null;
const wolfLike=a=>{const f=String(a?.faction||a?.factionId||'').toLowerCase();return String(a?.roleId||'').includes('wolf')||f==='wolf'||f.includes('sói')||f.includes('soi')};

/* Lực Sỹ: sống sót 1 lần Sói Cắn có thể gây chết. Bảo Vệ đã chặn thì không tiêu hao (không nằm trong victims). */
export function strongmanDawn({assignments=[],interactions=[],matchId='',night=1,cycleKey='',victims=[],now=''}={}){
  const rows=Array.isArray(interactions)?interactions:[],out=[],remaining=[];
  for(const v of Array.isArray(victims)?victims:[]){
    const id=login(v),a=roleOf(assignments,id);
    const consumed=rows.some(r=>same(r,matchId)&&String(r.actionId||'')==='action-strongman-bite'&&login(r.loginId)===id&&live(r));
    if(a?.roleId==='role_strongman'&&!consumed&&!isDead(rows,matchId,id)){
      out.push({id:'strongman-bite:'+matchId+':'+night+':'+id,type:'effect_notice',loginId:id,actorId:id,matchId:String(matchId),
        night,cycleKey:String(cycleKey),effectActive:false,actionId:'action-strongman-bite',effectName:'Lực Sỹ',
        publicReveal:true,revealedRoleId:'role_strongman',source:'strongman-engine',createdAt:now,
        message:'Lực Sỹ đã chịu được Sói Cắn; danh tính Lực Sỹ được công khai.'});
    }else remaining.push(v);
  }
  return {victims:remaining,rows:out};
}

/* Ông Già: chết do tuổi thọ vào Đêm (số Sói lúc bắt đầu + 1), xuyên Bảo Vệ/Bất Tử; hồi sinh rồi không chết lại. */
export function oldManLifespanDeaths({assignments=[],interactions=[],matchId='',night=1,cycleKey='',now=''}={}){
  const rows=Array.isArray(interactions)?interactions:[],list=Array.isArray(assignments)?assignments:[];
  const wolves=list.filter(a=>wolfLike(a)&&!a.inheritedFromRoleId&&!a.convertedAt).length,deathNight=wolves+1,out=[];
  for(const a of list){
    if(a?.roleId!=='role_old_man')continue;
    const id=login(a.loginId),rid='old-man:'+matchId+':'+id;
    if(Number(night)<deathNight||isDead(rows,matchId,id)||rows.some(r=>String(r?.id||'')===rid))continue;
    out.push({id:rid,clientEventId:rid,type:'dead',loginId:id,matchId:String(matchId),night:Number(night),cycleKey:String(cycleKey),
      effectActive:true,actionId:'action-old-man-lifespan',effectName:'Tuổi Thọ',source:'old-man-engine',createdAt:now,
      message:'Ông Già đã chết vì tuổi già (Đêm '+deathNight+').'});
  }
  return out;
}

/* Người Loan Tin: sáng hôm sau công bố vai trò của người được chọn (cả làng thấy), kể cả đã chết. */
export function newsBearerNotices({assignments=[],interactions=[],matchId='',night=1,cycleKey='',now=''}={}){
  const rows=Array.isArray(interactions)?interactions:[],out=[];
  for(const r of rows){
    if(!same(r,matchId)||String(r.actionId||'')!=='action-news-role'||!live(r)||Number(r.night)!==Number(night))continue;
    const actor=login(r.actorId),target=login(r.loginId),me=roleOf(assignments,actor);
    if(!actor||!target||actor===target||me?.roleId!=='role_news_bearer')continue;
    const id='news:'+matchId+':'+night+':'+actor;
    if(rows.some(x=>String(x?.id||'')===id)||out.some(x=>x.id===id))continue;
    const t=roleOf(assignments,target),name=String(t?.roleName||t?.roleId||'Vai Trò');
    out.push({id,type:'effect_notice',loginId:target,actorId:actor,matchId:String(matchId),night:Number(night),cycleKey:String(cycleKey),
      effectActive:false,actionId:'action-news-role-reveal',effectName:'Loan Tin',public:true,
      revealedRoleId:String(t?.roleId||''),revealedRoleName:name,source:'news-bearer-engine',createdAt:now,
      message:'Tin tức: người được loan tin mang Vai Trò '+name+'.'});
  }
  return out;
}

/* Con Bệnh gắn Bị Bệnh (kể cả bản thân); Bác Sỹ Điên Giải Độc 1 lần. Bệnh không tự gây chết, không chặn chức năng. */
export function diseasedLoginIds({interactions=[],matchId=''}={}){
  const rows=(Array.isArray(interactions)?interactions:[]).filter(r=>same(r,matchId)&&live(r));
  const sick=new Map();
  const order=[...rows].sort((a,b)=>Number(a.night||0)-Number(b.night||0));
  for(const r of order){
    const t=login(r.loginId),a=String(r.actionId||'');
    if(a==='action-disease-self'&&t)sick.set(t,Number(r.night||0));
    if(a==='action-mad-doctor-cure'&&t&&sick.has(t))sick.delete(t);
  }
  return [...sick.keys()];
}

/* Con Quạ: người được chọn có thêm 2 phiếu Treo Cổ ở phiên ngày hôm sau (night === day). */
export function crowExtraVotes({interactions=[],matchId='',day=1}={}){
  const out={};
  for(const r of Array.isArray(interactions)?interactions:[]){
    if(!same(r,matchId)||String(r.actionId||'')!=='action-g7-crow-votes'||!live(r)||Number(r.night)!==Number(day))continue;
    const t=login(r.loginId);if(t)out[t]=(out[t]||0)+2;
  }
  return out;
}

/* Bà Da Đen: người bị buộc rời làng ban ngày hôm sau; không bỏ phiếu/dùng chức năng/bị chọn; đêm kế tiếp trở lại. */
export function blackWomanLeaving({interactions=[],matchId='',day=1}={}){
  return [...new Set((Array.isArray(interactions)?interactions:[]).filter(r=>same(r,matchId)&&
    String(r.actionId||'')==='action-black-woman-leave'&&live(r)&&Number(r.night)===Number(day)).map(r=>login(r.loginId)).filter(Boolean))];
}

/* Kẻ Báo Thù: phe = phe hiện tại của mục tiêu; mục tiêu chết thì giữ phe tại thời điểm đó. */
export function avengerFactions({assignments=[],interactions=[],matchId=''}={}){
  const rows=Array.isArray(interactions)?interactions:[],out={};
  for(const a of Array.isArray(assignments)?assignments:[]){
    if(a?.roleId!=='role_avenger')continue;
    const me=login(a.loginId),pick=rows.filter(r=>same(r,matchId)&&String(r.actionId||'')==='action-avenger-target'&&login(r.actorId)===me&&live(r))
      .sort((x,y)=>Number(x.night||0)-Number(y.night||0))[0];
    if(!pick)continue;
    const t=roleOf(assignments,login(pick.loginId));
    out[me]={targetId:login(pick.loginId),faction:String(t?.faction||t?.factionId||''),frozen:isDead(rows,matchId,login(pick.loginId))};
  }
  return out;
}

/* Kỵ Sỹ / Hoàng Tử: Đâm ban ngày. Trả về người chết. */
export function dayStabOutcome({roleId,actorId,target}={}){
  const f=String(target?.faction||target?.factionId||'').toLowerCase(),
    wolf=wolfLike(target)||f==='wolf',third=f==='third'||f.includes('phe ba'),actor=login(actorId),tid=login(target?.loginId);
  if(roleId==='role_cavalier'){const ok=wolf;return {correct:ok,dead:[ok?tid:actor]}}
  if(roleId==='role_prince'){const ok=wolf||third;return {correct:ok,dead:[ok?tid:actor]}}
  return {correct:false,dead:[]};
}

/* Tiên Tri Tập Sự: kế nhiệm Tiên Tri khi mọi Tiên Tri đã chết (hoặc ván không có Tiên Tri) và còn sống. */
export function apprenticeSuccession({assignments=[],interactions=[],matchId='',night=1}={}){
  const rows=Array.isArray(interactions)?interactions:[],list=Array.isArray(assignments)?assignments:[];
  const deadBefore=id=>rows.some(r=>same(r,matchId)&&r.type==='dead'&&r.effectActive!==false&&login(r.loginId)===id&&Number(r.night||0)<Number(night));
  const seers=list.filter(a=>a?.roleId==='role_seer');
  if(seers.some(a=>!deadBefore(login(a.loginId))))return [];
  return list.filter(a=>a?.roleId==='role_apprentice_seer'&&!deadBefore(login(a.loginId))&&!isDead(rows,matchId,login(a.loginId)))
    .map(a=>({kind:'apprentice',actorId:login(a.loginId),sourceId:null,sourceRoleId:'role_seer',targetRoleId:'role_seer',fromRoleId:'role_apprentice_seer',night:Number(night)}));
}
