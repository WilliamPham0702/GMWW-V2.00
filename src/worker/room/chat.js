// Box chat: quyền, tin thoại, đọc/gửi, kiểm duyệt.
import { j } from "../http/responses.js";
import { chatNormalizeText, chatPolicy, chatStorageScope, mergePublicChatNotices, publicChatNotices } from "../../gmww-online-chat-policy.js";
import { normalizeLoginId } from "../../gmww-player-identity-rules.js";

export class RoomChatMethods {
  // Chat content NEVER enters the public room DTO or broadcast WebSocket.
  // The generic chat_tick only asks each authenticated client to fetch its own channel.
  async chatAccess(loginId,requestedChannel="room"){
    const meta=await this.ctx.storage.get("meta"),players=(await this.ctx.storage.get("players"))||{},
      rows=(await this.ctx.storage.get("interactions"))||[],bans=(await this.ctx.storage.get("onlineChatBans:"+String(meta?.matchId||"")))||{};
    const id=normalizeLoginId(loginId);
    // Server-only authenticated DM channel. Never deliver through public room chat or room state.
    if(requestedChannel==="gm"){
      const allowed=meta?.enabled!==false&&["running","role_delivery","lobby","waiting"].includes(String(meta?.phase||""))&&!!players["member:"+id];
      // GM private chat remains available to every authenticated room member,
      // including dead, expelled, frozen and muted players.
      const permission=allowed?{canRead:true,canSend:true,channel:"gm:"+id,scope:"gm",reason:null}
        :{canRead:false,canSend:false,channel:null,scope:null,reason:"CHAT_NOT_IN_ROOM"};
      return{meta,players,rows,permission};
    }
    const runtime=meta?.cyclePhase==="night"?await this.getNightRuntime(meta,Number(meta.cycleNight||1),false):null;
    const permission=chatPolicy({meta,players,rows,runtime,loginId,bans});
    return{meta,players,rows,permission};
  }
  // Voice metadata is scoped to the current match. Internal chunks avoid any arbitrary UI KB limit.
  async chatVoiceStore(scope,channel,voice){
    const mime=String(voice?.mime||'').toLowerCase().split(';')[0].trim(),
      durationMs=Number(voice?.durationMs),base64=voice?.base64;
    if(!['audio/mp4','audio/webm','audio/ogg','audio/aac','audio/mpeg','audio/wav'].includes(mime)||
       !Number.isFinite(durationMs)||durationMs<=0||durationMs>30000||
       typeof base64!=='string'||!base64.length||base64.length%4!==0||
       !/^[A-Za-z0-9+/]+={0,2}$/.test(base64))throw new Error('CHAT_VOICE_INVALID');
    const id=crypto.randomUUID(),prefix='onlineChatVoice:'+scope+':'+id+':',unit=65536,parts=Math.ceil(base64.length/unit);
    // Independent chunk keys may be written concurrently; the meta marker is
    // committed only after every chunk completes, so readers never see partial audio.
    for(let i=0;i<parts;i+=6){
      const writes=[];
      for(let n=i;n<Math.min(parts,i+6);n++)
        writes.push(this.ctx.storage.put(prefix+n,base64.slice(n*unit,(n+1)*unit)));
      await Promise.all(writes);
    }
    await this.ctx.storage.put(prefix+'meta',{channel,mime,durationMs,parts});
    return {kind:'voice',voiceId:id,durationMs};
  }
  async chatVoiceRead({loginId,gm=false,request},id){
    if(!/^[a-f0-9-]{36}$/.test(String(id||'')))return j({ok:false,error:'CHAT_AUDIO_NOT_FOUND'},404);
    const meta=await this.ctx.storage.get('meta'),scope=chatStorageScope(meta),
      prefix='onlineChatVoice:'+scope+':'+id+':',record=await this.ctx.storage.get(prefix+'meta');
    if(!record)return j({ok:false,error:'CHAT_AUDIO_NOT_FOUND'},404);
    if(gm){
      const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    }else{
      const who=normalizeLoginId(loginId),access=await this.chatAccess(who,record.channel.startsWith('gm:')?'gm':'room');
      if(!access.players['member:'+who])return j({ok:false,error:'CHAT_AUDIO_FORBIDDEN'},403);
      const allowed=record.channel==='gm:all'?access.permission.canRead:
        record.channel==='gm:'+who?access.permission.canRead&&access.permission.channel==='gm:'+who:
        access.permission.canRead&&access.permission.channel===record.channel;
      if(!allowed)return j({ok:false,error:'CHAT_AUDIO_FORBIDDEN'},403);
    }
    const blocks=[];
    for(let i=0;i<record.parts;i+=6){
      const indices=Array.from({length:Math.min(6,record.parts-i)},(_,offset)=>i+offset);
      blocks.push(...await Promise.all(indices.map(index=>this.ctx.storage.get(prefix+index))));
    }
    if(blocks.some(chunk=>typeof chunk!=='string'))return j({ok:false,error:'CHAT_AUDIO_UNAVAILABLE'},404);
    return j({ok:true,mime:record.mime,base64:blocks.join(''),durationMs:record.durationMs});
  }
  async chatVoiceClear(){
    // End/reset deletes voice audio and voice references, but retains text and other game data.
    for(const key of (await this.ctx.storage.list({prefix:'onlineChatVoice:'})).keys())await this.ctx.storage.delete(key);
    for(const [key,messages] of await this.ctx.storage.list({prefix:'onlineChat:'})){
      if(Array.isArray(messages)&&messages.some(m=>m?.kind==='voice'))
        await this.ctx.storage.put(key,messages.filter(m=>m?.kind!=='voice'));
    }
  }
  async playerChatRead(body){
    const loginId=normalizeLoginId(body?.loginId),{meta,players,rows,permission}=await this.chatAccess(loginId,body?.channel);
    let notices=[],noticeCycleNight=0;
    if(players["member:"+loginId]&&meta?.phase==="running"&&meta?.matchId){
      const phase=String(meta.cyclePhase||"");
      const currentNight=Math.max(0,Number(meta.cycleNight||0));
      // A new night must never disclose its pending secret actions. Keep only
      // the already-public bulletin from the preceding day until next dawn.
      const resolved=["morning","day"].includes(phase);
      noticeCycleNight=resolved?currentNight:phase==="night"?currentNight-1:0;
      if(noticeCycleNight>0){
        const noticeKey="villagePublicBulletin:"+String(meta.matchId)+":"+noticeCycleNight;
        const stored=await this.ctx.storage.get(noticeKey);
        notices=Array.isArray(stored?.items)?stored.items:[];
        if(resolved){
          // First public read backfills from durable room history, so even
          // pruned interaction rows can produce a stable, replayable bulletin.
          const source=stored?rows:await this.villageHistoryForMatch(meta,rows);
          const latest=publicChatNotices(meta,players,source);
          const merged=mergePublicChatNotices(notices,latest);
          if(!stored||JSON.stringify(merged)!==JSON.stringify(notices))
            await this.ctx.storage.put(noticeKey,{items:merged});
          notices=merged;
        }
      }
    }
    const broadcasts=players["member:"+loginId]?(await this.ctx.storage.get("onlineChat:"+chatStorageScope(meta)+":gm:all"))||[]:[];
    if(!permission.canRead)return j({ok:true,channel:null,messages:[],broadcasts,notices,noticeCycleNight,canSend:false,reason:permission.reason,phase:meta?.cyclePhase||null});
    const key="onlineChat:"+chatStorageScope(meta)+":"+permission.channel;
    return j({ok:true,channel:permission.channel,scope:permission.scope,
      messages:(await this.ctx.storage.get(key))||[],broadcasts,notices,noticeCycleNight,canSend:permission.canSend,
      reason:permission.reason,phase:meta.cyclePhase,cycleKey:meta.cycleKey});
  }
  async playerChatSend(body){
    const loginId=normalizeLoginId(body?.loginId),content=chatNormalizeText(body?.text),hasVoice=body?.voice!==undefined;
    if((!content&&!hasVoice)||String(body?.text||'').length>400||!!content&&hasVoice)return j({ok:false,error:"CHAT_INVALID_TEXT"},400);
    const {meta,players,permission}=await this.chatAccess(loginId,body?.channel);
    if(!permission.canSend)return j({ok:false,error:permission.reason||"CHAT_FORBIDDEN"},403);
    const rateKey="onlineChatRate:"+chatStorageScope(meta)+":"+loginId,prev=Number(await this.ctx.storage.get(rateKey)||0);
    if(Date.now()-prev<850)return j({ok:false,error:"CHAT_RATE_LIMIT"},429);
    let media=null;
    if(hasVoice)try{media=await this.chatVoiceStore(chatStorageScope(meta),permission.channel,body.voice)}
    catch{return j({ok:false,error:"CHAT_VOICE_INVALID_OR_UNAVAILABLE"},400)}
    const key="onlineChat:"+chatStorageScope(meta)+":"+permission.channel,
      messages=(await this.ctx.storage.get(key))||[],now=Date.now(),
      message={id:crypto.randomUUID(),senderId:loginId,
        senderName:String(players["member:"+loginId]?.displayName||loginId).slice(0,42),
        text:content,at:now,scope:permission.scope,...(media||{})};
    await this.ctx.storage.put(key,[...messages.slice(-79),message]);
    await this.ctx.storage.put(rateKey,now);
    this.broadcast({type:"chat_tick",serverTime:now});
    return j({ok:true,id:message.id,channel:permission.channel});
  }
  async gmChatRead(request){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,match=chatStorageScope(meta);
    const records=match?await this.ctx.storage.list({prefix:"onlineChat:"+match+":"}):new Map(),
      channels=[...records.entries()].map(([key,messages])=>({
        channel:key.slice(("onlineChat:"+match+":").length),
        messages:Array.isArray(messages)?messages.slice(-80):[]
      }));
    const participants=Object.values((await this.ctx.storage.get("players"))||{})
      .filter(p=>p?.loginId).map(p=>({loginId:normalizeLoginId(p.loginId),displayName:String(p.displayName||p.loginId).slice(0,42)}));
    return j({ok:true,matchId:match,phase:meta.cyclePhase||null,participants,
      bans:(await this.ctx.storage.get("onlineChatBans:"+String(meta?.matchId||"")))||{},channels});
  }
  async gmChatSend(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta,id=normalizeLoginId(body?.loginId),content=chatNormalizeText(body?.text),
      hasVoice=body?.voice!==undefined,players=(await this.ctx.storage.get("players"))||{};
    const toVillage=String(body?.channel||'')==='room';
    if(!["lobby","waiting","role_delivery","running"].includes(String(meta?.phase))||(!content&&!hasVoice)||!!content&&hasVoice||String(body?.text||"").length>400||
      (!toVillage&&(!id||!players["member:"+id])))
      return j({ok:false,error:"GM_CHAT_INVALID_MESSAGE"},400);
    // GM broadcast is visible to all authenticated members, even when their group chat is closed.
    const channel=toVillage?"gm:all":"gm:"+id;
    const key="onlineChat:"+chatStorageScope(meta)+":"+channel,now=Date.now(),
      rateKey="gmChatRate:"+chatStorageScope(meta)+":"+channel;
    if(now-Number(await this.ctx.storage.get(rateKey)||0)<450)return j({ok:false,error:"CHAT_RATE_LIMIT"},429);
    let media=null;
    if(hasVoice)try{media=await this.chatVoiceStore(chatStorageScope(meta),channel,body.voice)}
    catch{return j({ok:false,error:"CHAT_VOICE_INVALID_OR_UNAVAILABLE"},400)}
    const messages=(await this.ctx.storage.get(key))||[],
      message={id:crypto.randomUUID(),senderId:"gm",senderName:"GM",isGM:true,text:content,at:now,scope:toVillage?"gm-broadcast":"gm",...(media||{})};
    await this.ctx.storage.put(key,[...messages.slice(-79),message]);await this.ctx.storage.put(rateKey,now);
    this.broadcast({type:"chat_tick",serverTime:now});return j({ok:true,id:message.id,channel});
  }
  async gmChatModerate(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const id=normalizeLoginId(body?.loginId),players=(await this.ctx.storage.get("players"))||{};
    if(!id||!players["member:"+id]||typeof body?.muted!=="boolean")return j({ok:false,error:"CHAT_INVALID_MODERATION"},400);
    const bans=(await this.ctx.storage.get("onlineChatBans:"+String(auth.meta.matchId||"")))||{};
    if(body.muted)bans[id]=true;else delete bans[id];
    await this.ctx.storage.put("onlineChatBans:"+String(auth.meta.matchId||""),bans);
    this.broadcast({type:"chat_tick",serverTime:Date.now()});
    return j({ok:true,loginId:id,muted:body.muted});
  }
}
