/* Night role ordering rules.
 * The drunk sleeps nights 1/2, draws once at night 3 (before Old Witch).
 * Clone selects one living player on night 1, otherwise sleeps until inheritance.
 * Witch must be called after final Fairy bite transfer to receive authoritative intel.
 */
export function partitionNightSpecialRoles(roleTurns=[],night=1){
  const roles=Array.isArray(roleTurns)?roleTurns:[],n=Math.max(1,Number(night)||1);
  const take=id=>roles.find(x=>x?.roleId===id)||null;
  const drunk=n===3?take('role_drunk'):null;
  const clone=n===1?take('role_clone'):null;
  const witch=take('role_witch');
  const oldWitch=take('role_old_witch');
  const remaining=roles.filter(row=>!['role_drunk','role_clone','role_witch','role_old_witch'].includes(row?.roleId));
  if(clone)remaining.push(clone);
  return {drunk,oldWitch,witch,remaining};
}
export function witchVisibleBiteTargets(nightIntel){
  if(!nightIntel?.ok||nightIntel?.packDisabled)return [];
  return [...new Set((Array.isArray(nightIntel.attacked)?nightIntel.attacked:[])
    .map(row=>String(row?.to||'').replace(/^member:/,'').trim()).filter(Boolean))];
}
export function witchSaveTargetAllowed(nightIntel,targetId){
  const id=String(targetId||'').replace(/^member:/,'').trim();
  return !!id&&witchVisibleBiteTargets(nightIntel).includes(id);
}
