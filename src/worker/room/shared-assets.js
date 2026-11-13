// Kho ảnh dùng chung: bảo vật và tài nguyên ván mẫu.
import { j } from "../http/responses.js";
import { gmwwStoredArtworkResponse, validImageDataUrl } from "../support/images.js";
import { sanitizePlayerArtifactCard, sanitizePlayerRoleCard } from "../../gmww-private-card-contract.js";

export class RoomSharedAssetMethods {
  // Artifact artwork is a reusable server-wide catalog, never part of a template revision.
  async sharedArtifactStatus(){
    const rows=await this.ctx.storage.list({prefix:"sharedArtifactMeta:"});
    return j({ok:true,artifacts:[...rows.values()].filter(x=>x?.assetId).map(x=>({assetId:x.assetId,signature:x.signature,updatedAt:x.updatedAt,package:x.package}))});
  }
  async sharedArtifactPut(body){
    const assetId=String(body?.assetId||"").slice(0,180),signature=String(body?.signature||"");
    if(!/^artifact:[A-Za-z0-9._:-]{1,120}$/.test(assetId))return j({ok:false,error:"INVALID_ARTIFACT_ID"},400);
    if(!/^[0-9a-f]{64}$/.test(signature))return j({ok:false,error:"INVALID_ARTIFACT_SIGNATURE"},400);
    const metaKey="sharedArtifactMeta:"+assetId,existing=await this.ctx.storage.get(metaKey);
    const currentData=existing?.signature?await this.ctx.storage.get("sharedArtifactData:"+assetId):null;
    if(body?.force!==true&&existing?.signature===signature&&validImageDataUrl(currentData))
      return j({ok:true,assetId,cached:true});
    if(!validImageDataUrl(body?.imageDataUrl))return j({ok:false,error:"INVALID_ARTIFACT_ARTWORK"},400);
    // Backfill the OLD signature before overwriting a V3.70 artifact. Previously
    // saved matches refer to that version; newly edited cards must not change it.
    if(existing?.signature&&existing.signature!==signature&&validImageDataUrl(currentData)){
      const oldKey="sharedArtifactDataVersion:"+assetId+":"+existing.signature;
      if(!await this.ctx.storage.get(oldKey))await this.ctx.storage.put(oldKey,currentData);
    }
    const card=sanitizePlayerArtifactCard(body?.package?.roleCard||{}),saved={
      assetId,signature,updatedAt:new Date().toISOString(),
      package:{roleId:assetId,roleName:String(card.name||"Artifact"),artworkAssetId:assetId,
        roleCard:card}
    };
    await this.ctx.storage.put("sharedArtifactData:"+assetId,String(body.imageDataUrl));
    // Immutable per-signature reference: an ongoing match keeps its artwork
    // even when the global Artifact card is edited for a later match.
    await this.ctx.storage.put("sharedArtifactDataVersion:"+assetId+":"+signature,String(body.imageDataUrl));
    await this.ctx.storage.put(metaKey,saved);
    return j({ok:true,assetId,cached:false});
  }
  async sharedArtifactGet(rawId){
    const assetId=String(rawId||""),meta=await this.ctx.storage.get("sharedArtifactMeta:"+assetId),
      imageDataUrl=await this.ctx.storage.get("sharedArtifactData:"+assetId);
    if(!meta||!validImageDataUrl(imageDataUrl))return j({ok:false,error:"SHARED_ARTIFACT_MISSING",assetId},404);
    return j({ok:true,assetId,package:{...meta.package,imageDataUrl}});
  }
  async sharedArtifactImage(rawId,rawSignature){
    const id=String(rawId||""),signature=String(rawSignature||"");
    if(!/^artifact:[A-Za-z0-9._:-]{1,120}$/.test(id)||!/^[0-9a-f]{64}$/.test(signature))return new Response("Invalid artwork reference",{status:400});
    const current=await this.ctx.storage.get("sharedArtifactMeta:"+id);
    const snapshot=await this.ctx.storage.get("sharedArtifactDataVersion:"+id+":"+signature);
    const data=snapshot||(current?.signature===signature?await this.ctx.storage.get("sharedArtifactData:"+id):null);
    return gmwwStoredArtworkResponse(data);
  }
  // A Ván Mẫu only packages its role cards. Artifact selections remain configuration references.
  async gameTemplateAssetsStatus(rawId){
    const id=String(rawId||"").slice(0,120),rec=await this.ctx.storage.get("gameTemplate:"+id);
    if(!rec)return j({ok:false,error:"TEMPLATE_NOT_FOUND"},404);
    const cfg=rec.compiledConfig||{},assets=[...new Set((cfg.roles||[]).map(r=>"role:"+String(r.roleId||"")).filter(x=>!x.endsWith(":")))],missing=[],packages={};
    for(const assetId of assets){
      const key="gameTemplateAssetMeta:"+id+":"+assetId;
      let row=await this.ctx.storage.get(key);
      if(!row||Number(row.revision)!==Number(rec.revision)){
        // One-time migration of V3.70 packages. Subsequent selections read
        // metadata only, never megabytes of Base64 artwork per role.
        const saved=await this.ctx.storage.get("gameTemplateAsset:"+id+":"+assetId);
        if(saved&&Number(saved.revision)===Number(rec.revision)&&validImageDataUrl(saved.imageDataUrl)){
          row={revision:saved.revision,package:saved.package,verified:true};
          if(typeof this.ctx.storage.put==="function")await this.ctx.storage.put(key,row);
        }
      }
      if(!row||Number(row.revision)!==Number(rec.revision)||row.verified!==true)missing.push(assetId);
      else packages[assetId]=row.package||null;
    }
    return j({ok:true,id,revision:rec.revision,ready:assets.length>0&&missing.length===0,total:assets.length,missing,assets,packages});
  }
  async gameTemplateAssetPut(body){
    const id=String(body?.id||"").slice(0,120),assetId=String(body?.assetId||"").slice(0,180),rec=await this.ctx.storage.get("gameTemplate:"+id);
    if(!rec)return j({ok:false,error:"TEMPLATE_NOT_FOUND"},404);
    const cfg=rec.compiledConfig||{},expected=new Set((cfg.roles||[]).map(r=>"role:"+String(r.roleId||"")));
    if(!expected.has(assetId))return j({ok:false,error:"ASSET_NOT_IN_TEMPLATE"},400);
    if(!validImageDataUrl(body?.imageDataUrl))return j({ok:false,error:"ARTWORK_NOT_READY",message:"Artwork chưa được tải và tối ưu để lưu Ván Mẫu."},400);
    const pkg=body?.package||{},roleId=assetId.startsWith("artifact:")?assetId:assetId.slice(5);
    // A V3.70 template has only the mutable current package. Preserve that
    // previous revision on its FIRST edit, never on every room selection.
    const currentKey="gameTemplateAsset:"+id+":"+assetId;
    const previous=await this.ctx.storage.get(currentKey);
    if(previous&&Number(previous.revision)!==Number(rec.revision)&&validImageDataUrl(previous.imageDataUrl)){
      const oldKey="gameTemplateAssetRevision:"+id+":"+assetId+":"+previous.revision;
      if(!await this.ctx.storage.get(oldKey))await this.ctx.storage.put(oldKey,previous);
    }
    const saved={revision:rec.revision,imageDataUrl:body.imageDataUrl,package:{roleId,roleName:String(pkg.roleName||"").slice(0,120),artworkAssetId:assetId,roleCard:sanitizePlayerRoleCard(pkg.roleCard||{}),faction:String(pkg.faction||"").slice(0,120),description:String(pkg.description||"").slice(0,6000)},updatedAt:new Date().toISOString()};
    await this.ctx.storage.put(currentKey,saved);
    // Keep an immutable-per-revision copy for a match referencing an older
    // version of this template. Do not copy it into each room.
    await this.ctx.storage.put("gameTemplateAssetRevision:"+id+":"+assetId+":"+rec.revision,saved);
    await this.ctx.storage.put("gameTemplateAssetMeta:"+id+":"+assetId,{revision:rec.revision,verified:true,package:saved.package});
    return j({ok:true,id,assetId,revision:rec.revision,hasImage:true});
  }
  async gameTemplateAssetGet(rawId,rawAsset){
    const id=String(rawId||"").slice(0,120),assetId=String(rawAsset||"").slice(0,180),rec=await this.ctx.storage.get("gameTemplate:"+id),saved=await this.ctx.storage.get("gameTemplateAsset:"+id+":"+assetId);
    if(!rec||!saved||Number(saved.revision)!==Number(rec.revision)||!validImageDataUrl(saved.imageDataUrl))return j({ok:false,error:"TEMPLATE_ARTWORK_MISSING"},404);
    return j({ok:true,id,assetId,package:{...saved.package,imageDataUrl:saved.imageDataUrl}});
  }
  async gameTemplateAssetImage(rawId,rawAsset,rawRevision){
    const id=String(rawId||"").slice(0,120),assetId=String(rawAsset||"").slice(0,180),revision=Number(rawRevision);
    if(!id||!/^role:[A-Za-z0-9._:-]{1,120}$/.test(assetId)||!Number.isSafeInteger(revision)||revision<1)return new Response("Invalid template artwork reference",{status:400});
    const snapshot=await this.ctx.storage.get("gameTemplateAssetRevision:"+id+":"+assetId+":"+revision);
    const rec=await this.ctx.storage.get("gameTemplate:"+id);
    const saved=snapshot||(Number(rec?.revision)===revision?await this.ctx.storage.get("gameTemplateAsset:"+id+":"+assetId):null);
    if(!saved||Number(saved.revision)!==revision)return new Response("Template artwork revision missing",{status:404,headers:{"cache-control":"no-store"}});
    return gmwwStoredArtworkResponse(saved.imageDataUrl);
  }
}
