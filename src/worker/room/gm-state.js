// Trạng thái đầy đủ cho GM.
import { j } from "../http/responses.js";
import { currentArtifactCycleKey } from "../support/game-keys.js";
import { avengerFactions, diseasedLoginIds } from "../../gmww-card-rules-quick.js";
import { projectDemoClock } from "../../gmww-demo-clock.js";
import { serverDemoActive } from "../../gmww-demo-runner.js";
import { drunkDeckView } from "../../gmww-drunk-draw-rules.js";
import { gallowsSnapshot } from "../../gmww-gallows-rules.js";
import { confirmedNightStatusVisuals, publicRoom } from "../../gmww-public-room-contract.js";
import { publicPlayer } from "../../gmww-village-player-state.js";
import { readNightAssignments, resolveWolfNight } from "../../gmww-wolf-night-resolution.js";

export class RoomGmStateMethods {
  async gmState(request){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    let meta=auth.meta;
    // Repair existing rooms whose DO alarm was replaced by a legacy TTL write.
    // Advance only at the authoritative deadline; never trust a client timer.
    if(String(meta.phase||"").toLowerCase()==="running"&&meta.autoGM!==false){
      const due=await this.autoAdvanceDue(meta);
      if(due&&due<=Date.now()+25){
        const advanced=await this.runAutoAdvanceIfDue(meta);
        if(advanced)meta=await this.ctx.storage.get("meta")||meta;
        else await this.scheduleRoomAlarm(meta);
      }else if(due){
        const alarmAt=await this.ctx.storage.getAlarm();
        if(alarmAt===null||alarmAt>due+1000)await this.scheduleRoomAlarm(meta);
      }
    }
    let players=(await this.ctx.storage.get("players"))||{};const pruned=await this.pruneOfflinePlayers(meta,players);players=pruned.players;
    const interactions=(await this.ctx.storage.get("interactions"))||[],effectTypes=new Set(["frozen","expelled","dead","assassin_mark","status"]),activeEffects=[...interactions.filter(x=>effectTypes.has(String(x?.type||""))&&x?.effectActive!==false&&(!x?.expiresAt||Date.parse(x.expiresAt)>Date.now())&&(!x?.matchId||!meta.matchId||String(x.matchId)===String(meta.matchId))),...confirmedNightStatusVisuals(interactions,meta,players)].slice(-100),interactionResponses=interactions.filter(x=>x?.status==="responded").slice(-100),artifactCycleKeyValue=currentArtifactCycleKey(meta),artifactCycle=(await this.ctx.storage.get("artifactCycle:"+artifactCycleKeyValue))||{cycleKey:artifactCycleKeyValue,accepted:[]};
    const battleActionUsage=(await this.ctx.storage.get("battleRoleUsage:"+String(meta.matchId||"")))||[];
    const lastBattleAction=await this.ctx.storage.get("battleLastAction:"+String(meta.matchId||""));
    const battleUndo=lastBattleAction&&!lastBattleAction.undone&&lastBattleAction.cycleKey===String(meta.cycleKey||"")&&String(meta.cyclePhase||"").toLowerCase()==="night"?{token:lastBattleAction.token,label:lastBattleAction.label,targets:lastBattleAction.targetIds,turnId:lastBattleAction.turnId}:null;
    const assignments=(await this.ctx.storage.get("assignments"))||[],nightRuntime=String(meta.cyclePhase||"").toLowerCase()==="night"&&Number(meta.cycleNight||0)>0?await this.getNightRuntime(meta,Number(meta.cycleNight),true):null,winProposal=this.computeWinProposal(meta,assignments,interactions);
    const nightIntel=String(meta.cyclePhase||"")==="night"?resolveWolfNight({interactions,players,assignments:await readNightAssignments(this.ctx.storage,meta.matchId),matchId:String(meta.matchId||""),night:Number(meta.cycleNight||0)}):null;
    if(nightIntel)nightIntel.witchSaveUsed=battleActionUsage.some(x=>String(x?.matchId||"")===String(meta.matchId||"")&&x?.actionId==="action_witch_save"&&x?.undone!==true);
    const drunkDraws=[];
    if(Number(meta.cycleNight)===3&&String(meta.cyclePhase)==='night'){
      const entries=await this.ctx.storage.list({prefix:'drunkDeck:'+String(meta.matchId)+':3:'});
      for(const deck of entries.values())drunkDraws.push(drunkDeckView(deck,true));
    }
    const demoLease=meta.demo?await this.ctx.storage.get("demoLease"):null;
    const storedDemoClock=meta.demo?await this.ctx.storage.get("demoClock"):null,
      demoClock=storedDemoClock?projectDemoClock(storedDemoClock,Date.now()):null;
    if(meta.demo&&meta.autoGM!==true&&nightRuntime&&demoClock?.kind==="night"){
      nightRuntime.deadlineAt=demoClock.deadlineAt?new Date(demoClock.deadlineAt).toISOString():null;
      nightRuntime.autoPausedRemainingMs=demoClock.running?0:demoClock.remainingMs/demoClock.speed;
    }
    return j({ok:true,demoControl:meta.demo?{engine:demoLease?.engine||"server",paused:demoLease?.reason==="paused",reason:demoLease?.reason||"",error:demoLease?.error||"",steps:Number(demoLease?.steps||0),lastEvent:demoLease?.lastEvent||null,history:(Array.isArray(demoLease?.history)?demoLease.history:[]).filter(event=>String(event?.matchId||'')===String(meta.matchId||'')),running:serverDemoActive(meta,demoLease),speed:Math.max(1,Number(demoLease?.speed)||1),until:Number(demoLease?.until)||0,clock:demoClock}:null,serverTime:Date.now(),room:publicRoom(meta),players:Object.values(players).map(publicPlayer),gameConfig:(await this.ctx.storage.get("gameConfig"))||null,assignments,interactions:interactions.slice(-100),
      // Unlike the 100-row rules buffer, the immutable actionLog archive
      // includes older nights and nonpersistent effects (effect_notice, healed...).
      // Never derive the village bulletin from only the short-lived rules buffer.
      villageHistory:await this.villageHistoryForMatch(meta,interactions),
      interactionResponses,activeEffects,drunkDraws,cardState:{diseased:(typeof diseasedLoginIds==="function"?diseasedLoginIds:()=>[])({interactions,matchId:String(meta.matchId||"")}),avengerFactions:(typeof avengerFactions==="function"?avengerFactions:()=>({}))({assignments:(await this.ctx.storage.get("assignments"))||[],interactions,matchId:String(meta.matchId||"")})},artifactCycle:{cycleKey:artifactCycleKeyValue,count:Array.isArray(artifactCycle.accepted)?artifactCycle.accepted.length:0,max:Math.max(0,Math.min(30,Number((await this.ctx.storage.get("gameConfig"))?.artifactLimitPerCycle??3))),accepted:Array.isArray(artifactCycle.accepted)?artifactCycle.accepted.slice(-30):[]},nightRuntime,battleUndo,battleActionUsage,nightIntel,winProposal,dayActionUsage:await this.ctx.storage.get("dayRoleUsage:"+String(meta.matchId||""))||[],gallows:String(meta.cyclePhase)==="morning"?gallowsSnapshot((await this.gallowsState(meta)).ballot,meta):null,connections:this.ctx.getWebSockets().length,kicked:pruned.removed.map(p=>p.participantId)})
  }
}
