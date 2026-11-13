// Bảo vật: lật, phát mới, kế hoạch lưu trữ.
import { aliveNeighbors, awakeLastNight, pickRandom, unissuedArtifactIds } from "../../gmww-artifact-rules.js";
import { buildMirrorLink, insertMirrorSteps, mirrorFunctions, mirrorLinkKey } from "../../gmww-mirror-rules.js";
import { normalizeLoginId } from "../../gmww-player-identity-rules.js";
import { sanitizePlayerArtifactCard } from "../../gmww-private-card-contract.js";
import { publicRoom } from "../../gmww-public-room-contract.js";

export class RoomArtifactMethods {
  /* V3.148: server-authoritative day powers. No night turn is forged to
   * bypass the phase gate. Every function must be explicitly tagged day/any. */
  /* Đợt B: Artifact đổi chủ / phát lá mới / hàng xóm. Kiểm tra trước, chỉ ghi khi đã hợp lệ. */
  async artifactUnflipped(loginId){
    const art=loginId?await this.ctx.storage.get("artifact:"+loginId):null;
    if(!art||art.removedFromMatch===true||art.usedAt)return null;
    if(await this.ctx.storage.get("artifactUse:"+loginId+":"+String(art.artifactId)))return null;
    return art;
  }
  async artifactPickNew(matchId,assignments){
    const keys=[...(await this.ctx.storage.list({prefix:"roleCatalog:artifact:"})).keys()].map(k=>k.slice("roleCatalog:artifact:".length));
    const issued=(await this.ctx.storage.get("artifactIssued:"+matchId))||[];
    const id=pickRandom(unissuedArtifactIds({catalogIds:keys,assignments,issued}));
    if(!id)return null;
    const rec=await this.ctx.storage.get("roleCatalog:artifact:"+id);
    return {id,rec,card:sanitizePlayerArtifactCard(rec?.roleCard||{}),issued};
  }
  async artifactIssue(loginId,pick,meta,matchId,assignments){
    const {id,card,rec}=pick,aid=String(rec?.artworkAssetId||card.artworkAssetId||("artifact:"+id));
    const art={loginId,matchId,matchRevision:Number(meta.matchRevision||0),artifactId:id,artifactName:String(card.name||rec?.roleName||"Artifact").slice(0,120),
      description:String(card.information||"").slice(0,6000),artifactImage:"/api/rooms/"+encodeURIComponent(meta.code)+"/role-assets/"+encodeURIComponent(aid)+"/image",
      artworkAssetId:aid,artworkId:aid,artworkAvailable:true,artifactCard:{...card,artworkAssetId:aid,artworkId:aid},
      singleUse:card.singleUse===true,priorityFirst:card.priorityFirst===true,deliveredAt:new Date().toISOString(),viewedAt:null,usedAt:null};
    await this.ctx.storage.put("artifact:"+loginId,art);
    await this.ctx.storage.delete("artifactUse:"+loginId+":"+id);
    const row=assignments.find(x=>normalizeLoginId(x?.loginId)===loginId);
    if(row){row.artifactId=id;row.artifactName=art.artifactName;row.artifactUsedAt=null;row.artifactViewedAt=null;row.artifactSingleUse=art.singleUse;row.artifactPriorityFirst=art.priorityFirst}
    await this.ctx.storage.put("assignments",assignments);
    pick.issued=[...pick.issued,id];await this.ctx.storage.put("artifactIssued:"+matchId,pick.issued);
    return art;
  }
  async artifactStoragePlan({artifactId,actorId,targetId,targets=[],meta,matchId,day,assignments,interactions,members,requestFlip}){
    const bad=(error,message)=>({ok:false,error,message});
    const noPool=()=>bad("NO_UNISSUED_ARTIFACT","Không còn Artifact chưa phát; không thay đổi, chưa trừ lượt.");
    if(artifactId==="artifact_16"){
      const players=await this.ctx.storage.get("players")||{},usage=(await this.ctx.storage.get("battleRoleUsage:"+matchId))||[];
      const nb=aliveNeighbors({players,interactions,matchId,actorId});
      if(!nb.left||!nb.right)return bad("NO_NEIGHBORS","Không xác định được hai hàng xóm; chưa trừ lượt.");
      const awake=id=>awakeLastNight({usage,matchId,night:day,loginId:id}),name=id=>members["member:"+id]?.displayName||id,L=awake(nb.left),R=awake(nb.right);
      return {ok:true,changes:[],message:"Nhật Ký Mất Ngủ: "+name(nb.left)+(L?" ĐÃ thức":" KHÔNG thức")+"; "+name(nb.right)+(R?" ĐÃ thức":" KHÔNG thức")+" đêm trước.",result:{left:{id:nb.left,awake:L},right:{id:nb.right,awake:R}}};
    }
    if(artifactId==="artifact_10"){
      const pick=await this.artifactPickNew(matchId,assignments);if(!pick)return noPool();
      const art=await this.artifactIssue(actorId,pick,meta,matchId,assignments);
      return {ok:true,replacedOwn:true,changes:[],message:"Ngọc May Mắn: chủ nhận Artifact mới ("+art.artifactName+").",result:{newArtifactId:art.artifactId}};
    }
    if(artifactId==="artifact_23"){
      // Tráng Gương: copy the ACTIVE functions of the target's role. The owner is woken again after
      // that role's turn (this night if it is still ahead, and every later night). Own role card untouched.
      if(!targetId)return bad("TARGET_REQUIRED","Cần một mục tiêu.");
      if(targetId===actorId)return bad("MIRROR_SELF","Không thể sao chép chính mình; chưa trừ lượt.");
      const linkKey=mirrorLinkKey(matchId,actorId);
      if(await this.ctx.storage.get(linkKey))return bad("ALREADY_LINKED","Tráng Gương đã sao chép một vai trò; chưa trừ lượt.");
      const roles=(await this.ctx.storage.get("roles:"+targetId))||[],tr=(Array.isArray(roles)?roles:[]).find(r=>r&&(!r.matchId||String(r.matchId)===String(matchId)))||roles[0];
      if(!tr)return bad("ROLE_NOT_FOUND","Không tìm thấy Vai Trò; chưa trừ lượt.");
      if(!mirrorFunctions(tr.roleCard).length)return bad("NOTHING_TO_COPY","Mục tiêu không có chức năng chủ động để sao chép; chưa trừ lượt.");
      const now=new Date().toISOString(),link=buildMirrorLink({matchId,ownerId:actorId,targetId,role:tr,night:day,now});
      await this.ctx.storage.put(linkKey,link);
      if(String(meta.cyclePhase||"").toLowerCase()==="night"){
        const rt=await this.getNightRuntime(meta,day,false);
        if(rt&&!rt.completed){
          const cfg=(await this.ctx.storage.get("gameConfig"))||{},fallback=Math.max(0,Number(cfg?.timing?.defaultActionSec??45)||0),
            durations=new Map((Array.isArray(cfg.roles)?cfg.roles:[]).map(r=>[String(r?.roleId||""),Math.max(0,Number(r?.actionDurationSec??fallback)||0)]));
          if(insertMirrorSteps(rt.queue,[link],{minIndex:rt.cursor+1,durationFor:id=>durations.get(String(id))??fallback})){
            rt.updatedAt=now;await this.ctx.storage.put(this.nightRuntimeKey(meta,day),rt);
            this.broadcast({type:"night_turn",night:day,runtime:rt,source:"mirror",room:publicRoom(meta),serverTime:Date.now()});
          }
        }
      }
      return {ok:true,changes:[],message:"Tráng Gương: đã sao chép "+link.roleName+" ("+link.roleCard.functions.length+" chức năng). Bạn được gọi lại sau lượt "+link.roleName+" mỗi đêm.",result:{copiedRoleId:link.roleId,copied:link.roleCard.functions.map(f=>f.actionId||f.id)}};
    }
    if(artifactId==="artifact_31"){
      if(targets.length!==2)return bad("RUBY_NEEDS_TWO","Cần đúng hai người; chưa trừ lượt.");
      const arts=[];for(const id of targets){const a=await this.artifactUnflipped(id);if(!a)return bad("TARGET_ARTIFACT_NOT_ELIGIBLE","Cả hai phải có Artifact chưa lật; chưa trừ lượt.");arts.push(a)}
      return {ok:true,changes:targets.map((id,i)=>({kind:"ruby_turn",loginId:id,type:"effect_notice",extra:{rowMessage:"Hồng Ngọc Cơ Duyên: bạn là người thứ "+(i+1)+" lật và dùng Artifact của mình."}})),
        message:"Hồng Ngọc Cơ Duyên: lần lượt "+arts.map(a=>a.artifactName).join(" → ")+" (GM giải quyết theo thứ tự).",result:{order:targets}};
    }
    if(!targetId)return bad("TARGET_REQUIRED","Cần một mục tiêu.");
    if(artifactId==="artifact_01"){
      const t=await this.ctx.storage.get("artifact:"+targetId);
      const used=t&&t.removedFromMatch!==true&&t.singleUse===true&&(!!t.usedAt||!!(await this.ctx.storage.get("artifactUse:"+targetId+":"+String(t.artifactId))));
      if(!used)return bad("TARGET_ARTIFACT_NOT_USED","Mục tiêu không có Artifact một lần đã sử dụng; chưa trừ lượt.");
      const pick=await this.artifactPickNew(matchId,assignments);if(!pick)return noPool();
      const art=await this.artifactIssue(targetId,pick,meta,matchId,assignments);
      return {ok:true,changes:[],message:"Hổ Phách Bình Minh: thu hồi Artifact đã dùng và phát lá mới cho mục tiêu.",result:{newArtifactId:art.artifactId}};
    }
    if(artifactId==="artifact_32"){
      const t=await this.ctx.storage.get("artifact:"+targetId);
      if(!t||t.removedFromMatch===true)return bad("TARGET_NO_ARTIFACT","Mục tiêu không có Artifact để sao chép; chưa trừ lượt.");
      if(await this.ctx.storage.get("artifactLinked:"+actorId))return bad("ALREADY_LINKED","Đã sao chép một Artifact; chưa trừ lượt.");
      await this.ctx.storage.put("artifactLinked:"+actorId,{...t,loginId:actorId,usedAt:null,viewedAt:null,linkedFromLoginId:targetId});
      await this.ctx.storage.delete("artifactUse:"+actorId+":"+String(t.artifactId));
      return {ok:true,changes:[],message:"Lam Ngọc Định Mệnh: chủ nhận bản sao "+t.artifactName+" (dùng riêng một lần).",result:{linkedArtifactId:t.artifactId}};
    }
    const target=await this.artifactUnflipped(targetId);
    if(!target)return bad("TARGET_ARTIFACT_NOT_ELIGIBLE","Mục tiêu không có Artifact chưa lật; chưa trừ lượt.");
    if(artifactId==="artifact_03"){
      const changes=requestFlip?[{kind:"flip_request",loginId:targetId,type:"effect_notice",extra:{rowMessage:"Thạch Anh Tri Thức: bạn được yêu cầu lật Artifact của mình."}}]:[];
      return {ok:true,changes,message:"Artifact chưa lật của mục tiêu: "+target.artifactName+(requestFlip?" (đã yêu cầu chủ lật).":"."),result:{artifactId:target.artifactId,artifactName:target.artifactName}};
    }
    if(artifactId==="artifact_25")
      return {ok:true,changes:[{kind:"remove_artifact",loginId:targetId,artifactId:String(target.artifactId)}],message:"Hắc Ngọc Hủy Diệt: đã loại bí mật Artifact chưa lật của mục tiêu."};
    if(artifactId==="artifact_17"){
      const pick=await this.artifactPickNew(matchId,assignments);if(!pick)return noPool();
      await this.ctx.storage.put("artifact:"+actorId,{...target,loginId:actorId,usedAt:null,viewedAt:null});
      const mine=assignments.find(x=>normalizeLoginId(x?.loginId)===actorId);
      if(mine){mine.artifactId=target.artifactId;mine.artifactName=target.artifactName;mine.artifactUsedAt=null;mine.artifactViewedAt=null;mine.artifactSingleUse=target.singleUse===true}
      await this.artifactIssue(targetId,pick,meta,matchId,assignments);
      return {ok:true,replacedOwn:true,changes:[],message:"Ngọc Ghen Tuông: chủ lấy Artifact chưa lật của mục tiêu; mục tiêu nhận lá mới.",result:{stolenArtifactId:target.artifactId}};
    }
    return bad("UNKNOWN","Artifact không hỗ trợ.");
  }
}
