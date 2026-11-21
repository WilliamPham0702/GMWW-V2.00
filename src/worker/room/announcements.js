// Thông báo âm thanh theo lượt và đếm ngược ban ngày.
import { j } from "../http/responses.js";
import { DAY_COUNTDOWN_MS, announcementCue, announcementLibrary, dayAnnouncementTargets, decodeRecording, readAnnouncementBlob, saveAnnouncementTarget } from "../support/announcement-audio.js";
import { normalizeLoginId } from "../../gmww-player-identity-rules.js";
import { getSharedAudioCatalog, readSharedAudioClip, sharedAudioTargetsForCue } from "../support/shared-audio-release.js";

export class RoomAnnouncementMethods {
  async currentAnnouncement(meta,runtime){
    if(runtime===undefined)runtime=meta?.cyclePhase==='night'?await this.getNightRuntime(meta,Number(meta.cycleNight),false):null;
    const day=meta&&meta.cyclePhase!=='night'?await this.ctx.storage.get('annDay'):null;
    const cue=announcementCue(meta,runtime,day);
    if(cue&&meta?.quickPlay===true&&meta.cyclePhase==='night'){
      const x=await this.ctx.storage.get('annNightExtra'),turn=runtime?.queue?.[runtime.cursor];
      if(x&&x.matchId===String(meta.matchId||'')&&x.cycleKey===String(meta.cycleKey||'')&&turn&&x.turnId===String(turn.id||''))
        return {...cue,key:cue.key+':confirm:'+Number(x.seq||1),targets:x.targets,startedAt:Number(x.startedAt)||0};
    }
    return cue;
  }
  // Public cue for Players: label, Server start time and opaque clip URLs only.
  async announcementWithAudio(meta,runtime){
    const cue=await this.currentAnnouncement(meta,runtime);if(!cue)return null;
    const lib=await announcementLibrary(this.ctx.storage);
    // Existing room-owned clips win; missing Quick Play clips can be read from
    // the immutable, verified template catalog without copying them to this DO.
    const needShared=meta?.quickPlay===true&&cue.targets.some(t=>!lib[t]);
    const shared=needShared?await getSharedAudioCatalog():null;
    const urls=cue.targets.flatMap(target=>{
      if(lib[target])return ['/api/rooms/'+encodeURIComponent(meta.code)+'/announcement-audio?a='+lib[target]];
      const clip=shared?sharedAudioTargetsForCue(meta,[target],shared)[0]:null;
      return clip?['/api/rooms/'+encodeURIComponent(meta.code)+'/announcement-audio?a=s'+clip.sha256]:[];
    });
    const out={key:cue.key,label:cue.label,startedAt:cue.startedAt};
    if(urls.length){out.audio=urls;out.audioUrl=urls[0]}
    return out;
  }
  // Chơi nhanh (không có app GM): máy chủ tự xếp audio công khai như GM Server
  // (sáng: Làng ơi dậy đi + số người chết…, Lên Giàn: mở đề cử/bỏ phiếu/kết quả).
  async quickPlayDayAudio(meta,targets,tag){
    if(meta?.quickPlay!==true||meta?.phase!=='running'||!['morning','day'].includes(String(meta?.cyclePhase||'')))return false;
    const list=dayAnnouncementTargets(targets);if(!list.length)return false;
    const dedupe=String(meta.matchId||'')+':'+String(tag||'');
    if((await this.ctx.storage.get('annQuickTag'))===dedupe)return false;
    await this.ctx.storage.put('annQuickTag',dedupe);
    const prev=await this.ctx.storage.get('annDay'),same=prev&&prev.matchId===String(meta.matchId||'')&&prev.cycleKey===String(meta.cycleKey||'');
    await this.ctx.storage.put('annDay',{matchId:String(meta.matchId||''),cycleKey:String(meta.cycleKey||''),seq:same?Number(prev.seq||0)+1:1,targets:list,startedAt:Date.now()});
    await this.syncAnnouncementCue(false);
    return true;
  }
  quickPlayMorningTargets(meta,rows,night){
    const mine=(Array.isArray(rows)?rows:[]).filter(x=>x&&x.effectActive!==false&&(!x.matchId||String(x.matchId)===String(meta.matchId||''))&&Number(x.night)===Number(night));
    const dead=new Set(mine.filter(x=>String(x.type)==='dead').map(x=>normalizeLoginId(x.loginId)).filter(Boolean)).size;
    const out=['system:audio_system_day_wakeup'];
    if(dead>0)out.push('system:audio_system_morning_deaths_intro','system:audio_system_morning_number_'+Math.min(5,dead),'system:audio_system_morning_dead_noun');
    if(mine.some(x=>String(x.type)==='expelled'))out.push('system:audio_system_morning_expelled');
    if(mine.some(x=>['assassin_mark','marked'].includes(String(x.type))))out.push('system:audio_system_morning_marked');
    return out;
  }
  async quickPlayGallowsAudio(meta,ballot){
    if(meta?.quickPlay!==true||!ballot?.id)return false;
    const now=Date.now(),raw=String(ballot.stage||'ready');
    const stage=raw==='nominating'&&now>=Number(ballot.nominationDeadlineAt||Infinity)?'selecting':raw;
    const targets=stage==='nominating'?['system:audio_system_gallows_day_long','system:audio_system_gallows_open_nomination']:
      stage==='voting'?['system:audio_system_gallows_open_vote']:
      stage==='resolved'?[ballot.outcome==='dead'?'system:audio_system_gallows_result_dead':'system:audio_system_gallows_result_saved']:[];
    if(!targets.length)return false;
    return this.quickPlayDayAudio(meta,targets,'gallows:'+ballot.id+':'+stage);
  }
  // Ban đêm: người chơi xác nhận hành động → phát "xác nhận" cho cả phòng (như loa GM).
  async quickPlayConfirmCue(){
    const meta=await this.ctx.storage.get('meta');
    if(meta?.quickPlay!==true||meta?.phase!=='running'||String(meta?.cyclePhase||'')!=='night')return false;
    const prev=await this.ctx.storage.get('annNightExtra'),turnId=String(meta.currentNightTurnId||'');
    const same=prev&&prev.matchId===String(meta.matchId||'')&&prev.cycleKey===String(meta.cycleKey||'')&&prev.turnId===turnId;
    await this.ctx.storage.put('annNightExtra',{matchId:String(meta.matchId||''),cycleKey:String(meta.cycleKey||''),turnId,seq:same?Number(prev.seq||0)+1:1,targets:['system:audio_system_confirm'],startedAt:Date.now()});
    await this.syncAnnouncementCue(false);
    return true;
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
    const lib=await announcementLibrary(this.ctx.storage);
    if(!lib['system:audio_system_countdown']){
      if(meta.quickPlay!==true)return 0;
      const shared=await getSharedAudioCatalog();
      if(!sharedAudioTargetsForCue(meta,['system:audio_system_countdown'],shared).length)return 0;
    }
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
    if(!targets.some(t=>lib[t])){
      // Quick Play can play the verified, pinned shared system cues without
      // requiring an active GM client to upload day announcements to the room.
      // Older/non-Quick-Play rooms preserve their upload-only behavior.
      const shared=meta?.quickPlay===true?await getSharedAudioCatalog():null;
      if(!sharedAudioTargetsForCue(meta,targets,shared).length)return j({ok:false,error:'DAY_AUDIO_NOT_UPLOADED'},409);
    }
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
    if(/^s[a-f0-9]{64}$/.test(hash)){
      const live=await this.currentAnnouncement(meta);
      return readSharedAudioClip(meta,live?.targets||[],hash.slice(1));
    }
    return readAnnouncementBlob(this.ctx.storage,hash);
  }
}
