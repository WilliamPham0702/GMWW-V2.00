/* NIGHT-02: ordered private night powers and one shared wolf bite.
 * Pure helpers; the Durable Object remains responsible for authorization/writes. */
const id=v=>String(v||'').trim().toLowerCase().replace(/^member:/,'');
const faction=row=>String(row?.faction||row?.factionId||row?.roleCard?.factionId||'').toLowerCase();
export const isWolfRole=row=>{const f=faction(row);if(f)return f==='wolf'||f==='wolves'||f.includes('sói')||f.includes('soi');return row?.roleId!=='role_human_wolf'&&String(row?.roleId||'').includes('wolf')};
export const aliveInMatch=(row,interactions,matchId)=>!(Array.isArray(interactions)?interactions:[]).some(x=>
 String(x?.matchId||'')===String(matchId)&&x?.type==='dead'&&x?.effectActive!==false&&id(x?.loginId)===id(row?.loginId));
export const packMembers=(assignments,interactions,matchId)=>(Array.isArray(assignments)?assignments:[])
 .filter(r=>isWolfRole(r)&&id(r?.loginId)&&aliveInMatch(r,interactions,matchId));
export const alphaPackState=(assignments,interactions,matchId,night)=>{
 const alpha=(Array.isArray(assignments)?assignments:[]).filter(r=>r?.roleId==='role_alpha_wolf'&&aliveInMatch(r,interactions,matchId));
 const rows=(Array.isArray(interactions)?interactions:[]).filter(x=>String(x?.matchId||'')===String(matchId)&&alpha.some(r=>id(r.loginId)===id(x.loginId))&&x.effectActive!==false);
 return {frozen:rows.some(x=>x.type==='frozen'&&Number(x.night)===Number(night)),
   expelled:rows.some(x=>x.type==='expelled')};
};
export function previousNightTargets(usage,{matchId,roleId,actionId,actorId,night}={}){
 const before=Number(night)-1;
 if(before<1)return[];
 return [...new Set((Array.isArray(usage)?usage:[]).filter(x=>
   String(x.matchId)===String(matchId)&&String(x.roleId)===String(roleId)&&
   String(x.actionId)===String(actionId)&&id(x.actorId)===id(actorId)&&Number(x.night)===before)
   .flatMap(x=>Array.isArray(x.targetIds)?x.targetIds:[]).map(id).filter(Boolean))];
}
export function arrangeNightRoles(roleTurns=[],artifactTurns=[]){
 const roles=Array.isArray(roleTurns)?roleTurns:[];
 // Native Snow Wolf acts before Pack Bite. A Drunk who drew Snow Wolf at
 // Night 3 uses the inherited private power AFTER the shared Pack Bite.
 const fixed=['role_snow_wolf','role_guard'].map(id=>
   roles.find(r=>r.roleId===id&&r.drunkInheritedWolf!==true)).filter(Boolean);
 const wolves=roles.filter(r=>isWolfRole(r)&&!fixed.includes(r));
 const fairy=roles.find(r=>r.roleId==='role_fairy');
 const rest=roles.filter(r=>!fixed.includes(r)&&!wolves.includes(r)&&r!==fairy);
 const byOrder=(a,b)=>(Number(a.order)||9999)-(Number(b.order)||9999);
 // The caller inserts a shared bite between fixed powers and wolf-only turns.
 return {fixed,wolves:wolves.sort(byOrder),fairy,rest:rest.sort(byOrder),
   artifactTurns:Array.isArray(artifactTurns)?artifactTurns:[]};
}
