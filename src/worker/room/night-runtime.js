// Timeline đêm: dựng lượt, kế thừa vai, bảo vật dùng trong đêm, chuyển lượt.
import { j } from "../http/responses.js";
import { currentArtifactCycleKey } from "../support/game-keys.js";
import { reviveOwnerPlans, swapRolePlans } from "../../gmww-artifact-rules.js";
import { apprenticeSuccession } from "../../gmww-card-rules-quick.js";
import { buildPrivateDeliverySnapshot } from "../../gmww-delivery-snapshot.js";
import { drunkDeadCards } from "../../gmww-drunk-draw-rules.js";
import { defaultPriorityFirst } from "../../gmww-game-scene-rules.js";
import { insertMirrorSteps, mirrorLinkPrefix } from "../../gmww-mirror-rules.js";
import { combineConfiguredTurns, groupConfiguredRoleTurns, jumpTarget } from "../../gmww-night-turn-rules.js";
import { arrangeNightRoles, isWolfRole, packMembers } from "../../gmww-pack-night-rules.js";
import { normalizeLoginId } from "../../gmww-player-identity-rules.js";
import { publicRoom } from "../../gmww-public-room-contract.js";
import { inheritedRolePlans } from "../../gmww-role-inheritance-rules.js";
import { maidSuccession } from "../../gmww-swap-info-rules.js";
import { thiefPlan } from "../../gmww-thief-rules.js";
import { partitionNightSpecialRoles } from "../../gmww-witch-drunk-clone-rules.js";
import { canSnowWolfBite, readNightAssignments } from "../../gmww-wolf-night-resolution.js";
import { shouldWakeWolfPack, wolfPackMembers } from "../../gmww-wolf-recognition.js";

export class RoomNightRuntimeMethods {
  nightRuntimeKey(meta,night){return "nightRuntime:"+String(meta?.matchId||"match")+":"+Math.max(1,Number(night)||1)}
  async getNightRuntime(meta,night,create=false){
    const key=this.nightRuntimeKey(meta,night);let runtime=await this.ctx.storage.get(key);
    if(!runtime&&create)runtime=await this.buildNightRuntime(meta,night);
    return runtime||null
  }
  // Called only while constructing a new authoritative Night. Converted roles
  // keep each owner's membership, seat, artifact and player identity unchanged.
  async applyNightRoleInheritance(meta,night,assignments,{drunkChoice=null,thiefChoice=null}={}){
    const n=Math.max(1,Number(night)||1),matchId=String(meta?.matchId||'');
    if(!matchId||n<1)return {assignments,drunkNotices:[]};
    const key='roleInheritanceNight:'+matchId+':'+n;
    const past=await this.ctx.storage.get(key);
    if(past&&!drunkChoice&&!thiefChoice)return {assignments:(await this.ctx.storage.get('assignments'))||assignments,
      drunkNotices:Array.isArray(past.drunkNotices)?past.drunkNotices:[]};
    const events=await this.ctx.storage.get('interactions')||[];
    let plans=inheritedRolePlans({assignments,interactions:events,matchId,night:n,drunkChoice});
    if(!drunkChoice)plans=[...plans,...(typeof maidSuccession==="function"?maidSuccession:()=>[])({assignments,interactions:events,matchId,night:n}),...(typeof apprenticeSuccession==="function"?apprenticeSuccession:()=>[])({assignments,interactions:events,matchId,night:n})];
    if(!drunkChoice&&!thiefChoice&&typeof swapRolePlans==="function")plans=[...plans,...swapRolePlans({assignments,interactions:events,matchId,night:n})];
    if(drunkChoice)plans=plans.filter(x=>x.kind==='drunk'&&x.actorId===normalizeLoginId(drunkChoice.actorId));
    if(thiefChoice)plans=[thiefPlan({actorId:thiefChoice.actorId,roleId:thiefChoice.roleId,night:n})];
    if(!plans.length)return {assignments,drunkNotices:[],applied:0};
    let updated=assignments.map(x=>({...x})),drunkNotices=[],applied=0;
    const changed=new Map(),publishedAt=new Date().toISOString();
    for(const plan of plans){
      const original=updated.find(x=>normalizeLoginId(x.loginId)===plan.actorId&&
        x.roleId===plan.fromRoleId);
      if(!original)continue;
      const stored=await this.ctx.storage.get('roles:'+plan.actorId)||[];
      const owned=Array.isArray(stored)?stored:[];
      const own=owned.find(x=>String(x.roleId)===plan.fromRoleId&&
        Number(x.assignmentIndex)===Number(original.assignmentIndex));
      if(!own)continue;
      const source=plan.sourceId?updated.find(x=>normalizeLoginId(x.loginId)===plan.sourceId&&
        x.roleId===plan.sourceRoleId):null;
      const sourceRoles=source?await this.ctx.storage.get('roles:'+plan.sourceId)||[]:[];
      let donor=Array.isArray(sourceRoles)?sourceRoles.find(x=>
        x.roleId===plan.sourceRoleId&&Number(x.assignmentIndex)===Number(source?.assignmentIndex)):null;
      if(plan.sourceId&&!donor)continue;
      if(!plan.sourceId){
        const toRoleId=plan.targetRoleId||'role_villager',pkg=await this.ctx.storage.get('roleCatalog:'+toRoleId)||{};
        if(toRoleId!=='role_villager'&&!pkg.roleCard)continue; // Chưa có gói Vai Trò mới thì không đổi, tránh mất vai.
        donor=toRoleId==='role_villager'?{...own,roleId:'role_villager',roleName:'Dân Làng',faction:'village',
          description:'Không có chức năng đặc biệt.',roleImage:pkg.roleImage||own.roleImage,
          artworkAssetId:pkg.artworkAssetId||own.artworkAssetId,
          artworkId:pkg.artworkAssetId||own.artworkId,
          roleCard:pkg.roleCard||{name:'Dân Làng',faction:'village',
            information:'Không có chức năng đặc biệt.',functions:[],
            flags:{allowMultipleActions:false,nightImmune:false}}}:
          {...own,roleId:toRoleId,roleName:pkg.roleName||pkg.roleCard?.name||'Vai Trò',faction:pkg.faction||pkg.roleCard?.faction||own.faction,
            description:pkg.description||pkg.roleCard?.information||'',roleImage:pkg.roleImage||own.roleImage,
            artworkAssetId:pkg.artworkAssetId||own.artworkAssetId,artworkId:pkg.artworkAssetId||own.artworkId,roleCard:pkg.roleCard};
      }
      const converted={...donor,loginId:plan.actorId,displayName:own.displayName,
        assignmentIndex:own.assignmentIndex,matchId,matchRevision:own.matchRevision,
        artifact:own.artifact||null,deliveredAt:publishedAt,viewedAt:null,
        inheritedFromRoleId:plan.fromRoleId,inheritedFromLoginId:plan.sourceId||null};
      const nextRoles=owned.map(x=>x===own?converted:x);
      changed.set(plan.actorId,nextRoles);
      const index=updated.findIndex(x=>x.assignmentIndex===original.assignmentIndex&&
        normalizeLoginId(x.loginId)===plan.actorId);
      if(index<0)continue;
      updated[index]={...original,roleId:converted.roleId,roleName:converted.roleName,
        faction:converted.faction,deliveredAt:publishedAt,viewedAt:null,
        inheritedFromRoleId:plan.fromRoleId};
      applied++;
      if(plan.kind==='drunk')drunkNotices.push({id:'drunk-reveal:'+plan.actorId,
        kind:'drunk-draw',roleId:'role_drunk',loginIds:[plan.actorId],
        playerIds:['member:'+plan.actorId],label:'Say Rượu · Bốc Vai Trò',
        drawResult:converted.roleName,order:-2,status:'pending'});
    }
    if(applied){
      await this.ctx.storage.put('assignments',updated);
      for(const [actorId,roles] of changed){
        await this.ctx.storage.put('roles:'+actorId,roles);
        await this.ctx.storage.put('role:'+actorId,roles[0]);
      }
      meta.deliveryVersion=Math.max(1,Number(meta.deliveryVersion)||1)+1;
      meta.roleDeliveredAt=publishedAt;
      meta.updatedAt=publishedAt;
      for(const row of updated){
        const id=normalizeLoginId(row.loginId);
        if(!id)continue;
        const roles=changed.get(id)||await this.ctx.storage.get('roles:'+id)||[];
        if(!Array.isArray(roles)||!roles.length)continue;
        await this.ctx.storage.put('deliverySnapshot:'+id,
          buildPrivateDeliverySnapshot({matchId,matchRevision:Number(meta.matchRevision||0),
            deliveryVersion:meta.deliveryVersion,publishedAt,roles}));
      }
      await this.ctx.storage.put('meta',meta);
      this.broadcast({type:'room_state',room:publicRoom(meta),serverTime:Date.now()});
    }
    if(!drunkChoice&&!thiefChoice)await this.ctx.storage.put(key,{drunkNotices,applied});
    return {assignments:updated,drunkNotices,applied};
  }
  async buildNightRuntime(meta,night){
    let assignments=(await this.ctx.storage.get("assignments"))||[];
    const cfg=(await this.ctx.storage.get("gameConfig"))||{},now=new Date().toISOString(),n=Math.max(1,Number(night)||1),queue=[],timing=cfg?.timing||{},defaultActionSec=Math.max(0,Number(timing.defaultActionSec??45)||0),wolfDiscussionSec=Math.max(0,Number(timing.wolfDiscussionSec??30)||0),earlyArtifactSec=30,artifactActionSec=Math.max(0,Number(timing.artifactActionSec??30)||0),roleDuration=new Map((Array.isArray(cfg.roles)?cfg.roles:[]).map(r=>[String(r?.roleId||""),Math.max(0,Number(r?.actionDurationSec??defaultActionSec)||0)]));
    const inheritance=await this.applyNightRoleInheritance(meta,n,assignments);
    assignments=inheritance.assignments;
    // ART-01: explicit match disable wins; legacy matches with assigned Artifacts remain compatible.
    const artifactMode=cfg.artifactsEnabled===true||(cfg.artifactsEnabled!==false&&assignments.some(a=>a?.artifactId));
    const artifactRows=[];
    for(const [index,a] of assignments.entries()){
      if(!artifactMode||!a?.artifactId)continue;
      const loginId=normalizeLoginId(a.loginId),assigned=await this.ctx.storage.get("artifact:"+loginId);
      const singleUse=a.artifactSingleUse===true||assigned?.singleUse===true;
      if(assigned?.removedFromMatch===true)continue;
      if(singleUse&&await this.ctx.storage.get("artifactUse:"+loginId+":"+String(a.artifactId)))continue;
      const priorityFirst=typeof a.artifactPriorityFirst==="boolean"?a.artifactPriorityFirst:typeof assigned?.priorityFirst==="boolean"?assigned.priorityFirst:defaultPriorityFirst(a.artifactName);
      artifactRows.push({...a,_index:index,_priorityFirst:priorityFirst});
    }
    // ART-01: Night 1 always opens the Artifact stage when the match enabled it;
    // later nights only open while an eligible, unconsumed priority Artifact remains.
    const priorityOwners=artifactRows.filter(a=>a._priorityFirst);
    if(artifactMode&&(n===1||priorityOwners.length>0))
      queue.push({id:"early-artifact-window",kind:"early-artifact-window",label:"Artifact đầu ván",durationSec:earlyArtifactSec,status:"pending",actions:priorityOwners.map(row=>({artifactId:String(row.artifactId),artifactName:String(row.artifactName||"Artifact"),loginId:normalizeLoginId(row.loginId),playerId:"member:"+normalizeLoginId(row.loginId)}))});
    // WOLF-01: one waking turn only when at least two living wolves can meet.
    // A newly converted member wakes the pack again on the next night only.
    const wolfMembers=wolfPackMembers(assignments,await this.ctx.storage.get("interactions")||[],meta.matchId);
    const previousNight=n>1?await this.getNightRuntime(meta,n-1,false):null;
    const previousIds=Array.isArray(previousNight?.wolfPackIds)?previousNight.wolfPackIds:wolfMembers.map(a=>a.loginId);
    if(shouldWakeWolfPack(n,wolfMembers,previousIds))queue.push({
      id:"wolf-introduction",kind:"wolf-introduction",label:"Bầy sói ơi dậy đi",
      recognitionIds:wolfMembers.map(a=>a.loginId),durationSec:wolfDiscussionSec,status:"pending"});
    const roleOrder=new Map((Array.isArray(cfg.roles)?cfg.roles:[]).map((r,i)=>[String(r?.roleId||""),Number(r?.order||i+1)])),groups=new Map();
    for(const a of assignments){const rid=String(a?.roleId||"");if(!rid||rid==="role_villager")continue; // Ordinary villagers never have a night wake-up turn; their Artifacts are scheduled separately.
      const lid=normalizeLoginId(a?.loginId),drunkInheritedWolf=rid==="role_snow_wolf"&&a.inheritedFromRoleId==="role_drunk";
      const groupId=drunkInheritedWolf?rid+":drunk:"+lid:rid;
      let g=groups.get(groupId);
      if(!g){g={id:"role:"+groupId,kind:"role",label:String(a?.roleName||"Vai Trò"),roleId:rid,
        drunkInheritedWolf,order:Number(roleOrder.get(rid)??a?.order??9999),
        loginIds:[],playerIds:[],durationSec:roleDuration.get(rid)??defaultActionSec,status:"pending"};
        groups.set(groupId,g)}
      if(lid&&!g.loginIds.includes(lid)){g.loginIds.push(lid);g.playerIds.push("member:"+lid)}}
    const roleTurns=[...groups.values()].sort((a,b)=>a.order-b.order||a.label.localeCompare(b.label,"vi"));
    const artifactOrder=new Map((Array.isArray(cfg.artifacts)?cfg.artifacts:[]).map((a,i)=>[String(a?.artifactId||""),Number(a?.order||i+1)]));
    artifactRows.sort((a,b)=>(artifactOrder.get(String(a.artifactId))??9999)-(artifactOrder.get(String(b.artifactId))??9999)||a._index-b._index);
    // Attach owned Artifacts to their role's action box. Legacy unmatched owners
    // retain a standalone turn so their Artifact is never silently lost.
    const attachedArtifacts=new Set();
    for(const role of roleTurns){
      role.artifacts=artifactRows.filter(row=>role.loginIds.includes(normalizeLoginId(row.loginId))).map(row=>{
        const loginId=normalizeLoginId(row.loginId);
        attachedArtifacts.add(String(row.artifactId)+":"+loginId);
        return {artifactId:String(row.artifactId),artifactName:String(row.artifactName||"Artifact"),loginId,playerId:"member:"+loginId,priorityFirst:row._priorityFirst===true};
      });
    }
    const artifactTurns=artifactRows.filter(row=>!attachedArtifacts.has(String(row.artifactId)+":"+normalizeLoginId(row.loginId))).map(row=>({id:"artifact:"+String(row.artifactId)+":"+normalizeLoginId(row.loginId),kind:"artifact-main",label:String(row.artifactName||"Artifact"),artifactId:String(row.artifactId),artifactName:String(row.artifactName||"Artifact"),loginId:normalizeLoginId(row.loginId),playerId:"member:"+normalizeLoginId(row.loginId),order:artifactOrder.get(String(row.artifactId))??9999,skipIfEarlyUsed:row._priorityFirst===true,durationSec:artifactActionSec,status:"pending"}));
    // WITCH-01: every Old Witch owner wakes immediately after the optional Wolf
    // recognition, regardless of the configured order or ties with other roles.
    // Drunk draws exactly at Night 3, before Old Witch, without changing ART-01/WOLF-01.
    // Clone selects its target only on Night 1. Regular Witch wakes AFTER Fairy.
    const specials=partitionNightSpecialRoles(roleTurns,n);
    if(n===3&&specials.drunk){
      const interactions=await this.ctx.storage.get('interactions')||[];
      for(const loginId of specials.drunk.loginIds||[]){
        const actorId=normalizeLoginId(loginId),deckKey='drunkDeck:'+String(meta.matchId)+':3:'+actorId;
        let deck=await this.ctx.storage.get(deckKey);
        if(!deck){
          const candidates=drunkDeadCards({assignments,interactions,matchId:meta.matchId,night:n});
          const cards=candidates.map(c=>({...c,id:'card-'+crypto.randomUUID()}));
          for(let i=cards.length-1;i>0;i--){
            const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);
            [cards[i],cards[j]]=[cards[j],cards[i]];
          }
          deck={matchId:String(meta.matchId),night:n,actorId,turnId:specials.drunk.id,
            cards,selectedId:null};
          await this.ctx.storage.put(deckKey,deck);
        }
      }
    }
    queue.push(...inheritance.drunkNotices.map(row=>({...row,durationSec:defaultActionSec})));
    if(specials.drunk)queue.push(specials.drunk);
    if(specials.oldWitch)queue.push(specials.oldWitch);
    // NIGHT-02: Snow Wolf → Guard → shared Pack Bite → other Wolf powers → Fairy → Witch.
    const arranged=arrangeNightRoles(specials.remaining,artifactTurns);
    queue.push(...arranged.fixed);
    const packInteractions=await this.ctx.storage.get("interactions")||[];
    const eligiblePack=packMembers(assignments,packInteractions,meta.matchId);
    if(assignments.some(isWolfRole)){
      const snowCanBite=canSnowWolfBite({assignments,interactions:packInteractions,matchId:meta.matchId});
      const packOwners=eligiblePack.filter(x=>x.roleId!=="role_snow_wolf"||snowCanBite);
      // WOLF-02: the label depends on the wolf count dealt at match start, never on
      // how many are alive, so deaths cannot reveal which wolf died. A match dealt a
      // single wolf has no "Bầy Sói" turn: that wolf is called once under its own name.
      const initialWolfKey="initialWolfCount:"+String(meta.matchId||"");
      let initialWolfCount=Number(await this.ctx.storage.get(initialWolfKey));
      if(!Number.isFinite(initialWolfCount)||initialWolfCount<1){
        initialWolfCount=assignments.filter(isWolfRole).length;
        if(n===1)await this.ctx.storage.put(initialWolfKey,initialWolfCount);
      }
      const soloWolf=initialWolfCount<2,
        soloLabel=String((assignments.find(isWolfRole)||{}).roleName||"Sói").slice(0,80);
      queue.push({id:"wolf-pack-bite",kind:"wolf-pack-bite",label:soloWolf?soloLabel:"Bầy Sói Cắn",soloWolf,
        // Every living Wolf wakes; Snow Wolf observes but cannot submit Bite
        // while another wolf survives.
        loginIds:eligiblePack.map(x=>normalizeLoginId(x.loginId)),playerIds:eligiblePack.map(x=>"member:"+normalizeLoginId(x.loginId)),
        biteActorIds:packOwners.map(x=>normalizeLoginId(x.loginId)),
        roles:eligiblePack.map(x=>({roleId:String(x.roleId),loginIds:[normalizeLoginId(x.loginId)]})),
        order:-1,durationSec:defaultActionSec,status:"pending"});
    }
    // Data-driven: only Wolfs with a configured non-Bite power need a second
    // private wake-up. A Wolf with only the shared Bite never wakes twice.
    const privateAssignments=await readNightAssignments(this.ctx.storage,meta.matchId);
    // WOLF-02: plain Sói Thường has no power beyond the shared bite (card text), so a
    // stray extra function on its stored card must never wake it a second time.
    const packStep=queue.find(x=>x.kind==="wolf-pack-bite"&&x.soloWolf===true);
    // WOLF-03: a match dealt one wolf has ONE wolf turn; its Artifacts ride on that turn instead of a second "Sói Thường" turn.
    const soloMerged=new Set();
    if(packStep)for(const row of arranged.wolves){
      if(!row.artifacts?.length||row.roleId!==(assignments.find(isWolfRole)||{}).roleId)continue;
      packStep.artifacts=[...(packStep.artifacts||[]),...row.artifacts];soloMerged.add(row)}
    const distinctWolf=arranged.wolves.filter(row=>!soloMerged.has(row)).filter(row=>row.artifacts?.length||
      row.roleId!=="role_wolf"&&privateAssignments.filter(a=>String(a.roleId||"")===String(row.roleId||"")).some(a=>
        (Array.isArray(a.roleCard?.functions)?a.roleCard.functions:[]).some(fn=>
          fn&&!fn.passive&&String(fn.actionId||fn.id||"")!=="action_wolf_bite"&&
          (!fn.phase||["night","any"].includes(fn.phase))&&
          (!fn.fromNight||Number(fn.fromNight)<=n)&&(!fn.toNight||Number(fn.toNight)>=n))));
    queue.push(...groupConfiguredRoleTurns(distinctWolf));
    if(arranged.fairy)queue.push(arranged.fairy);
    if(specials.witch)queue.push(specials.witch);
    queue.push(...combineConfiguredTurns(groupConfiguredRoleTurns(arranged.rest),arranged.artifactTurns));
    // Tráng Gương: copied-role owners wake again right after that role, every night after the one they copied on.
    const mirrorLinks=[...(await this.ctx.storage.list({prefix:mirrorLinkPrefix(meta.matchId)})).values()].filter(link=>Number(link?.createdNight)<n);
    if(mirrorLinks.length)insertMirrorSteps(queue,mirrorLinks,{minIndex:0,durationFor:id=>roleDuration.get(String(id))??defaultActionSec});
    queue.push({id:"village-wakeup",kind:"village-wakeup",label:"Làng ơi dậy đi",durationSec:0,status:"pending"});
    const first=queue[0]||null;if(first)first.startedAt=now;
    const firstDurationMs=first&&Number(first.durationSec)>0?Number(first.durationSec)*1000:0,autoEnabled=meta?.autoGM!==false;
    const runtime={matchId:String(meta?.matchId||""),night:n,wolfPackIds:wolfMembers.map(a=>a.loginId),queue,cursor:0,completed:queue.length===0,currentId:first?.id||null,autoAdvance:autoEnabled,startedAt:now,deadlineAt:autoEnabled&&firstDurationMs>0?new Date(Date.parse(now)+firstDurationMs).toISOString():null,autoPausedRemainingMs:!autoEnabled&&firstDurationMs>0?firstDurationMs:0,createdAt:now,updatedAt:now};
    await this.ctx.storage.put(this.nightRuntimeKey(meta,n),runtime);return runtime
  }
  async artifactUsedInNight(meta,step){
    if(!step?.artifactId||!step?.playerId)return false;
    const key=currentArtifactCycleKey(meta),cycle=(await this.ctx.storage.get("artifactCycle:"+key))||{accepted:[]};
    return (Array.isArray(cycle.accepted)?cycle.accepted:[]).some(x=>String(x?.artifactId||"")===String(step.artifactId)&&String(x?.playerId||("member:"+normalizeLoginId(x?.loginId)))===String(step.playerId))
  }
  async markGmArtifactTurnUsed(meta,step,targetLoginId,actionNonce="",confirmation={}){
    if(!step)return null;
    const nonce=String(actionNonce||"").trim().slice(0,100);
    const owned=await this.ctx.storage.get("artifact:"+normalizeLoginId(step.loginId));
    if(!owned||String(owned.artifactId)!==String(step.artifactId))return j({ok:false,error:"INVALID_ARTIFACT_OWNER"},403);
    if(owned.removedFromMatch===true)return j({ok:false,error:"ARTIFACT_REMOVED_FROM_MATCH"},409);
    const configuredFunction=(owned.artifactCard?.functions||[]).find(a=>String(a.actionId||a.id)===String(confirmation.actionId||""));
    const legacyAction=(owned.artifactCard?.actions||[]).find(a=>String(a.id)===String(confirmation.actionId||""));
    const configuredAction=configuredFunction?{...legacyAction,...configuredFunction}:legacyAction;
    if(!configuredAction)return j({ok:false,error:"INVALID_ARTIFACT_ACTION"},400);
    if(configuredAction.passive===true||(configuredAction.phase&&!["night","any","both"].includes(configuredAction.phase)))return j({ok:false,error:"ARTIFACT_ACTION_WRONG_PHASE"},409);
    if((configuredAction.fromNight!=null&&Number(meta.cycleNight)<Number(configuredAction.fromNight))||(configuredAction.toNight!=null&&Number(meta.cycleNight)>Number(configuredAction.toNight)))return j({ok:false,error:"ARTIFACT_OUTSIDE_NIGHT_WINDOW"},409);
    const targets=Array.isArray(confirmation.targetIds)?confirmation.targetIds.map(normalizeLoginId):[normalizeLoginId(targetLoginId)];
    if(!targets.length||targets.length>30||new Set(targets).size!==targets.length||!targets.includes(normalizeLoginId(targetLoginId)))return j({ok:false,error:"INVALID_ARTIFACT_TARGETS"},400);
    // Enforce explicit per-action limits on the server, not just the GM UI.
    // Older Artifact cards without targetCount retain their existing behavior.
    if(configuredAction.targetCount!==undefined&&configuredAction.targetCount!==null){
      const count=Number(configuredAction.targetCount);
      const noTarget=configuredAction.noTarget===true&&count===0&&targets.length===1&&targets[0]===normalizeLoginId(step.loginId);
      if(!noTarget&&(!Number.isInteger(count)||count<1||count>30||targets.length!==count))
        return j({ok:false,error:"INVALID_ARTIFACT_TARGET_COUNT"},400);
    }
    if(!configuredAction.noTarget&&configuredAction.noSelf!==false&&targets.includes(normalizeLoginId(step.loginId)))
      return j({ok:false,error:"ARTIFACT_SELF_TARGET_FORBIDDEN"},403);
    const players=(await this.ctx.storage.get("players"))||{};
    if(targets.some(id=>!players["member:"+id]))return j({ok:false,error:"INVALID_ARTIFACT_TARGET"},400);
    const binding={actionId:String(confirmation.actionId||""),type:String(confirmation.type||""),targetIds:targets.slice().sort()};
    const requestId="gm:"+String(meta.matchId||"match")+":"+String(step.id)+(nonce?":"+nonce:"");
    const key=currentArtifactCycleKey(meta),cycle=(await this.ctx.storage.get("artifactCycle:"+key))||{accepted:[]};
    const existing=(Array.isArray(cycle.accepted)?cycle.accepted:[]).find(x=>String(x.artifactId||"")===String(step.artifactId)&&String(x.playerId||"")===String(step.playerId));
    // A single confirmed action can select several targets. Its second target
    // must not consume the same Artifact twice; a DIFFERENT action is refused.
    if(existing){
      const sameConfirmation=nonce&&String(existing.requestId||"")===requestId&&JSON.stringify(existing.gmConfirmation)===JSON.stringify(binding);
      return sameConfirmation?null:j({ok:false,error:"ARTIFACT_ALREADY_USED",message:"Artifact đã dùng trong đêm này."},409);
    }
    const activation=await this.playerArtifactActivate({loginId:normalizeLoginId(step.loginId),requestId,targetId:"member:"+normalizeLoginId(targetLoginId),gmConfirmation:binding});
    return activation.ok?null:activation;
  }
  async advanceNightRuntime(meta,action="next",source="gm",targetIndex=null){
    const night=Math.max(1,Number(meta.cycleNight||1)),runtime=await this.getNightRuntime(meta,night,true),now=new Date().toISOString();
    if(action==="jump"){
      const step=jumpTarget(runtime.queue,targetIndex);
      if(step&&targetIndex!==runtime.cursor){
        if(targetIndex>runtime.cursor){
          for(let i=runtime.cursor;i<targetIndex;i++){
            const skipped=runtime.queue[i];if(skipped&&skipped.status==="pending"){skipped.status="skipped";skipped.skippedReason="GM_NAVIGATION";skipped.completedAt=now}
          }
        }
        runtime.cursor=targetIndex;runtime.completed=false;runtime.currentId=step.id;
        if(step.status!=="pending"){step.status="pending";delete step.skippedReason;delete step.completedAt}
      }else if(step){return runtime}
    }
    else if(action==="back"){if(runtime.cursor>0){runtime.cursor--;while(runtime.cursor>0&&runtime.queue[runtime.cursor]?.status==="skipped")runtime.cursor--;const step=runtime.queue[runtime.cursor];if(step&&step.status==="completed")step.status="pending";runtime.completed=false;runtime.currentId=step?.id||null}}
    else{
      const current=runtime.queue[runtime.cursor];
      if(current&&current.status!=="skipped"){if(current.kind==="early-artifact"){const used=await this.artifactUsedInNight(meta,current);current.status="completed";current.result=used?"used":"skipped";current.completedAt=now}else{current.status="completed";current.completedAt=now}}
      runtime.cursor=Math.min(runtime.queue.length,runtime.cursor+1);
      while(runtime.cursor<runtime.queue.length){const next=runtime.queue[runtime.cursor];if(next?.kind==="artifact-main"&&await this.artifactUsedInNight(meta,next)){next.status="skipped";next.skippedReason="EARLY_ARTIFACT_USED";next.completedAt=now;runtime.cursor++;continue}break}
      runtime.completed=runtime.cursor>=runtime.queue.length;runtime.currentId=runtime.completed?null:(runtime.queue[runtime.cursor]?.id||null)
    }
    const active=runtime.completed?null:runtime.queue[runtime.cursor];if(active){active.startedAt=now;const durationMs=Number(active.durationSec)>0?Number(active.durationSec)*1000:0;if(meta.autoGM===false){runtime.deadlineAt=null;runtime.autoPausedRemainingMs=durationMs}else{runtime.deadlineAt=durationMs>0?new Date(Date.parse(now)+durationMs).toISOString():null;runtime.autoPausedRemainingMs=0}}else{runtime.deadlineAt=null;runtime.autoPausedRemainingMs=0}
    runtime.autoAdvance=meta.autoGM!==false;runtime.updatedAt=now;await this.ctx.storage.put(this.nightRuntimeKey(meta,night),runtime);meta.currentNightTurnId=runtime.currentId;meta.updatedAt=now;meta.lastUsedAt=now;await this.ctx.storage.put("meta",meta);
    if(meta.demo)await this.syncDemoClock(meta,await this.ctx.storage.get("demoLease")||{});
    this.broadcast({type:"night_turn",night,runtime,source,room:publicRoom(meta),serverTime:Date.now()});return runtime
  }
  // Trượng Luân Hồi / Quyền Trượng Phục Sinh: khi chủ chết, lá tự lật và chủ tiếp tục sống (dùng 1 lần, kể cả đã chết).
  async reviveArtifactSweep(meta,rows,now){
    if(typeof reviveOwnerPlans!=="function")return 0;
    const matchId=String(meta?.matchId||""),assignments=(await this.ctx.storage.get("assignments"))||[],usedLogins=[];
    for(const a of assignments){const id=normalizeLoginId(a?.loginId),aid=String(a?.artifactId||"");
      if(id&&aid&&await this.ctx.storage.get("artifactUse:"+id+":"+aid))usedLogins.push(id)}
    const plans=reviveOwnerPlans({assignments,interactions:rows,matchId,usedLogins});
    for(const plan of plans){
      for(const row of plan.rows){row.effectActive=false;row.expiredAt=now;row.expiredReason="ARTIFACT_REVIVE"}
      const id="artifact-revive:"+matchId+":"+plan.loginId,notice={id,clientEventId:id,type:"effect_notice",loginId:plan.loginId,actorId:plan.loginId,matchId,
        night:Number(meta?.cycleNight||0),cycleKey:String(meta?.cycleKey||""),effectActive:false,actionId:"artifact-revive-on-death",artifactId:plan.artifactId,
        effectName:plan.name,source:"artifact-rules",createdAt:now,status:"responded",response:"AUTO_ACK",
        message:plan.name+": chủ sở hữu lật Artifact và tiếp tục sống với Vai Trò cũ."};
      rows.push(notice);
      await this.ctx.storage.put("actionLog:"+String(Date.parse(now)).padStart(13,"0")+":"+id,notice);
      await this.ctx.storage.put("artifactUse:"+plan.loginId+":"+plan.artifactId,{usedAt:now,artifactId:plan.artifactId,actorId:plan.loginId,reason:"ON_DEATH"});
      const owned=await this.ctx.storage.get("artifact:"+plan.loginId);
      if(owned&&String(owned.artifactId||"")===plan.artifactId){owned.usedAt=now;await this.ctx.storage.put("artifact:"+plan.loginId,owned)}
      this.broadcast({type:"player_status_changed",loginId:plan.loginId,statusId:"dead",active:false,serverTime:Date.now()});
    }
    return plans.length;
  }
}
