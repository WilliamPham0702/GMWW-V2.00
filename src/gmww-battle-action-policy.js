/* GMWW battle action usage policy. Pure rule evaluation, no I/O. */
const normalized=v=>String(v??'').trim();
const positive=(value,fallback=1)=>{const n=Number(value);return Number.isFinite(n)&&n>0?Math.min(100,Math.trunc(n)):fallback};
export function resolveRoleActionPolicy(card,roleId,actionId){
  const role=normalized(roleId),action=normalized(actionId),list=Array.isArray(card?.functions)?card.functions:[];
  const fn=list.find(x=>normalized(x?.actionId||x?.id)===action)||null;
  // Preserve explicit custom settings; only apply the original Phù Thuỷ Già rule to
  // older already-distributed cards without a serialized flags/functions contract.
  const explicit=card?.flags&&typeof card.flags.allowMultipleActions==='boolean';
  const singleActionPerNight=role==='role_old_witch'||(explicit?!card.flags.allowMultipleActions:false);
  const mode=String(fn?.usageMode||'').trim();
  const fallbackOnce=role==='role_old_witch'&&action==='action_revive';
  const usageMode=fallbackOnce?'onceGame':['eachNight','eachDay','nPerNight','onceGame','nGame','custom','unlimited'].includes(mode)?mode:'unlimited';
  return {roleId:role,actionId:action,functionId:normalized(fn?.id||action),
    singleActionPerNight,usageMode,usageCount:positive(fn?.usageCount,1),
    phase:fn?.phase==='both'?'any':fn?.phase,fromNight:fn?.fromNight,toNight:fn?.toNight,passive:fn?.passive===true,
    targetCount:fn?.noTarget?0:fn?.targetCount,noTarget:fn?.noTarget===true,noSelf:fn?.noSelf===true,
    allowConsecutive:fn?.allowConsecutive,perUserLimit:Math.max(0,Number(fn?.perUserLimit)||0),
    knownAction:list.length?!!fn:(Array.isArray(card?.actions)&&card.actions.length?
      card.actions.some(x=>normalized(x?.id||x?.actionId)===action):true)};
}
export function checkBattleRoleActionUsage(rows,detail){
  const previous=Array.isArray(rows)?rows:[],match=normalized(detail?.matchId),
    role=normalized(detail?.roleId),actor=normalized(detail?.actorId),
    action=normalized(detail?.actionId),night=Math.max(1,Number(detail?.night)||1),
    rule=detail?.policy||resolveRoleActionPolicy(detail?.card,role,action);
  if(!match||!role||!actor||!action)return{ok:false,error:'INVALID_ROLE_ACTION_CONTEXT'};
  if(!rule.knownAction)return{ok:false,error:'INVALID_ROLE_ACTION_FOR_TURN'};
  if(rule.passive||(rule.phase&&!['night','any'].includes(rule.phase))||rule.usageMode==='eachDay')return{ok:false,error:'ACTION_WRONG_PHASE'};
  if((rule.fromNight!=null&&night<Number(rule.fromNight))||(rule.toNight!=null&&night>Number(rule.toNight)))return{ok:false,error:'ACTION_OUTSIDE_NIGHT_WINDOW'};
  const own=previous.filter(x=>normalized(x?.matchId)===match&&normalized(x?.roleId)===role&&
    normalized(x?.actorId)===actor);
  const actionUses=own.filter(x=>normalized(x.actionId)===action);
  if(Array.isArray(detail?.targetIds)){
    const targets=detail.targetIds.map(normalized);
    const noTargetWire=rule.noTarget&&(targets.length===0||(targets.length===1&&targets[0]===actor));
    if((rule.noTarget&&!noTargetWire)||(!rule.noTarget&&rule.targetCount!=null&&targets.length!==Number(rule.targetCount))||new Set(targets).size!==targets.length)return{ok:false,error:'ACTION_TARGET_COUNT_INVALID'};
    if(!rule.noTarget&&rule.noSelf&&targets.includes(actor))return{ok:false,error:'ACTION_SELF_TARGET_FORBIDDEN'};
    if(!rule.noTarget&&rule.allowConsecutive===false&&targets.some(id=>actionUses.some(x=>Number(x.night)===night-1&&(x.targetIds||[]).map(normalized).includes(id))))return{ok:false,error:'CONSECUTIVE_NIGHT_TARGET_FORBIDDEN'};
    if(!rule.noTarget&&rule.perUserLimit>0&&targets.some(id=>actionUses.filter(x=>(x.targetIds||[]).map(normalized).includes(id)).length>=rule.perUserLimit))return{ok:false,error:'ACTION_TARGET_GAME_LIMIT_REACHED'};
  }
  // NIGHT-02: a shared Pack Bite is separate from each wolf role's own
  // night power. Never make a Wolf Seer's private action unavailable because
  // that same member already participated in the pack bite.
  const individualUses=role.includes('wolf')&&action!=='action_wolf_bite'?
    own.filter(x=>normalized(x.actionId)!=='action_wolf_bite'):own;
  if(rule.singleActionPerNight&&individualUses.some(x=>Number(x.night)===night))
    return{ok:false,error:'ROLE_NIGHT_ACTION_EXHAUSTED',message:'Vai trò đã sử dụng một chức năng trong đêm này.'};
  const uses=own.filter(x=>normalized(x.actionId)===action&&
    (['onceGame','nGame','custom'].includes(rule.usageMode)||Number(x.night)===night)).length;
  if(rule.usageMode!=='unlimited'&&uses>=rule.usageCount)
    return{ok:false,error:['onceGame','nGame','custom'].includes(rule.usageMode)?'ACTION_GAME_LIMIT_REACHED':'ACTION_NIGHT_LIMIT_REACHED',
      message:['onceGame','nGame','custom'].includes(rule.usageMode)?'Chức năng này đã hết lượt sử dụng trong ván.':'Chức năng này đã hết lượt sử dụng trong đêm.'};
  return{ok:true,policy:rule};
}
export function appendBattleRoleActionUsage(rows,detail){
  return [...(Array.isArray(rows)?rows:[]),{
    matchId:normalized(detail.matchId),night:Math.max(1,Number(detail.night)||1),
    actorId:normalized(detail.actorId),roleId:normalized(detail.roleId),
    actionId:normalized(detail.actionId),targetIds:(Array.isArray(detail.targetIds)?detail.targetIds:[]).map(normalized),eventId:normalized(detail.eventId),
    usedAt:normalized(detail.usedAt||new Date().toISOString())}].slice(-1000);
}
