// Avatar tuỳ chỉnh của thành viên.
import { j } from "../http/responses.js";
import { GMWW_MEMBER_AVATAR_IDS } from "../../gmww-avatars.js";
import { normalizeGameCharacterId } from "../../gmww-player-identity-rules.js";

export class RoomAvatarMethods {
  async customAvatarCatalog(){
    const rows=await this.ctx.storage.list({prefix:"customAvatar:"}),avatars=[];
    for(const v of rows.values()){
      if(!v||typeof v!=="object"||!v.id)continue;
      avatars.push({id:String(v.id),name:String(v.name||v.id),digest:String(v.digest||""),priority:Number(v.priority||0),source:String(v.source||"role-card"),updatedAt:v.updatedAt||null});
    }
    avatars.sort((a,b)=>(Number(b.priority||0)-Number(a.priority||0))||String(b.updatedAt||"").localeCompare(String(a.updatedAt||""))||String(a.name||"").localeCompare(String(b.name||""),"vi"));
    return j({ok:true,count:avatars.length,avatars});
  }
  async customAvatarUpsert(body){
    const id=String(body?.id||"").trim(),name=String(body?.name||id).trim().slice(0,120),img=String(body?.img||""),digest=String(body?.digest||"").trim().slice(0,128),priority=Math.max(-100000,Math.min(100000,Number(body?.priority||0))),source=String(body?.source||"role-card").slice(0,60);
    if(!/^[A-Za-z0-9._-]{3,120}$/.test(id))return j({ok:false,error:"INVALID_AVATAR_ID"},400);
    if(!/^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(img)||img.length>110000)return j({ok:false,error:"INVALID_AVATAR_IMAGE",message:"Avatar phải là WEBP/PNG/JPEG và không vượt quá giới hạn Kho Avatar."},400);
    const old=await this.ctx.storage.get("customAvatar:"+id);
    if(old&&digest&&String(old.digest||"")===digest){
      return j({ok:true,unchanged:true,avatar:{id,name:String(old.name||name),digest,priority:Number(old.priority||priority),source:String(old.source||source),updatedAt:old.updatedAt||null}});
    }
    const rec={id,name,img,digest,priority,source,updatedAt:new Date().toISOString()};
    await this.ctx.storage.put("customAvatar:"+id,rec);
    return j({ok:true,avatar:{id,name,digest,priority,source,updatedAt:rec.updatedAt}});
  }
  async customAvatarImage(id){
    id=String(id||"").trim();
    if(!/^[A-Za-z0-9._-]{3,120}$/.test(id))return new Response("Not found",{status:404});
    const a=await this.ctx.storage.get("customAvatar:"+id);if(!a?.img)return new Response("Not found",{status:404});
    const m=String(a.img).match(/^data:(image\/(?:webp|png|jpeg));base64,(.+)$/);if(!m)return new Response("Invalid asset",{status:500});
    const bin=atob(m[2]);return new Response(Uint8Array.from(bin,c=>c.charCodeAt(0)),{headers:{"content-type":m[1],"cache-control":"public, max-age=3600","x-content-type-options":"nosniff"}});
  }
  async validMemberAvatar(id){
    id=String(id||"").trim();if(normalizeGameCharacterId(id))return true;if(GMWW_MEMBER_AVATAR_IDS.has(id))return true;
    if(!/^[A-Za-z0-9._-]{3,120}$/.test(id))return false;
    return !!(await this.ctx.storage.get("customAvatar:"+id));
  }
}
