// Ảnh lá vai và manifest artwork.
import { MEMBER_STORE_NAME } from "../config.js";
import { j } from "../http/responses.js";
import { extractRoleImage } from "../support/images.js";
import { sanitizePlayerArtifactCard, sanitizePlayerRoleCard } from "../../gmww-private-card-contract.js";

export class RoomRoleArtworkMethods {
  async gmRoleAssets(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,rows=Array.isArray(body?.roles)?body.roles:[];
    if(!rows.length)return j({ok:false,error:"NO_ROLE_PACKAGES",message:"Chưa có gói dữ liệu Vai Trò."},400);
    const stored=[];
    for(const raw of rows){
      const roleId=String(raw?.roleId||raw?.id||"").slice(0,120);if(!roleId)continue;
      const roleCard=roleId.startsWith("artifact:")?sanitizePlayerArtifactCard(raw?.roleCard||raw):sanitizePlayerRoleCard(raw?.roleCard||raw),artworkAssetId=String(raw?.artworkAssetId||raw?.artworkId||roleCard.artworkAssetId||roleCard.artworkId||("role:"+roleId)).slice(0,180),roleImage=extractRoleImage(raw);
      if(roleImage){await this.ctx.storage.put("artworkAsset:"+artworkAssetId,roleImage);await this.ctx.storage.put("roleAsset:"+roleId,roleImage)}
      const normalizedCard={...roleCard,artworkAssetId,artworkId:artworkAssetId};
      await this.ctx.storage.put("roleCatalog:"+roleId,{roleId,roleName:normalizedCard.name||String(raw?.roleName||raw?.name||"Vai Trò"),faction:normalizedCard.faction??raw?.faction??"",description:normalizedCard.information??raw?.description??"",artworkAssetId,artworkId:artworkAssetId,roleCard:normalizedCard,updatedAt:new Date().toISOString()});
      stored.push({roleId,hasImage:!!roleImage,artworkAssetId,roleName:normalizedCard.name||String(raw?.roleName||raw?.name||"Vai Trò")});
    }
    meta.updatedAt=new Date().toISOString();await this.ctx.storage.put("meta",meta);
    return j({ok:true,count:stored.length,roles:stored});
  }
  async gmArtworkRefs(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const kind=String(body?.kind||""),refs=Array.isArray(body?.refs)?body.refs:[];
    if(!["template","artifact"].includes(kind)||!refs.length||refs.length>(kind==="artifact"?100:30))return j({ok:false,error:"INVALID_ARTWORK_REFERENCES",message:"Một ván cho phép tối đa 100 Artifact hoặc 30 Vai Trò."},400);
    const clean=[],seen=new Set();
    for(const raw of refs){
      const assetId=String(raw?.assetId||""),roleId=String(raw?.roleId||"");
      if(!/^(role|artifact):[A-Za-z0-9._:-]{1,120}$/.test(assetId)||!roleId||seen.has(assetId)||assetId!==((kind==="template"?"role:":"artifact:")+roleId))return j({ok:false,error:"INVALID_ARTWORK_REFERENCE",assetId},400);
      const reference=kind==="template"?{kind,assetId,templateId:String(raw?.templateId||""),revision:Number(raw?.revision)}:{kind,assetId,signature:String(raw?.signature||"")};
      if(kind==="template"&&(!reference.templateId||!Number.isSafeInteger(reference.revision)||reference.revision<1))return j({ok:false,error:"INVALID_TEMPLATE_REFERENCE"},400);
      if(kind==="artifact"&&!/^[0-9a-f]{64}$/.test(reference.signature))return j({ok:false,error:"INVALID_ARTIFACT_REFERENCE"},400);
      seen.add(assetId);clean.push({assetId,roleId,reference,raw});
    }
    // New clients link a complete template in one atomic logical batch.
    // Legacy V3.70 clients submit one role per request: merge only when the
    // template ID and revision match, without retaining an earlier match.
    if(kind==="template"){
      const scope=clean[0].reference.templateId+"@"+clean[0].reference.revision;
      if(clean.some(x=>x.reference.templateId+"@"+x.reference.revision!==scope))
        return j({ok:false,error:"MIXED_TEMPLATE_REVISIONS"},400);
      const merge=body?.merge===true&&(await this.ctx.storage.get("gmArtworkTemplateScope"))===scope;
      if(!merge){
        const prior=await this.ctx.storage.list({prefix:"artworkRef:"});
        if(prior.size)await this.ctx.storage.delete([...prior.keys()]);
      }
      const active=merge?(await this.ctx.storage.get("gmArtworkActiveIds"))||[]:[];
      await this.ctx.storage.put("gmArtworkTemplateScope",scope);
      await this.ctx.storage.put("gmArtworkActiveIds",[...new Set([...active,...clean.map(x=>x.assetId)])]);
    }else{
      const prior=(await this.ctx.storage.get("gmArtworkActiveIds"))||[];
      await this.ctx.storage.put("gmArtworkActiveIds",[...new Set([...prior,...clean.map(x=>x.assetId)])]);
    }
    // Group the metadata writes. 44 Artifact used to require 88 sequential
    // Durable Object writes per game; each 50-card chunk now uses one batch.
    for(let offset=0;offset<clean.length;offset+=50){
      const records={};
      for(const item of clean.slice(offset,offset+50)){
        const {assetId,roleId,reference,raw}=item;
        const roleCard=kind==="artifact"?sanitizePlayerArtifactCard(raw.roleCard||{}):sanitizePlayerRoleCard(raw.roleCard||{});
        records["artworkRef:"+assetId]=reference;
        records["roleCatalog:"+(kind==="artifact"?assetId:roleId)]={roleId:kind==="artifact"?assetId:roleId,roleName:String(roleCard.name||raw.roleName||""),faction:roleCard.faction||raw.faction||"",description:roleCard.information||raw.description||"",artworkAssetId:assetId,artworkId:assetId,roleCard,updatedAt:new Date().toISOString()};
      }
      await this.ctx.storage.put(records);
    }
    return j({ok:true,ready:true,mode:"reference",count:clean.length,assetIds:clean.map(x=>x.assetId)});
  }
  async gmArtworkManifest(request){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const active=await this.ctx.storage.get("gmArtworkActiveIds");
    if(Array.isArray(active))return j({ok:true,count:active.length,assetIds:active,mode:"reference"});
    const rows=await this.ctx.storage.list({prefix:"artworkAsset:"}),assetIds=[...rows.keys()].map(k=>String(k).slice("artworkAsset:".length));
    return j({ok:true,count:assetIds.length,assetIds,mode:"legacy"});
  }
  async roleAssetImage(roleId){
    // Artwork is preloaded privately during setup but MUST remain unavailable to Player Web until Phát Vai.
    const meta=await this.ctx.storage.get('meta');
    if(!['role_delivery','running','started','game','playing'].includes(String(meta?.phase||'').toLowerCase()))return new Response('Artwork is not released',{status:404,headers:{'cache-control':'no-store'}});
    const rid=String(roleId||"");
    const active=await this.ctx.storage.get("gmArtworkActiveIds");
    if(Array.isArray(active)&&!active.includes(rid))return new Response("Artwork not assigned to this match",{status:404,headers:{"cache-control":"no-store"}});
    const ref=await this.ctx.storage.get("artworkRef:"+rid);
    if(ref){
      const p=new URLSearchParams({assetId:rid});
      let endpoint="";
      if(ref.kind==="template"){p.set("id",ref.templateId);p.set("revision",String(ref.revision));endpoint="/game-templates/assets/image"}
      else if(ref.kind==="artifact"){p.set("signature",ref.signature);endpoint="/artifacts/shared/image"}
      else return new Response("Invalid artwork reference",{status:404});
      try{
        const store=this.env.ROOMS.get(this.env.ROOMS.idFromName(MEMBER_STORE_NAME));
        const asset=await store.fetch("https://member.internal"+endpoint+"?"+p);
        if(!asset.ok)return new Response("Referenced artwork unavailable",{status:asset.status===400?400:404,headers:{"cache-control":"no-store","x-gmww-artwork-state":"missing"}});
        return new Response(asset.body,{status:200,headers:{"content-type":asset.headers.get("content-type")||"image/webp","cache-control":"private, max-age=3600","x-content-type-options":"nosniff","x-gmww-artwork-asset":rid}});
      }catch{return new Response("Artwork reference temporarily unavailable",{status:503,headers:{"cache-control":"no-store"}})}
    }
    if(Array.isArray(active))return new Response("Referenced artwork missing",{status:404,headers:{"cache-control":"no-store"}});
    const direct=await this.ctx.storage.get("artworkAsset:"+rid);
    const pkg=(await this.ctx.storage.get("roleCatalog:"+rid))||{},assetId=String(pkg.artworkAssetId||pkg.artworkId||rid||("role:"+rid));
    const primary=direct||await this.ctx.storage.get("artworkAsset:"+assetId),legacy=await this.ctx.storage.get("roleAsset:"+rid),src=primary||legacy;
    if(!src)return new Response("Role artwork not found",{status:404,headers:{"cache-control":"no-store","x-gmww-artwork-state":"missing"}});
    if(/^https:\/\//i.test(src))return Response.redirect(src,302);
    const m=String(src).match(/^data:(image\/(?:webp|png|jpeg));base64,(.+)$/i);if(!m)return new Response("Invalid role artwork",{status:500});
    try{const bin=atob(m[2]);return new Response(Uint8Array.from(bin,c=>c.charCodeAt(0)),{headers:{"content-type":m[1],"cache-control":"private, max-age=3600","x-content-type-options":"nosniff","x-gmww-artwork-asset":assetId}})}catch{return new Response("Invalid role artwork",{status:500})}
  }
}
