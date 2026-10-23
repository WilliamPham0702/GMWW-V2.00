// A Server-authored DEMO ledger, never reconstructed from unconfirmed UI selections.
// The DEMO safety limit is 800 steps; retain all its distinct recorded events.
export const DEMO_HISTORY_LIMIT=800;
export function appendDemoHistory(history,event){
  const rows=Array.isArray(history)?history:[];
  if(!event||!event.id||!event.matchId)return rows.slice(-DEMO_HISTORY_LIMIT);
  return [...rows.filter(row=>row?.matchId===event.matchId&&row?.id!==event.id),event].slice(-DEMO_HISTORY_LIMIT);
}
export function demoHistoryForCycle(history,matchId,cycleKey){
  return (Array.isArray(history)?history:[]).filter(row=>
    row&&String(row.matchId||'')===String(matchId||'')&&
    String(row.cycleKey||'')===String(cycleKey||''));
}
