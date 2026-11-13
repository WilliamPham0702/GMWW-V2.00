// Ván mẫu: danh sách, lưu, xoá, dọn.
import { j } from "../http/responses.js";
import { normalizeLoginId } from "../../gmww-player-identity-rules.js";
import { sanitizeGameConfig } from "../../gmww-room-config-rules.js";

export class RoomGameTemplateMethods {
  async gameTemplateList(){
    const rows=await this.ctx.storage.list({prefix:"gameTemplate:"}),templates=[...rows.values()].filter(Boolean).map(x=>({id:x.id,name:x.name,playerCount:Number(x.playerCount||0),updatedAt:x.updatedAt||null,preloadedAt:x.preloadedAt||null,revision:Number(x.revision||1),source:x.source==="PLAYER"?"PLAYER":"GM"})).sort((a,b)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")));
    return j({ok:true,count:templates.length,templates});
  }
  async gameTemplateGet(id){
    id=String(id||"").trim().slice(0,120);if(!id)return j({ok:false,error:"INVALID_TEMPLATE_ID"},400);
    const rec=await this.ctx.storage.get("gameTemplate:"+id);if(!rec)return j({ok:false,error:"TEMPLATE_NOT_FOUND"},404);
    return j({ok:true,template:rec});
  }
  async removeGameTemplate(id){
    await this.ctx.storage.delete("gameTemplate:"+id);
    if(typeof this.ctx.storage.list!=='function')return;
    for(const prefix of ["gameTemplateAsset:","gameTemplateAssetMeta:","gameTemplateAssetRevision:"]){
      const rows=await this.ctx.storage.list({prefix:prefix+id+":"});
      if(rows.size)await this.ctx.storage.delete([...rows.keys()]);
    }
  }
  // Only the newest few Ván Mẫu are kept server-wide; older ones (and their artwork) are removed.
  async pruneGameTemplates(keep,protectId){
    if(typeof this.ctx.storage.list!=='function')return[];
    const rows=[...(await this.ctx.storage.list({prefix:"gameTemplate:"})).values()].filter(Boolean)
      .sort((a,b)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||""))),gone=[];
    for(const x of rows.slice(keep)){if(x.id===protectId)continue;await this.removeGameTemplate(x.id);gone.push(x.id)}
    return gone;
  }
  // A room owner saves their own Ván Mẫu: roles + timeline; role artwork is copied so it survives pruning of its source.
  async gameTemplatePlayerSave(body){
    const cfg=sanitizeGameConfig(body?.compiledConfig);if(!cfg||!cfg.roles.length)return j({ok:false,error:"INVALID_GAME_CONFIG"},400);
    const ownerLoginId=normalizeLoginId(body?.ownerLoginId||''),requested=String(body?.id||'').trim().slice(0,120),old=requested?await this.ctx.storage.get("gameTemplate:"+requested):null;
    if(!ownerLoginId)return j({ok:false,error:"TEMPLATE_OWNER_REQUIRED"},400);
    if(requested&&(!old||old.source!=="PLAYER"||normalizeLoginId(old.ownerLoginId||'')!==ownerLoginId))return j({ok:false,error:"TEMPLATE_EDIT_FORBIDDEN"},403);
    const id=requested||("player-"+Date.now().toString(36)+Math.random().toString(36).slice(2,6)),now=new Date().toISOString();
    const rec={id,name:String(cfg.name||"Ván của tôi").slice(0,120),playerCount:Number(cfg.playerCount||0),revision:Math.max(1,Number(old?.revision||0)+1),updatedAt:now,preloadedAt:now,compiledConfig:{...cfg,id},source:"PLAYER",ownerLoginId};
    await this.ctx.storage.put("gameTemplate:"+id,rec);
    for(const c of Array.isArray(body?.copyAssets)?body.copyAssets.slice(0,100):[]){
      const from=String(c?.from||"").slice(0,120),roleId=String(c?.roleId||"").slice(0,120);if(!from||!roleId)continue;
      const saved=await this.ctx.storage.get("gameTemplateAsset:"+from+":role:"+roleId);if(!saved)continue;
      const copy={...saved,revision:1};
      await this.ctx.storage.put("gameTemplateAsset:"+id+":role:"+roleId,copy);
      await this.ctx.storage.put("gameTemplateAssetRevision:"+id+":role:"+roleId+":1",copy);
      await this.ctx.storage.put("gameTemplateAssetMeta:"+id+":role:"+roleId,{revision:1,verified:true,package:copy.package});
    }
    const pruned=await this.pruneGameTemplates(5,id);
    return j({ok:true,template:{id,name:rec.name,playerCount:rec.playerCount,updatedAt:now},pruned});
  }
  async gameTemplateDelete(id){
    id=String(id||"").trim().slice(0,120);
    if(!id||id.includes("/")||id.includes(".."))return j({ok:false,error:"INVALID_TEMPLATE_ID"},400);
    const key="gameTemplate:"+id,existing=await this.ctx.storage.get(key);
    if(!existing)return j({ok:false,error:"TEMPLATE_NOT_FOUND"},404);
    await this.ctx.storage.delete(key);
    const savedAssets=typeof this.ctx.storage.list==='function'?await this.ctx.storage.list({prefix:"gameTemplateAsset:"+id+":"}):new Map();
    if(savedAssets.size)await this.ctx.storage.delete([...savedAssets.keys()]);
    return j({ok:true,deleted:true,id});
  }
  async gameTemplateUpsert(body){
    const cfg=sanitizeGameConfig(body?.gameConfig||body?.template||body);if(!cfg)return j({ok:false,error:"INVALID_GAME_CONFIG"},400);
    const id=String(body?.id||cfg.id||("template-"+Date.now().toString(36))).trim().slice(0,120),now=new Date().toISOString(),key="gameTemplate:"+id,old=await this.ctx.storage.get(key);
    const compiledConfig={...cfg,id};
    // A retry with identical configuration must preserve partially uploaded artwork packages.
    // Only an actual configuration change invalidates its previous per-revision packages.
    const unchanged=!!old?.compiledConfig&&JSON.stringify(old.compiledConfig)===JSON.stringify(compiledConfig);
    const revision=unchanged?Math.max(1,Number(old.revision||1)):Math.max(1,Number(old?.revision||0)+1);
    const rec={id,name:String(cfg.name||"Ván Mẫu").slice(0,120),playerCount:Number(cfg.playerCount||0),revision,updatedAt:now,preloadedAt:unchanged?(old.preloadedAt||now):now,compiledConfig,source:"GM_IPA"};
    await this.ctx.storage.put(key,rec);
    if(typeof this.pruneGameTemplates==="function")await this.pruneGameTemplates(5,id);
    return j({ok:true,template:rec});
  }
}
