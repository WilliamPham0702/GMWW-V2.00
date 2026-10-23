// Interactions are one stored value per match. Keep every live effect (frozen/expelled/dead/status/
// assassin_mark) and as much recent history as fits a byte budget, well under the SQLite value limit.
export const INTERACTION_BYTE_BUDGET=1500000,LIVE_EFFECT_TYPES=new Set(["frozen","expelled","dead","assassin_mark","status"]);
export function pruneInteractions(rows){
  const list=Array.isArray(rows)?rows:[];
  const size=x=>JSON.stringify(x).length;
  let total=0;for(const x of list)total+=size(x);
  if(total<=INTERACTION_BYTE_BUDGET)return list;
  const keep=new Set(list.filter(x=>x?.pendingDeath===true||(LIVE_EFFECT_TYPES.has(String(x?.type||""))&&x?.effectActive!==false)));
  let budget=INTERACTION_BYTE_BUDGET;for(const x of keep)budget-=size(x);
  for(let i=list.length-1;i>=0;i--){const x=list[i];if(keep.has(x))continue;const n=size(x);if(n>budget)break;keep.add(x);budget-=n}
  return list.filter(x=>keep.has(x));
}
