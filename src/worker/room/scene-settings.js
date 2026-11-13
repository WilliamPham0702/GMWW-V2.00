// Cài đặt cảnh nền.
import { j } from "../http/responses.js";
import { gmwwStoredArtworkResponse, validImageDataUrl } from "../support/images.js";

export class RoomSceneSettingsMethods {
  async sceneNormalizeRecord(raw){
    const record=raw&&typeof raw==="object"?raw:{revision:0};
    const revision=Math.max(0,Math.trunc(Number(record.revision)||0));
    const output={revision,fireAnchors:record.fireAnchors||{},gallowsAnchors:record.gallowsAnchors||{},dayRevision:Math.max(0,Number(record.dayRevision)||0),nightRevision:Math.max(0,Number(record.nightRevision)||0),updatedAt:record.updatedAt||null};
    for(const key of ["day","night"]){
      if(validImageDataUrl(record[key])&&revision>0){
        await this.ctx.storage.put("globalSetting:villageSceneImage:"+revision+":"+key,record[key]);
        output[key+"Revision"]=revision;
      }
    }
    return output;
  }
  scenePublicRecord(rec){
    const revision=Math.max(0,Number(rec?.revision)||0);
    const imageRevision=key=>Math.max(0,Number(rec?.[key+"Revision"])||(validImageDataUrl(rec?.[key])?revision:0));
    const day=imageRevision("day"),night=imageRevision("night");
    return {revision,updatedAt:rec?.updatedAt||null,fireAnchors:rec?.fireAnchors||{},gallowsAnchors:rec?.gallowsAnchors||{},
      day:day?"/api/village-scene/image/day?revision="+day:null,
      night:night?"/api/village-scene/image/night?revision="+night:null};
  }
  async sceneSettingsGet(){
    const current=await this.ctx.storage.get("globalSetting:villageScene");
    const history=(await this.ctx.storage.get("globalSetting:villageSceneHistory"))||[];
    return j({ok:true,scene:this.scenePublicRecord(current),
      history:history.map(row=>({revision:Number(row?.revision)||0,updatedAt:row?.updatedAt||null}))});
  }
  async sceneSettingsImage(key,rawRevision){
    const revision=Number(rawRevision);
    if(!["day","night"].includes(key)||!Number.isSafeInteger(revision)||revision<1)return new Response("Invalid scene reference",{status:400});
    let image=await this.ctx.storage.get("globalSetting:villageSceneImage:"+revision+":"+key);
    // Read old stored scenes without changing existing user data.
    if(!image){
      const current=await this.ctx.storage.get("globalSetting:villageScene");
      const history=(await this.ctx.storage.get("globalSetting:villageSceneHistory"))||[];
      const legacy=[current,...history].find(row=>Number(row?.revision)===revision&&validImageDataUrl(row?.[key]));
      image=legacy?.[key];
    }
    return gmwwStoredArtworkResponse(image);
  }
  async scenePruneImages(keepRevision=0){
    const prefix="globalSetting:villageSceneImage:";
    const keep=keepRevision>0?new Set(["day","night"].map(key=>prefix+keepRevision+":"+key)):new Set();
    const all=await this.ctx.storage.list({prefix});
    const stale=[...all.keys()].filter(key=>!keep.has(key));
    if(stale.length)await this.ctx.storage.delete(stale);
    await this.ctx.storage.delete("globalSetting:villageSceneHistory");
  }
  async sceneSettingsPut(body){
    // Reset via the same proven authenticated PUT endpoint as Apply on iOS WebKit.
    if(body?.resetToDefault===true){
      if(body.day||body.night)return j({ok:false,error:"RESET_AND_IMAGE_CONFLICT"},400);
      return this.sceneSettingsReset();
    }
    const isImage=v=>v==null||(typeof v==="string"&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(v)&&v.length<=1800000);
    if(!body||(!body.day&&!body.night&&!body.fireAnchors&&!body.gallowsAnchors)||!isImage(body.day)||!isImage(body.night))return j({ok:false,error:"INVALID_SCENE_IMAGE"},400);
    if(body.fireAnchors&&(!Object.keys(body.fireAnchors).length||Object.entries(body.fireAnchors).some(([key,p])=>!["day","night"].includes(key)||!p||![p.x,p.y].every(v=>typeof v==="number"&&Number.isFinite(v)&&v>=0&&v<=100))))return j({ok:false,error:"INVALID_FIRE_ANCHOR"},400);
    if(body.gallowsAnchors&&(!Object.keys(body.gallowsAnchors).length||Object.entries(body.gallowsAnchors).some(([key,p])=>!["day","night"].includes(key)||!p||![p.x,p.y].every(v=>typeof v==="number"&&Number.isFinite(v)&&v>=0&&v<=100))))return j({ok:false,error:"INVALID_GALLOWS_ANCHOR"},400);
    const previousRaw=(await this.ctx.storage.get("globalSetting:villageScene"))||{revision:0};
    if(body.expectedRevision!=null&&Number(body.expectedRevision)!==Number(previousRaw.revision))return j({ok:false,error:"SCENE_CHANGED",message:"Hình nền đã thay đổi. Hãy chọn lại vị trí đống lửa."},409);
    const previous=await this.sceneNormalizeRecord(previousRaw);
    const revision=previous.revision+1;
    if((body.fireAnchors||body.gallowsAnchors)&&!body.day&&!body.night){
      // Landmark edits are metadata-only: never re-upload images, reset players,
      // or invalidate the locally cached Day/Night bitmap.
      const next={...previous,revision,updatedAt:new Date().toISOString(),
        fireAnchors:{...previous.fireAnchors,...body.fireAnchors},
        gallowsAnchors:{...previous.gallowsAnchors,...body.gallowsAnchors}};
      await this.ctx.storage.put("globalSetting:villageScene",next);
      return j({ok:true,scene:this.scenePublicRecord(next)});
    }
    const next={revision,updatedAt:new Date().toISOString(),dayRevision:0,nightRevision:0,fireAnchors:{...previous.fireAnchors},gallowsAnchors:{...previous.gallowsAnchors}};
    for(const key of ["day","night"]){
      if(body[key]){delete next.fireAnchors[key];delete next.gallowsAnchors[key];}
      if(body.fireAnchors?.[key])next.fireAnchors[key]={x:body.fireAnchors[key].x,y:body.fireAnchors[key].y};
       if(body.gallowsAnchors?.[key])next.gallowsAnchors[key]={x:body.gallowsAnchors[key].x,y:body.gallowsAnchors[key].y};
      let image=body[key];
      // A single replacement leaves the other currently applied image intact.
      if(!image){
        const oldRevision=Number(previous[key+"Revision"])||0;
        if(oldRevision)image=await this.ctx.storage.get("globalSetting:villageSceneImage:"+oldRevision+":"+key);
        if(!image&&validImageDataUrl(previousRaw[key]))image=previousRaw[key];
        if(oldRevision&&!image)return j({ok:false,error:"CURRENT_SCENE_IMAGE_MISSING_"+key.toUpperCase()},409);
      }
      if(image){
        await this.ctx.storage.put("globalSetting:villageSceneImage:"+revision+":"+key,image);
        next[key+"Revision"]=revision;
      }
    }
    await this.ctx.storage.put("globalSetting:villageScene",next);
    // Commit metadata first; obsolete versions are removed only after new images are active.
    try{await this.scenePruneImages(revision)}catch(error){console.warn("village scene prune deferred",String(error))}
    return j({ok:true,scene:this.scenePublicRecord(next)});
  }
  async sceneSettingsReset(){
    const current=(await this.ctx.storage.get("globalSetting:villageScene"))||{revision:0};
    const next={revision:Math.max(0,Number(current.revision)||0)+1,updatedAt:new Date().toISOString(),dayRevision:0,nightRevision:0};
    await this.ctx.storage.put("globalSetting:villageScene",next);
    try{await this.scenePruneImages()}catch(error){console.warn("village scene reset prune deferred",String(error))}
    return j({ok:true,scene:this.scenePublicRecord(next)});
  }
  // Backward-compatible legacy route: older clients cannot undo an Apply after
  // history is cleared, and must upgrade to use explicit Reset to default.
  async sceneSettingsRollback(){
    return j({ok:false,error:"USE_RESET_TO_DEFAULT"},409);
  }
}
