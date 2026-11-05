/* GMWW — luật thuần cho Artifact (05/11/2026), nhóm A: Treo Cổ + hành động ban ngày. */
const login=v=>String(v??'').trim().replace(/^member:/,'').toLowerCase();
const list=a=>Array.isArray(a)?a:[];
const same=(r,m)=>r&&(!r.matchId||!m||String(r.matchId)===String(m));
const live=r=>r&&r.undone!==true&&r.noEffect!==true&&r.effectActive!==false&&r.status!=='skipped';
const holders=(assignments,id)=>list(assignments).filter(a=>String(a?.artifactId||'')===id).map(a=>login(a.loginId)).filter(Boolean);
const isDead=(rows,m,id)=>list(rows).some(r=>same(r,m)&&r.type==='dead'&&live(r)&&login(r.loginId)===id);
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/gi,'d').toLowerCase();
const roleOf=(assignments,id)=>list(assignments).find(a=>login(a?.loginId)===id);
const roleLabel=a=>String(a?.roleName||a?.roleId||'Vai Trò');
const isWolfA=a=>{const f=norm(a?.faction||a?.factionId);return f.includes('soi')||f==='wolf'||f==='wolves'};
const isThirdA=a=>{const f=norm(a?.faction||a?.factionId);return f.includes('phe ba')||f.includes('phe thu')||f==='third'};

/* Cờ Artifact ảnh hưởng phiên Treo Cổ. */
export function gallowsArtifactFlags({assignments=[],interactions=[],matchId=''}={}){
  const dead=h=>h.filter(id=>isDead(interactions,matchId,id)&&!list(interactions).some(r=>same(r,matchId)&&r.type==='expelled'&&live(r)&&login(r.loginId)===id));
  return {
    forcedKill:holders(assignments,'artifact_08').filter(id=>!isDead(interactions,matchId,id)),
    doubleVoters:holders(assignments,'artifact_21'),
    saveOnly:holders(assignments,'artifact_44'),
    deadVoters:dead(holders(assignments,'artifact_43')),
    cloak:holders(assignments,'artifact_12')
  };
}
export const princeCloakActive=({assignments=[],candidateId=''}={})=>holders(assignments,'artifact_12').includes(login(candidateId));
export function princeCloakRow({matchId,cycleKey='',night=1,candidateId,gallowsId='',now=''}){
  const id=login(candidateId);
  return {id:'artifact-cloak:'+matchId+':'+id+':'+night,type:'effect_notice',loginId:id,actorId:id,matchId:String(matchId),cycleKey:String(cycleKey),night:Number(night),
    effectActive:false,actionId:'artifact-prince-cloak',artifactId:'artifact_12',effectName:'Áo Choàng Hoàng Tử',gallowsId,source:'artifact-rules',createdAt:now,
    message:'Áo Choàng Hoàng Tử: người sở hữu không bị loại bằng bỏ phiếu ban ngày.'};
}
/* Quả Cầu Phán Đoán: đã có phán đoán đúng → đề xuất Phe Dân thắng. */
export const orbVillageWin=({interactions=[],matchId=''}={})=>list(interactions).some(r=>same(r,matchId)&&r.actionId==='artifact-orb-village-win'&&live(r));

/* Khăn Hồn Ma: chữ cái đầu của Vai Trò người bị Treo Cổ hôm trước. */
export function lastHangedRole({assignments=[],interactions=[],matchId='',day=1}={}){
  const row=list(interactions).filter(r=>same(r,matchId)&&r.type==='dead'&&live(r)&&r.source==='gallows'&&Number(r.night)===Number(day)-1).pop();
  if(!row)return null;
  const a=roleOf(assignments,login(row.loginId));
  return a?{loginId:login(row.loginId),role:roleLabel(a)}:null;
}

/* Kế hoạch hành động ban ngày của Artifact nhóm A. Trả null nếu không thuộc nhóm. */
export function artifactDayPlan({artifactId='',actionId='',actorId='',targets=[],assignments=[],interactions=[],matchId='',day=1}={}){
  const actor=login(actorId),ts=list(targets).map(login),t0=ts[0];
  const ta=roleOf(assignments,t0),aa=roleOf(assignments,actor);
  const status=(id,statusId,extra)=>({kind:'status',loginId:id,type:'status',statusId,...(extra?{extra}:{})});
  const fail=(error,message)=>({ok:false,error,message});
  switch(artifactId){
    case 'artifact_06':
      return {ok:true,changes:[status(t0,'disabled_permanent')],message:'Ấn Dân Làng: mục tiêu mất chức năng đặc biệt vĩnh viễn.'};
    case 'artifact_09':{
      const v=ta?.roleId==='role_villager';
      return {ok:true,changes:[],message:v?'Mục tiêu LÀ Dân Thường.':'Mục tiêu KHÔNG phải Dân Thường.',result:{isVillager:v}};
    }
    case 'artifact_14':
      return {ok:true,changes:[{kind:'leave',loginId:t0,type:'effect_notice',extra:{actionIdOverride:'action-black-woman-leave',forceActive:true}}],message:'Gậy Mụ Già: mục tiêu rời làng trong ngày, không bỏ phiếu và không bị chọn.'};
    case 'artifact_22':
      return {ok:true,changes:[status(t0,'mute',{dayOnly:true})],message:'Mặt Nạ Câm Lặng: mục tiêu không được nói trong ngày.'};
    case 'artifact_36':
      return {ok:true,changes:[status(t0,'turn_away',{dayOnly:true})],message:'Khăn Choàng Hổ Thẹn: mục tiêu phải quay mặt đi trong ngày.'};
    case 'artifact_24':{
      const v=isThirdA(ta);
      return {ok:true,changes:[],message:v?'Mục tiêu THUỘC Phe Ba.':'Mục tiêu KHÔNG thuộc Phe Ba.',result:{third:v}};
    }
    case 'artifact_29':{
      const v=isWolfA(ta);
      return {ok:true,changes:[],message:v?'Mục tiêu LÀ Sói.':'Mục tiêu KHÔNG phải Sói.',result:{wolf:v}};
    }
    case 'artifact_39':
      return {ok:true,changes:[],message:'Vai Trò thật của mục tiêu: '+roleLabel(ta),result:{role:roleLabel(ta)}};
    case 'artifact_27':
      return {ok:true,changes:[{kind:'private_role',loginId:t0,type:'effect_notice',extra:{privateReveal:true,revealedRoleName:roleLabel(aa),fromLoginId:actor,rowMessage:'Mặt Dây Chuyền Kiêu Hãnh: người chơi cho bạn xem riêng Vai Trò thật là '+roleLabel(aa)+'.'}}],
        message:'Mặt Dây Chuyền Kiêu Hãnh: đã cho người được chọn xem riêng Vai Trò thật của chủ.'};
    case 'artifact_34':{
      const h=lastHangedRole({assignments,interactions,matchId,day});
      if(!h)return fail('NO_HANGED_YESTERDAY','Hôm trước không có ai bị Treo Cổ; chưa trừ lượt.');
      const letter=[...h.role.trim()][0]?.toLocaleUpperCase('vi')||'?';
      return {ok:true,changes:[],message:'Chữ cái đầu Vai Trò người bị Treo Cổ hôm trước: '+letter,result:{letter}};
    }
    case 'artifact_38':{
      if(!aa)return fail('ACTOR_NOT_FOUND','Không tìm thấy Vai Trò chủ sở hữu.');
      return {ok:true,kill:[t0],changes:[{kind:'public_role',loginId:actor,type:'effect_notice',extra:{publicReveal:true,revealedRoleName:roleLabel(aa),rowMessage:'Thương Cuồng Nộ: chủ sở hữu công khai Vai Trò là '+roleLabel(aa)+'.'}}],
        message:'Thương Cuồng Nộ: '+roleLabel(aa)+' công khai Vai Trò và loại một người.',publicMessage:'Thương Cuồng Nộ: chủ sở hữu công khai Vai Trò là '+roleLabel(aa)+'.'};
    }
    case 'artifact_26':{
      if(ts.length!==2)return fail('ORB_NEEDS_TWO','Cần đúng hai người.');
      const ok=ts.every(id=>isWolfA(roleOf(assignments,id)));
      if(ok)return {ok:true,changes:[{kind:'orb_win',loginId:actor,type:'effect_notice',extra:{actionIdOverride:'artifact-orb-village-win',forceActive:true}}],
        message:'Quả Cầu Phán Đoán đúng: cả hai là Sói. Đề xuất Phe Dân thắng ngay.',result:{correct:true}};
      return {ok:true,kill:[actor],changes:[],message:'Quả Cầu Phán Đoán sai: chủ sở hữu bị loại.',result:{correct:false}};
    }
    case 'artifact_40':{
      if(!t0||t0===actor||!aa||!ta)return fail('SWAP_TARGET_INVALID','Mục tiêu không hợp lệ; chưa trừ lượt.');
      if(isDead(interactions,matchId,actor)||isDead(interactions,matchId,t0))return fail('SWAP_TARGET_DEAD','Cả hai phải còn sống; chưa trừ lượt.');
      return {ok:true,changes:[{kind:'swap',loginId:t0,type:'effect_notice',extra:{actionIdOverride:'artifact-swap-role',forceActive:true,rowMessage:'Đá Hoán Đổi: Vai Trò hoán đổi từ đêm kế tiếp.'}}],
        message:'Đá Hoán Đổi: '+roleLabel(aa)+' ⇄ '+roleLabel(ta)+' (có hiệu lực từ đầu đêm kế tiếp, cấp lại lượt dùng mới).'};
    }
    case 'artifact_35':
      return {ok:true,changes:[{kind:'shield',loginId:t0,type:'effect_notice',extra:{actionIdOverride:'action_protect',forceActive:true,nightOverride:Number(day)+1,rowMessage:'Khiên Bảo Hộ: được bảo vệ khỏi Sói Cắn đêm kế tiếp.'}}],
        message:'Khiên Bảo Hộ: mục tiêu được bảo vệ khỏi Sói Cắn đêm kế tiếp.'};
    case 'artifact_13':{
      if(!aa)return fail('ACTOR_NOT_FOUND','Không tìm thấy Vai Trò chủ sở hữu.');
      return {ok:true,changes:[{kind:'public_role',loginId:actor,type:'effect_notice',extra:{publicReveal:true,revealedRoleName:roleLabel(aa),rowMessage:'Đồng Xu Tuổi Trẻ: chủ sở hữu công bố Vai Trò thật là '+roleLabel(aa)+'.'}}],
        message:'Đồng Xu Tuổi Trẻ: đã công bố Vai Trò thật của chủ.'};
    }
    case 'artifact_04':
      return {ok:true,changes:[{kind:'status',loginId:t0,type:'status',statusId:'infected',extra:{actionIdOverride:'artifact-plague-infect'}}],
        message:'Máu Dịch Bệnh: mục tiêu bị nhiễm bệnh. Nếu Sói Cắn chết người này, Bầy Sói mất lượt Cắn đêm sau.'};
    case 'artifact_28':{
      if(ts.length!==3||new Set(ts).size!==3)return fail('PRISM_NEEDS_THREE','Cần đúng ba người khác nhau; chưa trừ lượt.');
      return {ok:true,changes:[{kind:'prism',loginId:actor,type:'effect_notice',extra:{actionIdOverride:'artifact-prism-limit',forceActive:true,prismTargets:ts,appliesNight:Number(day)+1}}],
        message:'Lăng Kính Quyền Năng: đêm kế tiếp Sói chỉ được Cắn trong ba người đã chỉ định.'};
    }
    case 'artifact_30':case 'artifact_33':{
      if(!isDead(interactions,matchId,actor))return fail('OWNER_NOT_DEAD','Chủ sở hữu chưa chết; chưa trừ lượt.');
      return {ok:true,revive:[actor],changes:[],message:(artifactId==='artifact_30'?'Trượng Luân Hồi':'Quyền Trượng Phục Sinh')+': chủ sở hữu hồi sinh, giữ nguyên Vai Trò.'};
    }
    case 'artifact_41':
      return {ok:true,changes:[{kind:'judge',loginId:actor,type:'effect_notice',extra:{actionIdOverride:'action-judge-double'}}],message:'Bùa Tai Ương: sau phiên Treo Cổ đầu sẽ có thêm một phiên.',needsGallowsBeforeFirst:true};
    default:return null;
  }
}

/* ---- Đợt B: Artifact cần kho dữ liệu (chọn lá mới, đổi chủ, hàng xóm) ---- */
/* Artifact chưa phát = có trong kho cấu hình nhưng chưa từng gán/phát trong ván. */
export function unissuedArtifactIds({catalogIds=[],assignments=[],issued=[]}={}){
  const taken=new Set([...list(assignments).map(a=>String(a?.artifactId||'')),...list(issued).map(String)].filter(Boolean));
  return [...new Set(list(catalogIds).map(String))].filter(id=>id&&!taken.has(id)).sort();
}
export function pickRandom(ids,rng=Math.random){const a=list(ids);return a.length?a[Math.min(a.length-1,Math.floor(rng()*a.length))]:null}
/* Hàng xóm: hai người còn sống sát chỗ ngồi (trái/phải, vòng tròn). */
export function aliveNeighbors({players={},interactions=[],matchId='',actorId=''}={}){
  const me=login(actorId),seated=Object.values(players).filter(p=>p&&p.kind==='member'&&login(p.loginId)&&Number(p.seatId)>0)
    .map(p=>({id:login(p.loginId),seat:Number(p.seatId)})).filter(p=>p.id===me||!isDead(interactions,matchId,p.id)&&!list(interactions).some(r=>same(r,matchId)&&r.type==='expelled'&&live(r)&&login(r.loginId)===p.id))
    .sort((a,b)=>a.seat-b.seat);
  const i=seated.findIndex(p=>p.id===me);if(i<0||seated.length<3)return {left:null,right:null};
  return {left:seated[(i-1+seated.length)%seated.length].id,right:seated[(i+1)%seated.length].id};
}
export const awakeLastNight=({usage=[],matchId='',night=1,loginId=''}={})=>list(usage).some(u=>String(u?.matchId||'')===String(matchId)&&u.undone!==true&&Number(u.night)===Number(night)&&login(u.actorId)===login(loginId));
export const needsStorageArtifact=id=>['artifact_01','artifact_03','artifact_10','artifact_16','artifact_17','artifact_25','artifact_31','artifact_32'].includes(String(id));

/* ---- Đợt C: Sói / bình minh ---- */
const nrow=(id,type,loginId,matchId,night,cycleKey,now,actionId,message,extra={})=>({id,type,loginId,actorId:loginId,matchId:String(matchId),night:Number(night),cycleKey:String(cycleKey),
  effectActive:true,actionId,source:'artifact-rules',createdAt:now,message,...extra});
/* Bình minh: Khăn Nguyền Rủa (Cắn → thành Sói thay vì chết, 1 lần) và Máu Dịch Bệnh (người nhiễm bị Cắn chết → Sói mất lượt Cắn đêm sau). */
export function artifactBiteDawn({assignments=[],interactions=[],matchId='',night=1,cycleKey='',victims=[],now=''}={}){
  const rows=list(interactions),out=[],remaining=[];
  for(const v of list(victims)){
    const id=login(v),a=list(assignments).find(x=>login(x?.loginId)===id);
    const cursedUsed=rows.some(r=>same(r,matchId)&&r.actionId==='artifact-curse-convert'&&live(r)&&login(r.loginId)===id)||out.some(r=>r.actionId==='artifact-curse-convert'&&login(r.loginId)===id);
    if(String(a?.artifactId||'')==='artifact_37'&&!cursedUsed){
      out.push(nrow('artifact-curse:'+matchId+':'+night+':'+id,'effect_notice',id,matchId,night,cycleKey,now,'artifact-curse-convert','Khăn Choàng Nguyền Rủa: bạn bị Sói Cắn nhưng không chết, từ đêm sau bạn là Sói.'));
      continue;
    }
    remaining.push(v);
    const infected=rows.some(r=>same(r,matchId)&&r.actionId==='artifact-plague-infect'&&live(r)&&login(r.loginId)===id);
    if(infected&&!out.some(r=>r.actionId==='artifact-plague-pack-lost'))
      out.push(nrow('artifact-plague:'+matchId+':'+night,'effect_notice',id,matchId,night,cycleKey,now,'artifact-plague-pack-lost','Máu Dịch Bệnh: Bầy Sói mất lượt Cắn đêm sau.'));
  }
  return {victims:remaining,rows:out};
}
export const plaguePackLost=({interactions=[],matchId='',night=1}={})=>list(interactions).some(r=>same(r,matchId)&&r.actionId==='artifact-plague-pack-lost'&&live(r)&&Number(r.night)+1===Number(night));
export function prismTargetsFor({interactions=[],matchId='',night=1}={}){
  const r=list(interactions).filter(x=>same(x,matchId)&&x.actionId==='artifact-prism-limit'&&live(x)&&Number(x.appliesNight)===Number(night)).pop();
  return r?list(r.prismTargets).map(login):null;
}
export const cursedWolfIds=({interactions=[],matchId='',night=1}={})=>list(interactions).filter(r=>same(r,matchId)&&r.actionId==='artifact-curse-convert'&&live(r)&&Number(r.night)<Number(night)).map(r=>login(r.loginId));

/* Đá Hoán Đổi: hoán đổi Vai Trò (kèm phe, chức năng, lượt dùng mới) ở đầu đêm kế tiếp. */
export function swapRolePlans({assignments=[],interactions=[],matchId='',night=1}={}){
  const out=[],done=new Set();
  for(const r of list(interactions)){
    if(!same(r,matchId)||r.actionId!=='artifact-swap-role'||!live(r)||Number(r.night)+1!==Number(night))continue;
    const a=login(r.actorId),b=login(r.loginId),key=a+'>'+b;
    if(done.has(key)||isDead(interactions,matchId,a)||isDead(interactions,matchId,b))continue;done.add(key);
    const A=roleOf(assignments,a),B=roleOf(assignments,b);if(!A?.roleId||!B?.roleId||A.roleId===B.roleId)continue;
    out.push({kind:'swap',actorId:a,fromRoleId:A.roleId,sourceId:b,sourceRoleId:B.roleId,night:Number(night)},
             {kind:'swap',actorId:b,fromRoleId:B.roleId,sourceId:a,sourceRoleId:A.roleId,night:Number(night)});
  }
  return out;
}
/* Vuốt Sói: vào Bầy Sói từ đêm kế tiếp, giữ chức năng gốc (chỉ đổi phe). */
export function clawWolfIds({assignments=[],interactions=[],matchId='',night=1}={}){
  return [...new Set(list(interactions).filter(r=>same(r,matchId)&&r.actionId==='action-lone-wolf-join'&&r.undone!==true&&r.noEffect!==true&&Number(r.night)<Number(night)
    &&String(roleOf(assignments,login(r.actorId))?.artifactId||'')==='artifact_11').map(r=>login(r.actorId)))];
}

/* Bùa Hộ Mệnh: người giữ bùa được bảo vệ khỏi Sói Cắn. */
export const talismanHolders=({assignments=[]}={})=>holders(assignments,'artifact_02');
