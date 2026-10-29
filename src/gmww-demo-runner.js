import {gallowsVoteEligible,gallowsBlockedVotes} from './gmww-gallows-rules.js';
// The DEMO runner executes inside the room's serialized, transactional alarm.
// It reuses the real game handlers and the same pure targeting rules as GM Web.
import '../server-game/current/battle-controls.js';
import {checkBattleRoleActionUsage} from './gmww-battle-action-policy.js';
import {appendDemoHistory} from './gmww-demo-history.js';
import {artifactCycleKey} from './gmww-game-scene-rules.js';
import {STATUS_DEFS} from './gmww-public-room-contract.js';
import {isBattleActorBlocked} from './gmww-battle-actor-eligibility.js';
import {onlineGmActionIcon} from './gmww-online-action-icons.js';
import {linkedArtifactAction} from './gmww-artifact-link.js';
import {planArtifactLink} from './gmww-artifact-link.js';
import {planDayFunctionCopy} from './gmww-artifact-function-copy.js';
import {canSnowWolfBite,resolveWolfNight} from './gmww-wolf-night-resolution.js';
const rules=globalThis.GMWW_BATTLE_CONTROLS;
const pick=rows=>rows[Math.floor(Math.random()*rows.length)];
// Catalogued divination rules take precedence over stale saved-card targetCount.
export const demoDivinationTargetCount=action=>({
 action_compare_faction:2,action_bear_scan:2,action_fox_scan:3,action_scan_three:3
})[String(action?.actionId||'')]??Math.max(0,Math.trunc(Number(action?.targetCount)||0));
const MAX_STEPS=800,MAX_RUN_MS=24*60*60*1000;
const matchRow=(x,m)=>!x?.matchId||String(x.matchId)===String(m.matchId);
const status=(rows,m,id,type)=>rows.some(x=>x.loginId===id&&x.type===type&&x.effectActive!==false&&matchRow(x,m)&&(!x.expiresAt||Date.parse(x.expiresAt)>Date.now()));
const effect=(rows,m,id)=>['expelled','dead','frozen'].find(t=>status(rows,m,id,t))||'alive';
export const serverDemoActive=(meta,lease)=>meta?.demo===true&&meta.phase==='running'&&meta.autoGM!==true&&lease?.engine==='server'&&lease.running===true&&lease.matchId===String(meta.matchId||'');

async function context(room,meta){
 const store=room.ctx.storage,assignments=await store.get('assignments')||[],players=await store.get('players')||{},rows=await store.get('interactions')||[],cfg=await store.get('gameConfig')||{};
 const cards=[],artifacts=[],artifactOwners=new Map(),roleOwners=new Map(),artifactLinks=new Map();
 for(const a of assignments){
  const privateRows=await store.get('roles:'+a.loginId)||[await store.get('role:'+a.loginId)].filter(Boolean),owned=privateRows.find(r=>r.roleId===a.roleId&&matchRow(r,meta)),catalog=await store.get('roleCatalog:'+a.roleId);
  if(!cards.some(c=>c.id===a.roleId))cards.push({...catalog?.roleCard,...a.roleCard,...owned?.roleCard,id:a.roleId,name:a.roleName});
  roleOwners.set(a.loginId,{...catalog?.roleCard,...a.roleCard,...owned?.roleCard,id:a.roleId,name:a.roleName});
  if(a.artifactId){const art=await store.get('artifact:'+a.loginId);artifactOwners.set(a.loginId,{...art,spent:!!(await store.get('artifactUse:'+a.loginId+':'+a.artifactId))});if(!artifacts.some(c=>c.id===a.artifactId))artifacts.push({...art?.artifactCard,id:a.artifactId,name:a.artifactName})}
 }
 for(const a of assignments){
  if(a.artifactId!=='artifact_32')continue;
  const link=await store.get('artifactLink:'+meta.matchId+':'+a.loginId);
  if(!link)continue;
  const donorArtifact=await store.get('artifact:'+link.donorId),
    donorAssignment=assignments.find(x=>x.loginId===link.donorId),
    checked=linkedArtifactAction({link,actorId:a.loginId,actionId:link.actionId,
      matchId:meta.matchId,donorArtifact,donorAssignment});
  if(!checked.ok||await store.get('artifactEchoUse:'+meta.matchId+':'+a.loginId+':'+link.actionId))continue;
  const fn=donorArtifact?.artifactCard?.functions?.find(x=>x.actionId===link.actionId);
  if(fn)artifactLinks.set(a.loginId,{link,fn});
 }
 const cycle=(await store.get('artifactCycle:'+(meta.cyclePhase==='morning'?meta.matchId+':day:'+meta.cycleNight:artifactCycleKey(meta.matchId,meta.cycleNight))))||{accepted:[]};
 return {store,assignments,players,rows,cfg,cards,artifacts,artifactOwners,roleOwners,artifactLinks,cycle};
}
function nightActions(ctx,meta,turn,usage){
 const actions=rules.actionsForTurn(turn,meta.cycleNight,{cards:ctx.cards,artifacts:ctx.artifacts},ctx.cycle.accepted);
 return actions.filter(action=>!(Number(meta.cycleNight)===1&&action.actionId==='action_witch_kill'&&!action.artifactId)).map(action=>({...action,targetCount:action.noTarget?0:demoDivinationTargetCount(action),actorIds:action.actorIds.filter(actorId=>{
  if(status(ctx.rows,meta,actorId,'expelled')||isBattleActorBlocked(ctx.rows,{actorId,matchId:meta.matchId,statusDefs:STATUS_DEFS}))return false;
  if(action.artifactId){const owned=ctx.artifactOwners.get(actorId);return !owned?.removedFromMatch&&!(owned?.singleUse===true&&owned?.spent)&&!ctx.cycle.accepted.some(x=>x.artifactId===action.artifactId&&x.playerId==='member:'+actorId)&&ctx.cycle.accepted.length<Number(ctx.cfg.artifactLimitPerCycle??3)}
  const role=turn.kind==='role-group'?turn.roles.find(r=>r.loginIds.includes(actorId)&&(!action.roleIds?.length||action.roleIds.includes(r.roleId))):turn;
  const roleId=role?.roleId,card=ctx.cards.find(c=>c.id===roleId);
  if(roleId==='role_snow_wolf'&&action.actionId==='action_wolf_bite'&&!canSnowWolfBite({assignments:ctx.assignments,interactions:ctx.rows,matchId:meta.matchId,statusDefs:STATUS_DEFS}))return false;
  // One shared group action is enough; an already-confirmed manual action counts.
  if(usage.some(x=>x.matchId===meta.matchId&&Number(x.night)===Number(meta.cycleNight)&&x.actionId===action.actionId&&action.actorIds.includes(x.actorId)&&(!action.roleIds?.length||action.roleIds.includes(x.roleId))))return false;
  return checkBattleRoleActionUsage(usage,{matchId:meta.matchId,night:meta.cycleNight,actorId,roleId,actionId:action.actionId,card}).ok;
 })})).filter(a=>!a.unavailable&&a.actorIds.length);
}
function dayActions(ctx,meta,usage,ballot){
 const list=[];
 for(const a of ctx.assignments){
  const owners=[{card:ctx.roleOwners.get(a.loginId)||ctx.cards.find(c=>c.id===a.roleId),roleId:a.roleId},...(a.artifactId?[{card:ctx.artifacts.find(c=>c.id===a.artifactId),artifactId:a.artifactId}]:[])];
  for(const owner of owners){const card=owner.card;if(!card)continue;
   for(const fn of card.functions?.length?card.functions:card.actions||[]){
    const actionId=fn.actionId||fn.id,actorId=a.loginId,knight=owner.roleId==='role_knight'&&actionId==='action_knight_last_strike'&&ballot?.stage==='resolved'&&ballot.outcome==='dead'&&ballot.candidateId===actorId;
    if(fn.passive||!['day','any','both'].includes(fn.phase)||(fn.fromNight!=null&&Number(fn.fromNight)>meta.cycleNight)||(fn.toNight!=null&&Number(fn.toNight)<meta.cycleNight))continue;
    if(status(ctx.rows,meta,actorId,'expelled')||status(ctx.rows,meta,actorId,'frozen')||(status(ctx.rows,meta,actorId,'dead')&&!fn.actorMayBeDead&&!knight))continue;
    if(isBattleActorBlocked(ctx.rows.filter(row=>row.type!=='dead'),{actorId,matchId:meta.matchId,statusDefs:STATUS_DEFS}))continue;
    if(owner.artifactId){const owned=ctx.artifactOwners.get(actorId);if(owned?.removedFromMatch||owned?.singleUse===true&&owned?.spent)continue;}
    if(owner.roleId==='role_knight'&&actionId==='action_knight_last_strike'&&!knight)continue;
    if(actionId==='action-judge-double'&&(ballot?.stage!=='ready'||Number(ballot?.round||1)!==1||ballot?.extraRoundPending))continue;
    const own=usage.filter(x=>x.actorId===actorId&&x.roleId===(owner.roleId||'')&&x.artifactId===(owner.artifactId||'')),hits=own.filter(x=>x.actionId===actionId),quota=Math.max(1,Number(fn.usageCount)||1);
    if(card.flags?.allowMultipleActions===false&&own.some(x=>x.day===meta.cycleNight))continue;
    if((['onceGame','nGame'].includes(fn.usageMode)&&hits.length>=quota)||(fn.usageMode==='eachNight'&&hits.filter(x=>x.day===meta.cycleNight).length>=quota))continue;
    if(hits.some(x=>x.day===meta.cycleNight))continue;
    if(owner.artifactId&&(ctx.cycle.accepted.length>=Number(ctx.cfg.artifactLimitPerCycle??3)||ctx.cycle.accepted.some(x=>x.artifactId===owner.artifactId&&x.playerId==='member:'+actorId)))continue;
    const id='day:'+(owner.artifactId?'artifact:'+owner.artifactId:'role:'+owner.roleId)+':'+actorId+':'+actionId,name=card.actions?.find(x=>(x.id||x.actionId)===actionId)?.name||fn.name||fn.description||actionId;
    list.push({id,actionId,name,...owner,card:undefined,actorIds:[actorId],targetCount:fn.noTarget?0:Number(fn.targetCount??1),noSelf:fn.noSelf!==false||owner.artifactId==='artifact_27',allowDead:fn.allowDead,noTarget:fn.noTarget,type:rules.resolvedType({...fn,name}),effectIds:fn.effectIds||[]});
   }
  }
 }
 // The Echo remains a separate, once-game power of the Lam Ngọc owner.
 // Its donor must already have revealed the original Artifact.
 for(const a of ctx.assignments){
  const echo=ctx.artifactLinks.get(a.loginId),actorId=a.loginId;
  if(!echo||status(ctx.rows,meta,actorId,'expelled')||
    status(ctx.rows,meta,actorId,'dead')||
    isBattleActorBlocked(ctx.rows,{actorId,matchId:meta.matchId,statusDefs:STATUS_DEFS})||
    ctx.cycle.accepted.length>=Number(ctx.cfg.artifactLimitPerCycle??3)||
    ctx.cycle.accepted.some(x=>x.artifactId==='artifact_32'&&x.playerId==='member:'+actorId))
    continue;
  const fn=echo.fn,actionId=fn.actionId,name='Lam Ngọc · '+String(fn.description||fn.name||actionId);
  list.push({id:'day:linked:artifact_32:'+actorId+':'+actionId,
    actionId,name,artifactId:'artifact_32',roleId:'',actorIds:[actorId],
    targetCount:fn.noTarget?0:Number(fn.targetCount??1),
    noSelf:fn.noSelf!==false,allowDead:fn.allowDead,noTarget:fn.noTarget,
    type:rules.resolvedType({...fn,name}),effectIds:fn.effectIds||[]});
 }
 return list;
}
// Only the authenticated actor's current, unused powers reach Player Web.
// The private response does not expose other actors or the full night queue.
export async function playerOfferedActions(room,meta,loginId){
 if(meta?.phase!=='running'||!loginId||(!meta.demo&&String(meta.roomMode||'').toLowerCase()!=='online'))return [];
 const ctx=await context(room,meta);
 if(!ctx.players['member:'+loginId]||(meta.demo&&ctx.players['member:'+loginId]?.humanControlled!==true)||
    !ctx.assignments.some(a=>a.loginId===loginId))return [];
 if(!ctx.assignments.some(a=>a.loginId===loginId&&(!a.matchId||String(a.matchId)===String(meta.matchId))))return [];
 let actions=[];
 if(meta.cyclePhase==='night'){
  const runtime=await room.getNightRuntime(meta,meta.cycleNight,false);
  const turn=runtime?.queue?.[runtime.cursor];
  if(turn&&!runtime.completed)actions=nightActions(ctx,meta,turn,await ctx.store.get('battleRoleUsage:'+meta.matchId)||[]);
 }else if(meta.cyclePhase==='morning'){
  const ballot=(await room.gallowsState(meta)).ballot;
  actions=dayActions(ctx,meta,await ctx.store.get('dayRoleUsage:'+meta.matchId)||[],ballot);
 }
 return actions.filter(a=>a.actorIds.includes(loginId)).map(a=>({
  key:a.id,actionId:a.actionId,name:a.name,type:a.type,roleId:a.roleId||'',
  artifactId:a.artifactId||'',targetCount:a.noTarget||a.actionId==='action_transfer_bite'?0:a.targetCount,
  noSelf:a.noSelf,allowDead:a.allowDead,noTarget:a.noTarget,phase:meta.cyclePhase,
  iconUrl:onlineGmActionIcon(a.actionId)
 }));
}
/* The legacy DEMO action API remains DEMO-only; Online uses separate admission. */
export async function demoPlayerActions(room,meta,loginId){
 if(meta?.demo!==true)return [];
 return playerOfferedActions(room,meta,loginId);
}

export function demoTaskAt(duration,plan){
 const count=Math.max(1,plan?.tasks?.length||0),cursor=Number(plan?.cursor||0);
 const task=plan?.tasks?.[cursor];
 // The GM keeps the first half for role decisions; voting has a separate
 // short clock and should show live nominations early rather than bunching
 // 30 ballots into the last seconds at x2/x5.
 const ballot=plan?.tasks?.some(x=>x.kind==='nominate'||x.kind==='vote');
 const base=ballot?duration*(.1+.72*cursor/count):duration/2+duration/2*cursor/count;
 return task?.humanControlled?Math.max(base,duration-Math.min(1800,duration*.2)):base;
}
export function targetsFor(action,actorId,ctx,meta){
 const wolfNight=action.actionId==='action_witch_save'&&!action.artifactId
  ?resolveWolfNight({interactions:ctx.rows,players:ctx.players,matchId:meta.matchId,night:meta.cycleNight}):null;
 const attacked=wolfNight?(Array.isArray(wolfNight.attacked)?wolfNight.attacked:[]).map(x=>x.to).filter(Boolean):null;
 const candidates=Object.values(ctx.players).filter(m=>(!attacked||attacked.includes(m.loginId))&&(!action.noSelf||m.loginId!==actorId)&&rules.targetAllowed(action,m,effect(ctx.rows,meta,m.loginId),ctx.rows,meta.cycleNight)).map(m=>m.loginId);
 const actionId=String(action.actionId||'');
 const available=candidates.filter(targetId=>{
  if(action.artifactId==='artifact_32'&&actionId==='artifact_action_link'){
   return planArtifactLink({actorId,targetId,
     actorArtifact:ctx.artifactOwners.get(actorId),
     donorArtifact:ctx.artifactOwners.get(targetId),
     assignments:ctx.assignments,matchId:meta.matchId}).ok;
  }
  if(action.artifactId==='artifact_23'&&actionId==='artifact_action_copy_function'){
   return planDayFunctionCopy({actorId,targetId,assignments:ctx.assignments,
     actorRoles:[{...ctx.roleOwners.get(actorId),
       roleId:ctx.assignments.find(x=>x.loginId===actorId)?.roleId,
       roleCard:ctx.roleOwners.get(actorId)}],
     targetRoles:[{...ctx.roleOwners.get(targetId),
       roleId:ctx.assignments.find(x=>x.loginId===targetId)?.roleId,
       roleCard:ctx.roleOwners.get(targetId)}],
     now:new Date().toISOString()}).ok;
  }
  if(action.artifactId==='artifact_40'&&actionId==='artifact_action_swap_role'){
   return ctx.assignments.filter(x=>x.loginId===actorId).length===1&&
     ctx.assignments.filter(x=>x.loginId===targetId).length===1;
  }
  return true;
 }),chosen=[];
 if(action.actionId==='action_protect'&&!action.artifactId&&available.includes(actorId)&&action.targetCount===1)return [actorId];
 const count=demoDivinationTargetCount(action);
 while(chosen.length<count&&available.length){const id=pick(available);chosen.push(id);available.splice(available.indexOf(id),1)}
 return chosen.length===count?chosen:null;
}
async function observe(room,meta,lease,action,actorId='',targets=[],status='accepted',extra={}){
 const players=await room.ctx.storage.get('players')||{},name=id=>players['member:'+id]?.displayName||id;
 const runtime=meta.cyclePhase==='night'?await room.getNightRuntime(meta,meta.cycleNight,false):null,turn=runtime?.queue?.[runtime.cursor];
 const event={id:'demo-'+crypto.randomUUID(),matchId:meta.matchId,cycleKey:meta.cycleKey,turnId:turn?.id||'day',turn:(meta.cyclePhase==='night'?'Đêm ':'Ngày ')+meta.cycleNight+(turn?' · Lượt '+(runtime.cursor+1)+'/'+runtime.queue.length+' · '+turn.label:''),action,actor:name(actorId),targets:targets.map(name),actorId,targetIds:targets,status,at:Date.now(),...extra};
 lease.lastEvent=event;
 // Keep the accepted/skipped DEMO event ledger on the Server across GM reloads.
 // The existing MAX_STEPS limit bounds storage while retaining the full DEMO run.
 lease.history=appendDemoHistory(lease.history,event);
 await room.ctx.storage.put('demoLease',lease);
 // The same WebSocket is visible to Players. Never publish secret actors,
 // targets, or night role labels. GM reads the full event from authorized /gm/state.
 room.broadcast({type:'demo_event',demoEvent:{id:event.id,matchId:event.matchId,
  status:event.status,at:event.at},serverTime:Date.now()});
}
async function checked(response){const data=await response.json();if(!response.ok||!data.ok){const e=new Error(data.message||data.error||'DEMO_ACTION_FAILED');e.code=data.detail||data.error;throw e}return data}
async function ballotAction(room,body){
 try{return await checked(await room.playerGallows(body,true))}
 catch(error){if(['NOMINATION_CLOSED','VOTE_DEADLINE_PASSED'].includes(error.code))return null;throw error}
}
async function execute(room,meta,lease,ctx,action,day=false){
 const botActors=action.actorIds.filter(id=>ctx.players['member:'+id]?.humanControlled!==true),actorId=pick(botActors.length?botActors:action.actorIds),targets=targetsFor(action,actorId,ctx,meta);
 if(!targets){await observe(room,meta,lease,action.name+' · Không đủ mục tiêu hợp lệ',actorId,[],'skipped');return}
 const request=room.demoInternalRequest(),token='demo-'+crypto.randomUUID();
 let result,observedTargets=targets,observedAction=action.name;
 if(day)result=await checked(await room.gmDayAction(request,{matchId:meta.matchId,cycleKey:meta.cycleKey,actorId,roleId:action.roleId||'',artifactId:action.artifactId||'',actionId:action.actionId,targetIds:targets,clientEventId:token}));
 else{
  const rt=await room.getNightRuntime(meta,meta.cycleNight,false),turn=rt.queue[rt.cursor],seer=!action.artifactId&&['action_seer','action_aura_read','action_fox_scan','action_bear_scan','action_scan_three','action_find_seer','action_destroyer_scry','action_compare_faction','action_wolf_seer','action_rotten_seer'].includes(action.actionId),transfer=!action.artifactId&&action.actionId==='action_transfer_bite',direction=transfer?pick(['left','right']):'';
  result=await checked(await room.gmBattleAction(request,{matchId:meta.matchId,cycleKey:meta.cycleKey,turnId:turn.id,night:meta.cycleNight,actorId,type:transfer?'effect_notice':action.type,actionId:action.actionId,effectId:action.effectIds?.[0]||'',effectName:action.name,targetIds:seer||transfer||!action.targetCount?[actorId]:targets,clientEventId:token,source:'demo-server',...(action.artifactId?{artifactId:action.artifactId}:{}),...(seer?{revealTargetIds:targets,message:'GM Demo thực hiện soi xét.'}:{}),...(transfer?{direction,message:'Demo dịch vết cắn '+direction}:{}),...(action.actionId==='action_assassin_mark'?{assassinChoice:pick(['👍','👎'])}:{})}));
  if(transfer){observedTargets=(result.wolfOutcome?.transfers||[]).map(x=>x.to);observedAction=action.name+' · '+(direction==='left'?'Trái':'Phải')+(observedTargets.length?'':' · Không có vết cắn để dịch')}
 }
 await observe(room,meta,lease,observedAction,actorId,observedTargets,'accepted',{actionId:action.id,audioActionId:action.actionId,revelation:result.revelation||result.result||null});
}
// The same private, server-authoritative response handler used by Player Web resolves
// the assassin's dawn challenge during autonomous DEMO; never expose gmChoice.
export function pendingDemoAssassinResponses(ctx,meta){
 return (ctx.rows||[]).filter(row=>row?.type==='assassin_mark'&&row?.status==='pending'&&
  Number(row.night)===Number(meta.cycleNight)&&
  (!row.matchId||String(row.matchId)===String(meta.matchId))&&
  !!ctx.players?.['member:'+row.loginId]&&
  !['dead','expelled'].some(type=>status(ctx.rows,meta,row.loginId,type)))
  .map(row=>({id:'assassin:'+row.id,kind:'assassin-response',actorId:row.loginId,interactionId:row.id}));
}
async function tasksFor(room,meta,ctx){
 if(meta.cyclePhase==='night'){
  const rt=await room.getNightRuntime(meta,meta.cycleNight,true),turn=rt?.queue?.[rt.cursor],usage=await ctx.store.get('battleRoleUsage:'+meta.matchId)||[];
  return nightActions(ctx,meta,turn,usage).map(a=>({id:a.id,humanControlled:a.actorIds.some(id=>ctx.players['member:'+id]?.humanControlled===true),declined:a.actionId==='action_witch_save'&&!a.artifactId&&Math.random()>=.5}));
 }
 const {ballot,eligible}=await room.gallowsState(meta);
 if(ballot.mode==='gm'&&['nominating','voting'].includes(ballot.stage))return [];
 if(['ready','resolved'].includes(ballot.stage))return [
  ...pendingDemoAssassinResponses(ctx,meta).map(task=>({...task,humanControlled:ctx.players['member:'+task.actorId]?.humanControlled===true})),
  ...dayActions(ctx,meta,await ctx.store.get('dayRoleUsage:'+meta.matchId)||[],ballot).map(a=>({id:a.id,humanControlled:ctx.players['member:'+a.actorIds[0]]?.humanControlled===true}))
 ];
 if(ballot.stage==='nominating')return eligible.filter(id=>!Object.hasOwn(ballot.nominations||{},id)&&!(ballot.blockedNomination||[]).includes(id)).map(id=>({id:'nominate:'+id,actorId:id,kind:'nominate',humanControlled:ctx.players['member:'+id]?.humanControlled===true}));
 if(ballot.stage==='voting')return gallowsVoteEligible(ballot).filter(id=>id!==ballot.candidateId&&!Object.hasOwn(ballot.votes||{},id)&&!gallowsBlockedVotes(ballot).includes(id)).map(id=>({id:'vote:'+id,actorId:id,kind:'vote',humanControlled:ctx.players['member:'+id]?.humanControlled===true}));
 return [];
}
async function planFor(room,meta,clock){
 let plan=await room.ctx.storage.get('demoPlan');
 if(plan?.key!==clock.key){const ctx=await context(room,meta);plan={key:clock.key,tasks:await tasksFor(room,meta,ctx),cursor:0};await room.ctx.storage.put('demoPlan',plan)}
 return plan;
}
export async function nextServerDemoDue(room,meta){
 const lease=await room.ctx.storage.get('demoLease');if(!serverDemoActive(meta,lease))return 0;
 if(Number(lease.holdUntil)>Date.now())return Number(lease.holdUntil);
 if(!['night','morning'].includes(meta.cyclePhase))return Date.now();
 const clock=await room.syncDemoClock(meta,lease),plan=await room.ctx.storage.get('demoPlan');
 if(plan?.key!==clock.key)return Date.now();
 const remaining=Number(clock.remainingMs)||0,duration=Number(clock.durationMs)||0;
 if(plan.cursor<plan.tasks.length){const at=demoTaskAt(duration,plan);return Date.now()+Math.max(0,at-(duration-remaining))/clock.speed}
 return Date.now()+remaining/clock.speed;
}
export async function stopServerDemo(room,meta,lease,reason,error=''){
 const stopped={...lease,running:false,reason,error,holdUntil:0};await room.syncDemoClock(meta,stopped);await room.ctx.storage.put('demoLease',stopped);return stopped;
}
export async function runServerDemo(room,meta,budget=32){
 const store=room.ctx.storage,lease=await store.get('demoLease');if(!serverDemoActive(meta,lease))return false;
 const now=Date.now();if(Number(lease.holdUntil)>now){await room.scheduleRoomAlarm(meta);return true}
 if(Number(lease.steps)>=MAX_STEPS||now-Number(lease.startedAt)>MAX_RUN_MS){await stopServerDemo(room,meta,lease,'limit','Demo đã đạt giới hạn an toàn; GM cần kiểm tra ván.');await room.scheduleRoomAlarm(meta);return true}
 const win=room.computeWinProposal(meta,await store.get('assignments')||[],await store.get('interactions')||[]);
 if(win){await stopServerDemo(room,meta,lease,'winner');room.broadcast({type:'demo_winner',winProposal:win,serverTime:now});await room.scheduleRoomAlarm(meta);return true}
 if(!['night','morning'].includes(meta.cyclePhase)){await room.applyCycle(meta,'night',1,'night-1','demo-server');await room.scheduleRoomAlarm();return true}
 lease.failures=0;lease.error='';
 const clock=await room.syncDemoClock(meta,lease),plan=await planFor(room,meta,clock),duration=Number(clock.durationMs)||0,remaining=Number(clock.remainingMs)||0;
 if(remaining<=0&&['nominating','voting'].includes(clock.kind)){plan.cursor=plan.tasks.length;await store.put('demoPlan',plan)}
 const slot=demoTaskAt(duration,plan);
 if(plan.cursor<plan.tasks.length&&duration-remaining+1>=slot){
  const task=plan.tasks[plan.cursor],ctx=await context(room,meta);
  if(task.kind){
   if(task.kind==='assassin-response'){
    const mark=ctx.rows.find(row=>row.id===task.interactionId&&row.type==='assassin_mark'&&row.status==='pending');
    if(mark&&!['dead','expelled'].some(type=>status(ctx.rows,meta,task.actorId,type))){
     const choice=pick(['👍','👎']),result=await checked(await room.playerInteractionRespond({
      loginId:task.actorId,interactionId:task.interactionId,response:choice}));
     await observe(room,meta,lease,'Sát Thủ · Phản hồi '+choice+' · '+(result.assassinOutcome==='dead'?'Chết':'Sống'),
      task.actorId,[task.actorId],'accepted',{assassinOutcome:result.assassinOutcome||null});
    }
   }else{
   const {ballot,eligible}=await room.gallowsState(meta);
   if(ballot.mode==='gm'){ /* GM owns this ballot; retain their choices. */ }
   else if(task.kind==='nominate'&&eligible.includes(task.actorId)&&!(ballot.blockedNomination||[]).includes(task.actorId)&&!Object.hasOwn(ballot.nominations||{},task.actorId)){
    const targets=eligible.slice();
    if(targets.length){const target=pick(targets);if(await ballotAction(room,{command:'nominate',loginId:task.actorId,targetId:target}))await observe(room,meta,lease,'Đề cử',task.actorId,[target])}
   }else if(task.kind==='vote'&&gallowsVoteEligible(ballot).includes(task.actorId)&&!gallowsBlockedVotes(ballot).includes(task.actorId)&&!Object.hasOwn(ballot.votes||{},task.actorId)){
    const choice=(ballot.saveOnlyVoters||[]).includes(task.actorId)?'👍':(ballot.forcedKillVoters||[]).includes(task.actorId)?'👎':pick(['👍','👎']);if(await ballotAction(room,{command:'vote',loginId:task.actorId,choice}))await observe(room,meta,lease,'Bỏ phiếu '+choice,task.actorId,[ballot.candidateId]);
   }
   }
  }else{
   const day=meta.cyclePhase==='morning',rt=day?null:await room.getNightRuntime(meta,meta.cycleNight,false),actions=day?dayActions(ctx,meta,await store.get('dayRoleUsage:'+meta.matchId)||[],(await room.gallowsState(meta)).ballot):nightActions(ctx,meta,rt.queue[rt.cursor],await store.get('battleRoleUsage:'+meta.matchId)||[]),action=actions.find(a=>a.id===task.id);
   if(task.declined)await observe(room,meta,lease,'Phù Thuỷ chọn không Cứu','',[],'skipped');
   else if(action){
    try{await execute(room,meta,lease,ctx,action,day)}catch(error){
      // Never silently skip a configured power after the real API rejects it.
      if(error.code){await stopServerDemo(room,meta,lease,'error',String(error.code)+': '+error.message);await room.scheduleRoomAlarm(meta);return true}
      throw error;
    }
   }
  }
  plan.cursor++;lease.steps=Number(lease.steps||0)+1;await store.put('demoPlan',plan);await store.put('demoLease',lease);
 }else if(plan.cursor>=plan.tasks.length&&remaining<=0){
  if(meta.cyclePhase==='night'){
   const rt=await room.getNightRuntime(meta,meta.cycleNight,true);if(!rt.completed)await room.advanceNightRuntime(meta,'next','demo-server');
   const fresh=await store.get('meta'),after=await room.getNightRuntime(fresh,meta.cycleNight,true);if(after.completed)await room.applyCycle(fresh,'morning',meta.cycleNight,'morning-'+meta.cycleNight,'demo-server');
  }else{
   const {ballot,eligible}=await room.gallowsState(meta),request=room.demoInternalRequest();
   if(ballot.stage==='ready')await checked(await room.gmGallows(request,{command:'open',source:'demo'}));
   else if(['nominating','selecting'].includes(ballot.stage)){
    // The same Server tally handles ties, no nominations, bans and the leader.
    // A tie finishes without a hanging; DEMO must not invent a candidate.
    const closed=await checked(await room.gmGallows(request,{command:'close_nomination',source:'demo'}));
    if(closed.gallows?.stage==='selecting'&&closed.gallows.candidateId)
      await checked(await room.gmGallows(request,{command:'begin',source:'demo',targetId:closed.gallows.candidateId}));
   }else if(['voting','closed'].includes(ballot.stage)){
    // Crow penalties and weighted/passive Artifact votes apply in DEMO too.
    await checked(await room.gmGallows(request,{command:'close_vote',source:'demo'}));
   }else if(ballot.stage==='resolved'&&ballot.extraRoundPending)await checked(await room.gmGallows(request,{command:'acknowledge',ballotId:ballot.id,source:'demo'}));
   else if(ballot.stage==='resolved')await room.applyCycle(meta,'night',meta.cycleNight+1,'night-'+(meta.cycleNight+1),'demo-server');
  }
  lease.steps=Number(lease.steps||0)+1;await store.put('demoLease',lease);
 }
 await room.scheduleRoomAlarm();
 // Batch already-due work so 30-player ballots at 10x are not throttled by
 // one separate wakeup per voter. Keep each alarm bounded.
 const fresh=await store.get('meta');
 if(budget>1&&serverDemoActive(fresh,await store.get('demoLease'))&&(await nextServerDemoDue(room,fresh))<=Date.now())return runServerDemo(room,fresh,budget-1);
 return true;
}
