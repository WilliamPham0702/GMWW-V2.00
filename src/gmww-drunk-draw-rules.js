// Private, match-scoped Drunk draw. Clients only receive opaque face-down IDs.
const login=value=>String(value||'').toLowerCase().trim().replace(/^member:/,'');
export function drunkDeadCards({assignments=[],interactions=[],matchId='',night=3}={}){
 const eligible=new Set((Array.isArray(interactions)?interactions:[])
   .filter(x=>String(x?.matchId||'')===String(matchId)&&x.type==='dead'&&
     x.effectActive!==false&&Number(x.night||0)<Number(night))
   .map(x=>login(x.loginId)).filter(Boolean));
 return (Array.isArray(assignments)?assignments:[])
   .filter(x=>eligible.has(login(x.loginId))&&x.roleId)
   .map(x=>({sourceId:login(x.loginId),roleId:String(x.roleId),roleName:String(x.roleName||x.roleId)}));
}
export function drunkDeckView(deck,gm=false){
 if(!deck)return null;
 return {matchId:deck.matchId,night:deck.night,turnId:deck.turnId,
   status:deck.selectedId?'selected':'pending',
   cards:(deck.cards||[]).map(x=>gm?{id:x.id,roleName:x.roleName,selected:x.id===deck.selectedId}:
     {id:x.id,selected:x.id===deck.selectedId}),
   ...(gm&&deck.selectedId?{selectedRoleName:deck.selectedRoleName||''}:{}),
   ...(!gm&&deck.selectedId?{selectedId:deck.selectedId,selectedRoleName:deck.selectedRoleName||''}:{})};
}
export const isPassiveInformationAction=id=>new Set([
 'action_compare_faction','action_seer','action_aura_read','action_find_seer',
 'action_bear_scan','action_fox_scan','action_scan_three','action_destroyer_scry',
 'action_wolf_seer','action_rotten_seer'
]).has(String(id||''));
