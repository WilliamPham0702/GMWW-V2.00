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
    case 'artifact_41':
      return {ok:true,changes:[{kind:'judge',loginId:actor,type:'effect_notice',extra:{actionIdOverride:'action-judge-double'}}],message:'Bùa Tai Ương: sau phiên Treo Cổ đầu sẽ có thêm một phiên.',needsGallowsBeforeFirst:true};
    default:return null;
  }
}
