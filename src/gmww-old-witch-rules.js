/* WITCH-01: Phù Thuỷ Già, authoritative pure rule checks.
 * Never change unrelated GM manual resurrection or other role powers. */
const id=value=>String(value||'').trim().toLowerCase().replace(/^member:/,'');
const same=(row,match)=>!!match&&String(row?.matchId||'')===String(match);
const aliveDeath=(row,match,night)=>same(row,match)&&row?.type==='dead'&&row?.effectActive!==false&&Number(row?.night)===night;
export function oldWitchReviveTargets(interactions,{matchId,night,actorId,players}={}){
 const n=Math.max(1,Number(night)||1),actor=id(actorId);
 if(n<=1||!matchId)return [];
 const available=players&&typeof players==='object'?new Set(Object.values(players).map(p=>id(p?.loginId))):null;
 const byLogin=new Set();
 for(const row of Array.isArray(interactions)?interactions:[]){
   const target=id(row?.loginId);
   if(!target||target===actor||!aliveDeath(row,matchId,n-1))continue;
   const cycle=String(row?.cycleKey||'');
   if(cycle&&!['night-'+(n-1),'morning-'+(n-1),'day-'+(n-1)].includes(cycle))continue;
   if(available&&!available.has(target))continue;
   byLogin.add(target);
 }
 return [...byLogin];
}
export function oldWitchActionCheck({actionId,actorId,targetIds,matchId,night,interactions=[],usage=[],players={}}={}){
 const action=String(actionId||''),targets=Array.isArray(targetIds)?targetIds.map(id):[],actor=id(actorId),n=Math.max(1,Number(night)||1);
 if(!actor||!matchId||targets.length!==1||!targets[0])return{ok:false,error:'WITCH_INVALID_TARGET'};
 if(!['action_exile','action_revive'].includes(action))return{ok:false,error:'WITCH_INVALID_ACTION'};
 if(targets[0]===actor)return{ok:false,error:'WITCH_SELF_TARGET'};
 if(action==='action_revive'){
   if(!oldWitchReviveTargets(interactions,{matchId,night:n,actorId:actor,players}).includes(targets[0]))
     return{ok:false,error:'WITCH_REVIVE_TARGET_INELIGIBLE',message:'Chỉ Hồi Sinh người chết ở ngày hoặc đêm liền trước; không tự cứu.'};
 }else{
   const target=targets[0];
   const currentlyDead=(Array.isArray(interactions)?interactions:[]).some(x=>same(x,matchId)&&id(x?.loginId)===target&&x?.type==='dead'&&x?.effectActive!==false);
   if(currentlyDead)return{ok:false,error:'WITCH_EXILE_DEAD'};
   const lastNight=(Array.isArray(interactions)?interactions:[]).some(x=>
     same(x,matchId)&&x?.type==='expelled'&&x?.actionId==='action_exile'&&
     id(x?.actorId)===actor&&id(x?.loginId)===target&&Number(x?.night)===n-1&&x?.undone!==true);
   const previouslyUsed=(Array.isArray(usage)?usage:[]).some(x=>
     same(x,matchId)&&x.roleId==='role_old_witch'&&x.actionId==='action_exile'&&
     id(x.actorId)===actor&&Number(x.night)===n-1&&
     (Array.isArray(x.targetIds)?x.targetIds:[]).some(t=>id(t)===target));
   if(lastNight||previouslyUsed)return{ok:false,error:'WITCH_CONSECUTIVE_EXILE',message:'Phù Thuỷ Già không được đuổi cùng một người hai đêm liên tiếp.'};
 }
 return{ok:true};
}
