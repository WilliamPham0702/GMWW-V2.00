// DEMO và Auto GM.
import { GM_SYNC_TOKEN } from "../config.js";
import { j } from "../http/responses.js";
import { dayClockRemainingMs } from "../../gmww-day-clock.js";
import { nextDemoClock, projectDemoClock } from "../../gmww-demo-clock.js";
import { serverDemoActive, stopServerDemo } from "../../gmww-demo-runner.js";
import { publicRoom } from "../../gmww-public-room-contract.js";
import { publicPlayer } from "../../gmww-village-player-state.js";

export class RoomDemoAutoMethods {
  async demoClockContext(meta){
    const cfg=await this.ctx.storage.get("gameConfig")||{},prefix=String(meta.matchId||"")+":"+String(meta.cycleKey||"");
    if(meta.cyclePhase==="night"){
      const rt=await this.getNightRuntime(meta,Math.max(1,Number(meta.cycleNight)||1),false),turn=rt?.queue?.[rt.cursor];
      return {key:prefix+":"+String(turn?.id||"done"),kind:"night",durationMs:Math.max(0,Number(turn?.durationSec)||0)*1000};
    }
    const key="gallows:"+String(meta.matchId||"")+":"+String(meta.cycleKey||""),ballot=await this.ctx.storage.get(key)||{stage:"ready"},stage=String(ballot.stage||"ready"),
      seconds=stage==="ready"?cfg.timing?.villageDiscussionSec:stage==="nominating"?ballot.nominationDurationSec:stage==="voting"?ballot.voteDurationSec:0;
    return {key:prefix+":"+String(ballot.id||"day")+":"+stage,kind:stage==="ready"?"discussion":stage,durationMs:Math.max(0,Number(seconds)||0)*1000};
  }
  async syncDemoClock(meta,lease){
    if(meta.demo!==true||meta.autoGM===true)return null;
    const now=Date.now(),context=await this.demoClockContext(meta),previous=await this.ctx.storage.get("demoClock"),clock=nextDemoClock(previous,context,lease,now);
    await this.ctx.storage.put("demoClock",clock);
    if(meta.cyclePhase==="morning"){
      if(clock.kind==="discussion"){meta.dayDeadlineAt=clock.deadlineAt?new Date(clock.deadlineAt).toISOString():null;meta.autoPausedRemainingMs=clock.running?null:clock.remainingMs/clock.speed;await this.ctx.storage.put("meta",meta)}
      const key="gallows:"+String(meta.matchId||"")+":"+String(meta.cycleKey||""),ballot=await this.ctx.storage.get(key);
      if(ballot&&["nominating","voting"].includes(clock.kind)){
        const field=clock.kind==="nominating"?"nominationDeadlineAt":"deadlineAt";
        ballot[field]=clock.deadlineAt;await this.ctx.storage.put(key,ballot);
      }
    }
    return clock;
  }
  demoInternalRequest(){return new Request("https://room.internal/gm/demo-server",{method:"POST",headers:{authorization:"Bearer "+GM_SYNC_TOKEN}})}
  async gmDemo(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;const meta=auth.meta;
    if(meta.demo!==true)return j({ok:false,error:"NOT_DEMO_ROOM"},403);
    const command=String(body?.command||"status"),previous=await this.ctx.storage.get("demoLease")||{},now=Date.now(),
      speed=[1,2,5,10].includes(Number(body?.speed))?Number(body.speed):Math.max(1,Number(previous.speed)||1);
    if(!["status","start","stop","speed","hold","release"].includes(command))return j({ok:false,error:"DEMO_SERVER_OWNED",message:"Demo chạy trên server. Hãy cập nhật Runtime để điều khiển."},409);
    if(command==="start"&&body?.owner)return j({ok:false,error:"DEMO_RUNTIME_UPDATE_REQUIRED",message:"Hãy cập nhật Runtime để dùng Demo chạy trên server."},409);
    if(command==="start"){
      if(meta.autoGM===true)return j({ok:false,error:"DEMO_AUTO_GM_ACTIVE"},409);
      if(meta.phase!=="running")return j({ok:false,error:"DEMO_MATCH_NOT_STARTED"},409);
    }
    const same=previous.engine==="server"&&previous.matchId===String(meta.matchId||"");
    let lease=same?{...previous}:{engine:"server",matchId:String(meta.matchId||""),running:false,speed,steps:0,startedAt:now,until:0,owner:""};
    if(command==="stop")lease={...lease,running:false,reason:"paused",holdUntil:0};
    if(command==="start")lease={...lease,running:true,reason:"",error:"",holdUntil:0};
    if(command==="hold"&&lease.running)lease.holdUntil=now+10000;
    if(command==="release")lease.holdUntil=0;
    if(command!=="status"){
      lease.speed=speed;await this.syncDemoClock(meta,lease);await this.ctx.storage.put("demoLease",lease);await this.scheduleRoomAlarm(meta);
      this.broadcast({type:"demo_control",running:lease.running,serverTime:now});
    }
    const stored=await this.ctx.storage.get("demoClock"),clock=stored?projectDemoClock(stored,now):null;
    return j({ok:true,engine:"server",running:serverDemoActive(meta,lease),paused:lease.reason==="paused",speed:lease.speed,clock,reason:lease.reason||"",error:lease.error||"",steps:Number(lease.steps||0),lastEvent:lease.lastEvent||null,history:(Array.isArray(lease.history)?lease.history:[]).filter(event=>String(event?.matchId||'')===String(meta.matchId||'')&&String(event?.cycleKey||'')===String(meta.cycleKey||''))});
  }
  async gmAuto(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    if(body?.enabled!==false&&auth.meta.demo){const lease=await this.ctx.storage.get("demoLease");if(lease?.engine==="server")await stopServerDemo(this,auth.meta,lease,"auto_gm")}
    const meta=auth.meta,enabled=body?.enabled!==false,wasEnabled=meta.autoGM!==false,nowMs=Date.now(),now=new Date(nowMs).toISOString(),phase=String(meta.cyclePhase||"").toLowerCase(),night=Math.max(0,Number(meta.cycleNight||0)),runtimeKey=night>0?this.nightRuntimeKey(meta,night):"",runtime=phase==="night"&&night>0?await this.getNightRuntime(meta,night,false):null;
    if(wasEnabled&&!enabled){
      if(runtime&&!runtime.completed){
        const deadline=Date.parse(runtime.deadlineAt||""),active=runtime.queue?.[runtime.cursor],fallback=active&&Number(active.durationSec)>0?Number(active.durationSec)*1000:0;
        runtime.autoPausedRemainingMs=Number.isFinite(deadline)?Math.max(0,deadline-nowMs):fallback;runtime.deadlineAt=null;runtime.autoAdvance=false;runtime.updatedAt=now;await this.ctx.storage.put(runtimeKey,runtime)
      }else if(phase==="morning"||phase==="day"){
        const cfg=(await this.ctx.storage.get("gameConfig"))||{};
        meta.autoPausedRemainingMs=dayClockRemainingMs(meta,cfg,nowMs)
      }
    }else if(!wasEnabled&&enabled){
      if(runtime&&!runtime.completed){
        const active=runtime.queue?.[runtime.cursor],fallback=active&&Number(active.durationSec)>0?Number(active.durationSec)*1000:0,stored=Number(runtime.autoPausedRemainingMs),remaining=Number.isFinite(stored)?Math.max(0,stored):fallback;
        runtime.deadlineAt=remaining>0?new Date(nowMs+Math.max(100,remaining)).toISOString():null;runtime.autoPausedRemainingMs=0;runtime.autoAdvance=true;runtime.updatedAt=now;await this.ctx.storage.put(runtimeKey,runtime)
      }else if(phase==="morning"||phase==="day"){
        const cfg=(await this.ctx.storage.get("gameConfig"))||{},remaining=dayClockRemainingMs(meta,cfg,nowMs);
        meta.dayDeadlineAt=new Date(nowMs+remaining).toISOString();meta.autoPausedRemainingMs=null
      }
    }
    meta.autoGM=enabled;meta.updatedAt=now;meta.lastUsedAt=now;await this.ctx.storage.put("meta",meta);
    if(runtime){runtime.autoAdvance=enabled;runtime.updatedAt=now;await this.ctx.storage.put(runtimeKey,runtime)}
    await this.scheduleRoomAlarm(meta);
    const players=(await this.ctx.storage.get("players"))||{},room=publicRoom(meta);
    this.broadcast({type:"auto_gm",enabled,room,players:Object.values(players).map(publicPlayer),nightRuntime:runtime||null,at:now,serverTime:Date.now()});
    this.broadcast({type:"room_state",room,players:Object.values(players).map(publicPlayer),serverTime:Date.now()});
    return j({ok:true,autoGM:enabled,room,nightRuntime:runtime||null})
  }
}
