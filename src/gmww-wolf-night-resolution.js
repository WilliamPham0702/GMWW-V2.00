/* GMWW G4.3: pure night wolf-effect resolver, no writes or implicit phase changes.
 * Input rows are confirmed GM interaction receipts, recorded during real night turns.
 * The result is intentionally deterministic so Durable Object retries cannot
 * select a different victim; saved matches and arbitrary death causes are untouched.
 */
const login=value=>String(value??'').trim().toLowerCase().replace(/^member:/,'');
const isFrom=(row,matchId,night)=>String(row?.matchId||'')===matchId&&Number(row?.night)===night;
const distinct=values=>[...new Set(values)];

export function resolveWolfNight({interactions=[],players={},matchId,night}={}){
  const match=String(matchId||''),cycle=Number(night);
  if(!match||!Number.isInteger(cycle)||cycle<1)
    return {ok:false,error:'INVALID_RESOLUTION_CONTEXT',victims:[],blocked:[],transfers:[],biteCount:0};
  const rows=Array.isArray(interactions)?interactions:[],
    actions=rows.filter(row=>isFrom(row,match,cycle)&&row?.type==='effect_notice'),
    bites=distinct(actions.filter(row=>row.actionId==='action_wolf_bite').map(row=>login(row.loginId)).filter(Boolean)),
    guards=new Set(actions.filter(row=>row.actionId==='action_protect').map(row=>login(row.loginId)).filter(Boolean)),
    direction=actions.filter(row=>row.actionId==='action_transfer_bite'&&['left','right'].includes(row.direction)).at(-1)?.direction||'';
  if(!bites.length)return {ok:true,victims:[],blocked:[],transfers:[],biteCount:0};

  const targets=Object.values(players&&typeof players==='object'?players:{}),
    byLogin=new Map(targets.filter(x=>login(x?.loginId)).map(x=>[login(x.loginId),x]));
  const seated=targets.filter(x=>Number.isInteger(Number(x?.seatId))&&Number(x.seatId)>0&&login(x?.loginId))
    .map(x=>({loginId:login(x.loginId),seatId:Number(x.seatId)}))
    .sort((a,b)=>a.seatId-b.seatId||a.loginId.localeCompare(b.loginId));
  // Do not guess who is adjacent if a transfer was confirmed without reliable seats.
  if(direction&&(seated.length<2||
    new Set(seated.map(x=>x.seatId)).size!==seated.length||
    bites.some(id=>!seated.some(x=>x.loginId===id))))
    return {ok:false,error:'SEAT_ORDER_UNAVAILABLE',victims:[],blocked:[],transfers:[],biteCount:bites.length};
  const protectedTargets=[],transfers=[],victims=[];
  for(const origin of bites){
    if(!byLogin.has(origin))continue;
    let target=origin;
    if(direction){
      const n=seated.findIndex(x=>x.loginId===origin);
      const next=(n+(direction==='right'?1:-1)+seated.length)%seated.length;
      target=seated[next].loginId;
      transfers.push({from:origin,to:target,direction});
    }
    if(guards.has(target)){protectedTargets.push(target);continue}
    if(rows.some(row=>String(row?.matchId||'')===match&&login(row?.loginId)===target&&
      ['dead','expelled'].includes(String(row?.type||''))&&row?.effectActive!==false))continue;
    victims.push(target);
  }
  return {ok:true,victims:distinct(victims),blocked:distinct(protectedTargets),transfers,biteCount:bites.length};
}
