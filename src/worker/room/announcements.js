// Thông báo âm thanh theo lượt và đếm ngược ban ngày.
import { j } from "../http/responses.js";
import { DAY_COUNTDOWN_MS, announcementCue, announcementLibrary, dayAnnouncementTargets, decodeRecording, readAnnouncementBlob, saveAnnouncementTarget } from "../support/announcement-audio.js";
import { normalizeLoginId } from "../../gmww-player-identity-rules.js";

export class RoomAnnouncementMethods {
  async currentAnnouncement(meta,runtime){
    if(runtime===undefined)runtime=meta?.cyclePhase==='night'?await this.getNightRuntime(meta,Number(meta.cycleNight),false):null;
    const day=meta&&meta.cyclePhase!=='night'?await this.ctx.storage.get('annDay'):null;
    return announcementCue(meta,runtime,day);
  }
  // Public cue for Players: label, Server start time and opaque clip URLs only.
  async announcementWithAudio(meta,runtime){
    const cue=await this.currentAnnouncement(meta,runtime);if(!cue)return null;
    const lib=await announcementLibrary(this.ctx.storage),hashes=cue.targets.map(t=>lib[t]).filter(Boolean);
    const out={key:cue.key,label:cue.label,startedAt:cue.startedAt};
    if(hashes.length){out.audio=hashes.map(h=>'/api/rooms/'+encodeURIComponent(meta.code)+'/announcement-audio?a='+h);out.audioUrl=out.audio[0]}
    return out;
  }
  scheduleAnnouncementSync(){
    if(this.announcementSyncTimer)return;
    this.announcementSyncTimer=setTimeout(()=>{this.announcementSyncTimer=null;this.syncAnnouncementCue(false).catch(()=>{})},60);
  }
  // Push the cue to every socket whenever the current turn or its clips change.
  async syncAnnouncementCue(force){
    const meta=await this.ctx.storage.get('meta'),cue=meta?await this.announcementWithAudio(meta):null;
    const sig=cue?cue.key+'|'+(cue.audio||[]).join(','):'';
    if(!force&&sig===this.lastAnnouncementSig)return;
    this.lastAnnouncementSig=sig;
    if(cue)this.broadcast({type:'announcement_ready',audioCue:cue,serverTime:Date.now()});
  }
  // V3.305: the Server itself starts "Đếm ngược 30 giây cuối" for every Player Web,
  // independent of the GM app being open/foreground. GM uploads the clip at day start.
  async dayCountdownDue(meta){
    if(!meta||meta.demo===true||meta.phase!=='running'||String(meta.cyclePhase||'')!=='morning'||meta.autoGM===false)return 0;
    const deadline=Date.parse(meta.dayDeadlineAt||'');if(!Number.isFinite(deadline)||Date.now()>=deadline)return 0;
    const key=String(meta.matchId||'')+':'+String(meta.cycleKey||'');
    if((await this.ctx.storage.get('annCountdown'))===key)return 0;
    const lib=await announcementLibrary(this.ctx.storage);if(!lib['system:audio_system_countdown'])return 0;
    return Math.max(Date.now(),deadline-DAY_COUNTDOWN_MS);
  }
  async dayCountdownCue(meta){
    const due=await this.dayCountdownDue(meta);if(!due||due>Date.now()+25)return false;
    const key=String(meta.matchId||'')+':'+String(meta.cycleKey||''),deadline=Date.parse(meta.dayDeadlineAt);
    const prev=await this.ctx.storage.get('annDay'),same=prev&&prev.matchId===String(meta.matchId||'')&&prev.cycleKey===String(meta.cycleKey||'');
    await this.ctx.storage.put('annDay',{matchId:String(meta.matchId||''),cycleKey:String(meta.cycleKey||''),seq:same?Number(prev.seq||0)+1:1,
      targets:['system:audio_system_countdown'],startedAt:Math.min(Date.now(),deadline-DAY_COUNTDOWN_MS)});
    await this.ctx.storage.put('annCountdown',key);
    await this.syncAnnouncementCue(false);
    return true;
  }
  async gmAnnouncement(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta;
    // V3.304: daytime GM audio queue (wake-up, deaths, Lên Giàn results...) as one public cue.
    if(Array.isArray(body?.day))return this.gmDayAnnouncement(meta,body);
    let target=String(body?.target||'');
    if(!target){
      // Runtime <=V3.302 uploads the current turn's first clip by turn key.
      const cue=await this.currentAnnouncement(meta);
      if(!cue||body?.key!==cue.key||!cue.targets[0])return j({ok:false,error:'STALE_AUDIO_CUE'},409);
      target=cue.targets[0];
    }
    const saved=await saveAnnouncementTarget(this.ctx.storage,target,decodeRecording(body));
    if(saved.ok&&meta?.phase==='running')await this.syncAnnouncementCue(false);
    if(saved.ok&&target==='system:audio_system_countdown')await this.scheduleRoomAlarm(await this.ctx.storage.get('meta')||meta);
    return saved;
  }
  async gmDayAnnouncement(meta,body){
    const targets=dayAnnouncementTargets(body.day);
    if(meta?.phase!=='running'||!['morning','day'].includes(String(meta?.cyclePhase||'')))return j({ok:false,error:'DAY_AUDIO_NOT_ACTIVE'},409);
    if(!targets.length)return j({ok:false,error:'INVALID_AUDIO_TARGET'},400);
    const lib=await announcementLibrary(this.ctx.storage);
    if(!targets.some(t=>lib[t]))return j({ok:false,error:'DAY_AUDIO_NOT_UPLOADED'},409);
    const prev=await this.ctx.storage.get('annDay'),same=prev&&prev.matchId===String(meta.matchId||'')&&prev.cycleKey===String(meta.cycleKey||'');
    // GM reports how long ago its local queue started; no device clock is trusted.
    const lag=Math.max(0,Math.min(20000,Number(body?.elapsedMs)||0)),now=Date.now();
    const day={matchId:String(meta.matchId||''),cycleKey:String(meta.cycleKey||''),seq:same?Number(prev.seq||0)+1:1,targets,startedAt:now-lag};
    await this.ctx.storage.put('annDay',day);
    await this.syncAnnouncementCue(false);
    return j({ok:true,seq:day.seq});
  }
  async gmAnnouncementLibrary(request){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    return j({ok:true,targets:await announcementLibrary(this.ctx.storage)});
  }
  async playerAnnouncement(body){
    const meta=await this.ctx.storage.get('meta'),players=await this.ctx.storage.get('players')||{};
    if(!meta||meta.enabled===false||!players['member:'+normalizeLoginId(body?.loginId)])return j({ok:false,error:'PLAYER_NOT_IN_ROOM'},403);
    // Only clips of the turn that is live right now are readable by Players.
    const cue=await this.announcementWithAudio(meta),hash=String(body?.a||'');
    if(!cue?.audio?.some(u=>u.endsWith('?a='+hash)))return new Response(null,{status:404});
    return readAnnouncementBlob(this.ctx.storage,hash);
  }
}
