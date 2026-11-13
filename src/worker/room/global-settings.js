// Cài đặt toàn hệ thống: UI, đồng bộ web, log lỗi client, hiện diện GM, tài nguyên chung.
import { GM_PRESENCE_TTL, VERSION } from "../config.js";
import { j } from "../http/responses.js";
import { randomToken } from "../support/crypto.js";
import { isValidRoomCode, normalizeRoomCode, publicGmPresence } from "../support/room-access.js";
import { villageLayout } from "../support/village-layout.js";
import { appendClientError, formatClientErrorReport, normalizeClientError } from "../../gmww-client-error-log.js";
import { shouldSkipGmHeartbeat } from "../../gmww-do-write-optimizer.js";
import { normalizeCharacterScale } from "../../gmww-player-identity-rules.js";

export class RoomGlobalSettingsMethods {
  async globalUiSettingsGet(){
    const rec=await this.ctx.storage.get("globalSetting:ui"),raw=Number(rec?.characterScale),characterScale=normalizeCharacterScale(raw,100);
    const actionIconScale=[25,50,75,100,125,150].includes(Number(rec?.actionIconScale))?Number(rec.actionIconScale):100;
    return j({ok:true,characterScale,actionIconScale,backgroundDim:0,updatedAt:rec?.updatedAt||null});
  }
  async globalUiSettingsPut(body){
    const hasCharacter=Object.prototype.hasOwnProperty.call(body||{},"characterScale"),
      hasIcon=Object.prototype.hasOwnProperty.call(body||{},"actionIconScale");
    if(!hasCharacter&&!hasIcon)return j({ok:false,error:"INVALID_UI_SETTINGS"},400);
    if(hasCharacter&&!Number.isFinite(Number(body.characterScale)))return j({ok:false,error:"INVALID_CHARACTER_SCALE"},400);
    if(hasIcon&&![25,50,75,100,125,150].includes(Number(body.actionIconScale)))
      return j({ok:false,error:"INVALID_ACTION_ICON_SCALE"},400);
    const prior=await this.ctx.storage.get("globalSetting:ui")||{},
      characterScale=hasCharacter?normalizeCharacterScale(Number(body.characterScale),100):normalizeCharacterScale(Number(prior.characterScale),100),
      actionIconScale=hasIcon?Number(body.actionIconScale):([25,50,75,100,125,150].includes(Number(prior.actionIconScale))?Number(prior.actionIconScale):100),
      rec={...prior,characterScale,actionIconScale,backgroundDim:0,updatedAt:new Date().toISOString()};
    await this.ctx.storage.put("globalSetting:ui",rec);await this.ctx.storage.delete("globalSetting:webVeil");return j({ok:true,...rec});
  }
  async globalWebSyncGet(){
    const old=await this.ctx.storage.get("globalSetting:webSync");
    if(String(old?.version||"")!==VERSION){
      const rec={generation:Math.max(0,Number(old?.generation||0))+1,version:VERSION,source:"SERVER_DEPLOY",updatedAt:new Date().toISOString()};
      await this.ctx.storage.put("globalSetting:webSync",rec);
      return j({ok:true,...rec});
    }
    return j({ok:true,generation:Math.max(0,Number(old?.generation||0)),version:VERSION,updatedAt:old?.updatedAt||null,source:old?.source||null});
  }
  async globalWebSyncBump(body){
    const old=await this.ctx.storage.get("globalSetting:webSync"),rec={
      generation:Math.max(0,Number(old?.generation||0))+1,
      version:String(body?.version||VERSION),
      source:String(body?.source||"GM_APP").slice(0,40),
      updatedAt:new Date().toISOString()
    };
    await this.ctx.storage.put("globalSetting:webSync",rec);return j({ok:true,...rec});
  }
  async globalLobbyResetBump(body){
    const old=await this.ctx.storage.get("globalSetting:lobbyReset");
    const rec={generation:Math.max(0,Number(old?.generation||0))+1,updatedAt:new Date().toISOString(),source:String(body?.source||"GM_LOBBY").slice(0,40)};
    await this.ctx.storage.put("globalSetting:lobbyReset",rec);
    return j({ok:true,...rec});
  }
  async clientErrorAppend(body){
    const entry=normalizeClientError(body);if(!entry)return j({ok:false,error:"INVALID_ERROR"},400);
    const r=appendClientError(await this.ctx.storage.get("clientErrorLog"),entry);
    if(r.changed)await this.ctx.storage.put("clientErrorLog",r.state);
    return j({ok:true,stored:r.changed,reason:r.reason});
  }
  async clientErrorList(){
    const st=await this.ctx.storage.get("clientErrorLog")||{items:[],dropped:0};
    return j({ok:true,items:st.items,dropped:st.dropped||0,report:formatClientErrorReport(st.items,VERSION)});
  }
  async globalGmPresenceGet(){
    const rec=await this.ctx.storage.get("globalSetting:gmPresence"),now=Date.now(),lastSeenAt=Math.max(0,Number(rec?.lastSeenAt||0));
    const online=rec?.online===true&&lastSeenAt>0&&(now-lastSeenAt)<=GM_PRESENCE_TTL;
    return j({ok:true,gm:publicGmPresence(rec,online)});
  }
  async globalGmPresencePut(body){
    const old=await this.ctx.storage.get("globalSetting:gmPresence"),now=Date.now(),online=body?.online!==false,hasRoomCode=!!body&&Object.prototype.hasOwnProperty.call(body,"roomCode"),requestedRoomCode=hasRoomCode?normalizeRoomCode(body?.roomCode):"",roomCode=hasRoomCode&&isValidRoomCode(requestedRoomCode)?requestedRoomCode:"";
    if(shouldSkipGmHeartbeat(old,online,hasRoomCode,roomCode,now)){
      this.gmwwWriteSkipped('gmHeartbeat');
      return j({ok:true,gm:publicGmPresence(old,true),lobbyGeneration:Number((await this.ctx.storage.get("globalSetting:lobbyReset"))?.generation||0)});
    }
    if(!online){
      const rec={...(old||{}),online:false,roomCode:hasRoomCode?roomCode:String(old?.roomCode||""),lastSeenAt:now,updatedAt:new Date(now).toISOString()};
      await this.ctx.storage.put("globalSetting:gmPresence",rec);
      return j({ok:true,gm:publicGmPresence(rec,false),lobbyGeneration:Number((await this.ctx.storage.get("globalSetting:lobbyReset"))?.generation||0)});
    }
    const expired=old?.online!==true||!Number(old?.lastSeenAt)||now-Number(old.lastSeenAt)>GM_PRESENCE_TTL;
    const rec=expired?{online:true,sessionId:randomToken(12),sessionStartedAt:now,lastSeenAt:now,updatedAt:new Date(now).toISOString(),roomCode:hasRoomCode?roomCode:"",moveFromX:null,moveFromY:null,moveToX:null,moveToY:null,moveStartedAt:0,moveDurationMs:0,manualUntil:0}:{...old,online:true,...(hasRoomCode?{roomCode}:{}),lastSeenAt:now,updatedAt:new Date(now).toISOString()};
    await this.ctx.storage.put("globalSetting:gmPresence",rec);
    return j({ok:true,gm:publicGmPresence(rec,true),lobbyGeneration:Number((await this.ctx.storage.get("globalSetting:lobbyReset"))?.generation||0)});
  }
  async globalGmMovePut(body){
    const old=await this.ctx.storage.get("globalSetting:gmPresence"),now=Date.now(),expired=old?.online!==true||!Number(old?.lastSeenAt)||now-Number(old.lastSeenAt)>GM_PRESENCE_TTL,hasRoomCode=!!body&&Object.prototype.hasOwnProperty.call(body,"roomCode"),requestedRoomCode=hasRoomCode?normalizeRoomCode(body?.roomCode):"",roomCode=hasRoomCode?(isValidRoomCode(requestedRoomCode)?requestedRoomCode:""):String(old?.roomCode||"");
    const sessionId=expired?randomToken(12):String(old?.sessionId||randomToken(12)),sessionStartedAt=expired?now:Math.max(0,Number(old?.sessionStartedAt||now));
    const from=villageLayout.clampPoint(body?.fromX,body?.fromY),to=villageLayout.clampPoint(body?.x,body?.y),distance=Math.hypot(to.x-from.x,(to.y-from.y)*2),duration=Math.max(450,Math.min(4200,Math.trunc(distance*48||650)));
    const rec={...(expired?{}:(old||{})),online:true,sessionId,sessionStartedAt,lastSeenAt:now,updatedAt:new Date(now).toISOString(),roomCode,moveFromX:from.x,moveFromY:from.y,moveToX:to.x,moveToY:to.y,moveStartedAt:now,moveDurationMs:duration,manualUntil:now+duration+15000};
    await this.ctx.storage.put("globalSetting:gmPresence",rec);
    return j({ok:true,gm:publicGmPresence(rec,true),durationMs:duration});
  }
  async globalAssetGet(key,contentType){
    const bytes=await this.ctx.storage.get(key);
    if(!bytes)return new Response("ASSET_NOT_FOUND",{status:404,headers:{"cache-control":"no-store"}});
    const body=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
    return new Response(body,{headers:{"content-type":contentType,"cache-control":"public, max-age=31536000, immutable","x-content-type-options":"nosniff"}});
  }
  async globalAssetPut(request,key,contentType,maxBytes=125000){
    const ab=await request.arrayBuffer();
    if(!ab.byteLength||ab.byteLength>maxBytes)return j({ok:false,error:"ASSET_SIZE_INVALID",size:ab.byteLength,maxBytes},413);
    const bytes=new Uint8Array(ab);await this.ctx.storage.put(key,bytes);
    return j({ok:true,key,contentType,size:bytes.byteLength});
  }
}
