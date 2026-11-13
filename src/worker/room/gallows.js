// Treo cổ: trạng thái và điều khiển của GM.
import { j } from "../http/responses.js";
import { gallowsArtifactFlags, princeCloakActive, princeCloakRow } from "../../gmww-artifact-rules.js";
import { blackWomanLeaving, crowExtraVotes } from "../../gmww-card-rules-quick.js";
import { projectDemoClock } from "../../gmww-demo-clock.js";
import { foolEscapeRow, foolEscapes, foolVoteBans, judgeDoubleActive, peaceLoverIds } from "../../gmww-gallows-cards.js";
import { gallowsAutomaticOutcome, gallowsBan, gallowsBegin, gallowsBlockedNomination, gallowsCloseNomination, gallowsManualResolve, gallowsManualVote, gallowsMode, gallowsOpen, gallowsResolve, gallowsSelectCandidate, gallowsSetDuration, gallowsSetMode, gallowsSetRestriction, gallowsSnapshot } from "../../gmww-gallows-rules.js";
import { pruneInteractions } from "../../gmww-interaction-retention.js";
import { normalizeLoginId } from "../../gmww-player-identity-rules.js";
import { publicRoom } from "../../gmww-public-room-contract.js";

export class RoomGallowsMethods {
  // A ballot is scoped to one exact match and morning; old games never leak votes.
  async gallowsState(meta){
    const key="gallows:"+String(meta.matchId||"")+":"+String(meta.cycleKey||"");
    const stored=await this.ctx.storage.get(key);
    // New Gallows ballots own both timers; pre-match game templates no longer set them.
    const nominationDurationSec=60,voteDurationSec=60;
    const ballot=stored&&stored.matchId===String(meta.matchId||"")&&stored.cycleKey===String(meta.cycleKey||"")?stored:{
      id:"gallows-"+crypto.randomUUID(),matchId:String(meta.matchId||""),cycleKey:String(meta.cycleKey||""),
      day:Number(meta.cycleNight||0),stage:"ready",candidateId:null,
      nominationDurationSec,voteDurationSec,
      nominations:{},votes:{},blocked:[],blockedNomination:[],blockedVotes:[],mode:"auto",eligible:[],outcome:null};
    const players=await this.ctx.storage.get("players")||{};
    const interactions=await this.ctx.storage.get("interactions")||[];
    const aliveNow=Object.values(players).filter(p=>p?.kind==="member"&&normalizeLoginId(p?.loginId))
      .map(p=>normalizeLoginId(p.loginId)).filter(loginId=>!interactions.some(row=>
        normalizeLoginId(row?.loginId)===loginId&&row?.effectActive!==false&&
        (!row?.matchId||String(row.matchId)===String(meta.matchId))&&
        ["dead","expelled"].includes(String(row.type))));
    // An Artifact's vote ban is server-enforced and cannot be removed via GM toggle.
    // Restrict to this calendar/game day; previous nights never leak into new voting.
    const artifactVoteBans=[...new Set(interactions.filter(row=>row?.effectActive!==false&&
      row?.artifactId&&String(row?.type)==='status'&&String(row?.statusId)==='vote_ban'&&
      (!row.matchId||String(row.matchId)===String(meta.matchId))&&
      Number(row.night)===Number(meta.cycleNight)).map(row=>normalizeLoginId(row.loginId)).filter(Boolean))];
    // Freeze historical voter eligibility after resolution; the accused never
    // has a valid Save/Kill vote, including in older persisted ballots.
    const gMatch=String(meta.matchId||""),gDay=Number(meta.cycleNight||0);
    // Bà Da Đen: người bị buộc rời làng không bỏ phiếu và không bị chọn trong ngày. Con Quạ: +2 phiếu Treo Cổ.
    const leavingToday=(typeof blackWomanLeaving==="function"?blackWomanLeaving:()=>[])({interactions,matchId:gMatch,day:gDay}),
      extraKillVotes=(typeof crowExtraVotes==="function"?crowExtraVotes:()=>({}))({interactions,matchId:gMatch,day:gDay});
    const eligible=ballot.stage==="resolved"&&Array.isArray(ballot.eligible)&&ballot.eligible.length?
      ballot.eligible:aliveNow.filter(id=>!leavingToday.includes(id));
    const foolBans=(typeof foolVoteBans==="function"?foolVoteBans:()=>[])({interactions,matchId:gMatch}),
      aFlags=(typeof gallowsArtifactFlags==="function"?gallowsArtifactFlags:()=>({forcedKill:[],doubleVoters:[],saveOnly:[],deadVoters:[]}))({assignments:(await this.ctx.storage.get("assignments"))||[],interactions,matchId:gMatch}),
      saveOnlyVoters=[...new Set([...(typeof peaceLoverIds==="function"?peaceLoverIds:()=>[])({assignments:(await this.ctx.storage.get("assignments"))||[]}),...aFlags.saveOnly])];
    let current={...ballot,forcedKillVoters:aFlags.forcedKill,doubleVoters:aFlags.doubleVoters,deadVoters:aFlags.deadVoters,eligible,mode:gallowsMode(ballot),blockedNomination:[...new Set([...gallowsBlockedNomination(ballot),...foolBans])],saveOnlyVoters,blockedVotes:ballot.blockedVotes||[],artifactVoteBans:[...new Set([...artifactVoteBans,...foolBans])],extraKillVotes,leavingToday,nominationDurationSec:ballot.nominationDurationSec??nominationDurationSec,voteDurationSec:ballot.voteDurationSec??voteDurationSec};
    // The room's Durable Object is authoritative. Real auto mode advances when
    // any GM or Player polls state; demos retain their scripted GM-driven clock.
    const now=Date.now();
    if(!meta.demo&&String(meta.phase)==="running"&&String(meta.cyclePhase)==="morning"&&current.mode==="auto"){
      let changed=false;
      if(current.stage==="nominating"&&now>=Number(current.nominationDeadlineAt||Infinity)){
        const closed=gallowsCloseNomination(current,now);
        if(closed.ok){current=closed.value;changed=true}
      }
      if(current.stage==="voting"&&now>=Number(current.deadlineAt||Infinity)){
        const decision=gallowsAutomaticOutcome(current),done=gallowsResolve(current,decision,now);
        if(done.ok){
          current=done.value;changed=true;
          if(decision==="dead"){
            const rows=await this.ctx.storage.get("interactions")||[],loginId=current.candidateId;
            const fool=(typeof foolEscapes==="function"?foolEscapes:()=>false)({assignments:(await this.ctx.storage.get("assignments"))||[],interactions:rows,matchId:String(meta.matchId||""),candidateId:loginId});
            if(typeof princeCloakActive==="function"&&princeCloakActive({assignments:(await this.ctx.storage.get("assignments"))||[],candidateId:loginId})){
              const cr=princeCloakRow({matchId:String(meta.matchId),cycleKey:String(meta.cycleKey),night:Number(meta.cycleNight),candidateId:loginId,gallowsId:current.id,now:new Date(now).toISOString()});
              if(!rows.some(x=>x.id===cr.id)){rows.push(cr);await this.ctx.storage.put("interactions",pruneInteractions(rows));await this.ctx.storage.put("actionLog:"+String(now).padStart(13,"0")+":"+cr.id,cr)}
            }else if(fool){
              const er=foolEscapeRow({matchId:String(meta.matchId),cycleKey:String(meta.cycleKey),night:Number(meta.cycleNight),candidateId:loginId,gallowsId:current.id,now:new Date(now).toISOString()});
              rows.push(er);await this.ctx.storage.put("interactions",pruneInteractions(rows));
              await this.ctx.storage.put("actionLog:"+String(now).padStart(13,"0")+":"+er.id,er);
            }else if(!rows.some(row=>normalizeLoginId(row.loginId)===loginId&&row.effectActive!==false&&
                String(row.type)==="dead"&&(!row.matchId||String(row.matchId)===String(meta.matchId)))){
              const createdAt=new Date(now).toISOString(),fatal={id:"ix-"+crypto.randomUUID(),
                type:"dead",loginId,matchId:String(meta.matchId),cycleKey:String(meta.cycleKey),
                night:Number(meta.cycleNight),source:"gallows",gallowsId:current.id,effectActive:true,
                message:"Người chơi đã bị hành quyết theo kết quả bỏ phiếu tự động.",createdAt};
              rows.push(fatal);if(typeof this.reviveArtifactSweep==="function")await this.reviveArtifactSweep(meta,rows,createdAt);await this.ctx.storage.put("interactions",pruneInteractions(rows));
              await this.ctx.storage.put("actionLog:"+String(now).padStart(13,"0")+":"+fatal.id,fatal);
              this.broadcast({type:"player_status_changed",loginId,statusId:"dead",active:!rows.some(x=>x.id===fatal.id&&x.effectActive===false),serverTime:now});
            }
          }
        }
      }
      if(changed){await this.ctx.storage.put(key,current);
        this.broadcast({type:"gallows_updated",room:publicRoom(meta),gallows:gallowsSnapshot(current,meta,now),serverTime:now})}
    }
    // Thẩm Phán: sau phiên đầu (5 giây công bố kết quả) tự mở phiên Treo Cổ thứ hai đầy đủ, không cần thao tác GM.
    if(!meta.demo&&String(meta.phase)==="running"&&String(meta.cyclePhase)==="morning"&&current.stage==="resolved"&&current.round!==2&&
       Number(current.resolvedAt)>0&&Date.now()>=Number(current.resolvedAt)+5000&&
       (typeof judgeDoubleActive==="function"?judgeDoubleActive:()=>false)({interactions,matchId:gMatch,day:gDay})){
      const t=Date.now();
      current={...current,id:"gallows-"+crypto.randomUUID(),round:2,stage:"ready",nominationDeadlineAt:null,nominationStartedAt:null,hangingStartedAt:null,
        candidateId:null,deadlineAt:null,startedAt:null,nominations:{},votes:{},eligible:[],outcome:null,resolvedAt:null,updatedAt:t};
      await this.ctx.storage.put(key,current);
      this.broadcast({type:"gallows_updated",gallows:gallowsSnapshot(current,meta,t),room:publicRoom(meta),serverTime:t});
    }
    return {key,ballot:current,eligible};
  }
  async gmGallows(request,body){
    const auth=await this.gmAuthorized(request);if(!auth.ok)return auth.response;
    const meta=auth.meta;
    if(String(meta.phase)!=="running"||String(meta.cyclePhase)!=="morning")
      return j({ok:false,error:"GALLOWS_DAY_ONLY"},409);
    const {key,ballot,eligible}=await this.gallowsState(meta),command=String(body?.command||"");
    const target=normalizeLoginId(body?.targetId||body?.loginId);
    const now=Date.now();
    if(command==="acknowledge"){
      if(ballot.stage!=="resolved")return j({ok:false,error:"GALLOWS_VERDICT_NOT_READY"},409);
      const updated={...ballot,acknowledgedAt:now,updatedAt:now};
      await this.ctx.storage.put(key,updated);
      this.broadcast({type:"gallows_updated",gallows:gallowsSnapshot(updated,meta,now),serverTime:now});
      return j({ok:true,gallows:gallowsSnapshot(updated,meta,now)});
    }
    if(meta.demo&&body?.source==="demo"&&["open","begin","resolve"].includes(command)){
      const c=await this.ctx.storage.get("demoClock");if(c&&projectDemoClock(c,now).remainingMs>0)return j({ok:false,error:"DEMO_TIMER_RUNNING"},409);
    }
    let result;
    if(command==="set_duration"){
      result=gallowsSetDuration(ballot,String(body?.kind||""),body?.seconds,now);
    }else if(command==="close_nomination"){
      result=gallowsCloseNomination(ballot,now);
    }else if(command==="open"){
      result=gallowsOpen(ballot,now);
    }else if(command==="begin"){
      if(!eligible.includes(target))return j({ok:false,error:"INVALID_GALLOWS_CANDIDATE"},400);
      result=gallowsBegin(ballot,target,now);
    }else if(command==="hang"){
      if(!eligible.includes(target))return j({ok:false,error:"INVALID_GALLOWS_CANDIDATE"},400);
      result=gallowsSelectCandidate(ballot,target,now);
    }else if(command==="ban"){
      result=gallowsBan(ballot,target,now);
    }else if(command==="restriction"){
      result=gallowsSetRestriction(ballot,target,String(body?.kind||""),body?.banned===true,now);
    }else if(command==="mode"){
      result=gallowsSetMode(ballot,String(body?.mode||""),now);
    }else if(command==="manual_vote"){
      result=gallowsManualVote(ballot,target,body?.choice===null?null:String(body?.choice||""),now);
    }else if(command==="resolve"||command==="close_vote"){
      // GM manual verdict: no nomination clock, no public ballot, no waiting.
      // In automatic mode only the existing authorized DEMO driver may resolve.
      if(command==='close_vote'&&(gallowsMode(ballot)!=='auto'||!['voting','closed'].includes(ballot.stage)))
        return j({ok:false,error:'VOTING_NOT_OPEN'},409);
      if(command==='resolve'&&gallowsMode(ballot)==='auto'&&!(meta.demo&&body?.source==='demo'))
        return j({ok:false,error:'AUTO_VERDICT_SERVER_ONLY'},403);
      result=command==='close_vote'?
        gallowsResolve({...ballot,stage:'closed',deadlineAt:now},gallowsAutomaticOutcome(ballot),now):
        gallowsMode(ballot)==='gm'?
          gallowsManualResolve(ballot,target,String(body?.outcome||''),now):
          gallowsResolve(ballot,String(body?.outcome||''),now);
      if(result.ok&&result.value.outcome==="dead"){
        const rows=await this.ctx.storage.get("interactions")||[],loginId=result.value.candidateId;
        const foolGm=(typeof foolEscapes==="function"?foolEscapes:()=>false)({assignments:(await this.ctx.storage.get("assignments"))||[],interactions:rows,matchId:String(meta.matchId||""),candidateId:loginId});
        if(typeof princeCloakActive==="function"&&princeCloakActive({assignments:(await this.ctx.storage.get("assignments"))||[],candidateId:loginId})){
          const cr=princeCloakRow({matchId:String(meta.matchId),cycleKey:String(meta.cycleKey),night:Number(meta.cycleNight),candidateId:loginId,gallowsId:ballot.id,now:new Date(now).toISOString()});
          if(!rows.some(x=>x.id===cr.id)){rows.push(cr);await this.ctx.storage.put("interactions",pruneInteractions(rows));await this.ctx.storage.put("actionLog:"+String(now).padStart(13,"0")+":"+cr.id,cr)}
        }else if(foolGm){
          const er=foolEscapeRow({matchId:String(meta.matchId),cycleKey:String(meta.cycleKey),night:Number(meta.cycleNight),candidateId:loginId,gallowsId:ballot.id,now:new Date(now).toISOString()});
          rows.push(er);await this.ctx.storage.put("interactions",pruneInteractions(rows));
          await this.ctx.storage.put("actionLog:"+String(now).padStart(13,"0")+":"+er.id,er);
        }else if(!rows.some(x=>normalizeLoginId(x.loginId)===loginId&&x.effectActive!==false&&
           String(x.type)==="dead"&&(!x.matchId||String(x.matchId)===String(meta.matchId)))){
          const createdAt=new Date(now).toISOString(),fatal={id:"ix-"+crypto.randomUUID(),
            type:"dead",loginId,matchId:String(meta.matchId),cycleKey:String(meta.cycleKey),
            night:Number(meta.cycleNight),source:"gallows",gallowsId:ballot.id,effectActive:true,
            message:"Người chơi đã bị hành quyết trên giàn.",createdAt};
          rows.push(fatal);
          await this.ctx.storage.put("actionLog:"+String(now).padStart(13,"0")+":"+fatal.id,fatal);
          if(typeof this.reviveArtifactSweep==="function")await this.reviveArtifactSweep(meta,rows,createdAt);
          if(typeof this.applyHunterDeathConsequences==='function')await this.applyHunterDeathConsequences(meta,rows,createdAt);
          await this.ctx.storage.put("interactions",pruneInteractions(rows));
          this.broadcast({type:"player_status_changed",loginId,statusId:"dead",active:fatal.effectActive!==false,serverTime:now});
        }
      }
    }else if(command==="judge_second"){
      const rowsJ=await this.ctx.storage.get("interactions")||[];
      if(ballot.stage!=="resolved"||ballot.round===2||!(typeof judgeDoubleActive==="function"?judgeDoubleActive:()=>false)({interactions:rowsJ,matchId:String(meta.matchId||""),day:Number(meta.cycleNight||0)}))
        return j({ok:false,error:"JUDGE_SECOND_NOT_AVAILABLE"},409);
      result={ok:true,value:{...ballot,id:"gallows-"+crypto.randomUUID(),round:2,stage:"ready",
        nominationDeadlineAt:null,nominationStartedAt:null,hangingStartedAt:null,
        candidateId:null,deadlineAt:null,startedAt:null,nominations:{},votes:{},eligible:[],
        outcome:null,resolvedAt:null,updatedAt:now}};
    }else if(command==="restore"){
      // Undo only the gallows-owned consequence; never erase deaths from other roles.
      const rows=await this.ctx.storage.get("interactions")||[];
      const owned=rows.filter(x=>x.gallowsId===ballot.id&&String(x.type)==="dead"&&x.effectActive!==false);
      for(const x of rows)if(x.gallowsId===ballot.id&&x.actionId==="action-fool-escape"){x.undone=true;x.effectActive=false}
      for(const row of owned){row.effectActive=false;row.expiredAt=new Date(now).toISOString();row.expiredReason="GM_GALLOWS_RESTORE"}
      if(owned.length){
        for(const followup of rows){
          if(followup.source!=="hunter-death-engine"||!owned.some(x=>x.id===followup.causeDeathId))continue;
          followup.effectActive=false;followup.expiredAt=new Date(now).toISOString();
          followup.expiredReason="GM_GALLOWS_RESTORE";
        }
        await this.ctx.storage.put("interactions",pruneInteractions(rows));
        this.broadcast({type:"player_revived",loginId:ballot.candidateId,serverTime:now})}
      result={ok:true,value:{...ballot,id:"gallows-"+crypto.randomUUID(),stage:"ready",
        nominationDeadlineAt:null,nominationStartedAt:null,
        candidateId:null,deadlineAt:null,startedAt:null,nominations:{},votes:{},
        outcome:null,resolvedAt:null,updatedAt:now}};
    }else return j({ok:false,error:"INVALID_GALLOWS_COMMAND"},400);
    if(!result.ok)return j({ok:false,error:result.error},409);
    await this.ctx.storage.put(key,result.value);
    if(meta.demo)await this.syncDemoClock(meta,await this.ctx.storage.get("demoLease")||{});
    const publicBallot=gallowsSnapshot(meta.demo?await this.ctx.storage.get(key):result.value,meta,now);
    this.broadcast({type:"gallows_updated",room:publicRoom(meta),gallows:publicBallot,serverTime:now});
    return j({ok:true,gallows:publicBallot,serverTime:now});
  }
}
