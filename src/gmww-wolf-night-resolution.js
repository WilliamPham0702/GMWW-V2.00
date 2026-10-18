/* GMWW G4.3: pure night wolf-effect resolver, no writes or implicit phase changes.
 * Input rows are confirmed GM interaction receipts, recorded during real night turns.
 * The result is intentionally deterministic so Durable Object retries cannot
 * select a different victim; saved matches and arbitrary death causes are untouched.
 */
const login=value=>String(value??'').trim().toLowerCase().replace(/^member:/,'');
export function isWolfAssignment(a){
  const role=String(a?.roleId||'').toLowerCase(),faction=String(a?.roleCard?.factionId||a?.factionId||a?.faction||'').toLowerCase();
  return role.includes('wolf')||role.startsWith('role_snow_wolf')||
    faction==='wolf'||faction.includes('sói')||faction.includes('soi');
}
export function snowWolfMayBite({assignments=[],interactions=[],actorId,matchId}={}){
  const actor=login(actorId),rows=Array.isArray(interactions)?interactions:[],match=String(matchId||'');
  const dead=new Set(rows.filter(x=>x.type==='dead'&&x.effectActive!==false&&(!x.matchId||String(x.matchId)===match))
    .map(x=>login(x.loginId)));
  return !(Array.isArray(assignments)?assignments:[]).some(x=>
    login(x?.loginId)!==actor&&isWolfAssignment(x)&&!dead.has(login(x.loginId)));
}
export function resolveMaidenNight({interactions=[],assignments=[],matchId,night,wolfVictims=[]}={}){
  const match=String(matchId||''),cycle=Number(night),rows=Array.isArray(interactions)?interactions:[],
    roles=Array.isArray(assignments)?assignments:[],visits=rows.filter(x=>
      x.actionId==='action_visit_house'&&x.type==='effect_notice'&&!x.undone&&
      String(x.matchId||'')===match&&Number(x.night)===cycle),
    byId=new Map(roles.map(x=>[login(x.loginId),x])),
    killed=new Set((Array.isArray(wolfVictims)?wolfVictims:[]).map(login));
  for(const x of rows)if(x.type==='dead'&&x.effectActive!==false&&(!x.matchId||String(x.matchId)===match)&&
    Number(x.night)===cycle)killed.add(login(x.loginId));
  const newVictims=new Set(),escaped=new Set();
  for(const visit of visits){
    const girl=login(visit.actorId),target=login(visit.loginId);
    if(!girl||!target||girl===target||String(byId.get(girl)?.roleId||'')!=='role_maiden')continue;
    if(!isWolfAssignment(byId.get(target))&&!killed.has(target))escaped.add(girl);
    if(isWolfAssignment(byId.get(target))||killed.has(target))newVictims.add(girl);
  }
  return {newVictims:[...newVictims],escaped:[...escaped].filter(x=>!newVictims.has(x))};
}
const isFrom=(row,matchId,night)=>String(row?.matchId||'')===matchId&&Number(row?.night)===night;
const distinct=values=>[...new Set(values)];

export function resolveWolfNight({interactions=[],players={},matchId,night}={}){
  const match=String(matchId||''),cycle=Number(night);
  if(!match||!Number.isInteger(cycle)||cycle<1)
    return {ok:false,error:'INVALID_RESOLUTION_CONTEXT',victims:[],blocked:[],transfers:[],biteCount:0};
  const rows=Array.isArray(interactions)?interactions:[],
    actions=rows.filter(row=>isFrom(row,match,cycle)&&row?.type==='effect_notice'),
    bites=distinct(actions.filter(row=>row.actionId==='action_wolf_bite').map(row=>login(row.loginId)).filter(Boolean)),
    guards=new Set(actions.filter(row=>['action_protect','action_witch_save'].includes(row.actionId)).map(row=>login(row.loginId)).filter(Boolean)),
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
  const protectedTargets=[],transfers=[],victims=[],attacked=[];
  for(const origin of bites){
    if(!byLogin.has(origin))continue;
    let target=origin;
    if(direction){
      const n=seated.findIndex(x=>x.loginId===origin);
      const next=(n+(direction==='right'?-1:1)+seated.length)%seated.length;
      target=seated[next].loginId;
      transfers.push({from:origin,to:target,direction});
    }
    attacked.push({from:origin,to:target,direction:direction||'none',protected:guards.has(target)});
    if(guards.has(target)){protectedTargets.push(target);continue}
    if(rows.some(row=>String(row?.matchId||'')===match&&login(row?.loginId)===target&&
      ['dead','expelled'].includes(String(row?.type||''))&&row?.effectActive!==false))continue;
    victims.push(target);
  }
  return {ok:true,victims:distinct(victims),blocked:distinct(protectedTargets),transfers,attacked,biteCount:bites.length};
}

// All real scan actions in the V2 card catalog. Keep this GM-only:
 // faction, role and function information must never be projected to Player Web.
export const DIVINATION_ACTION_IDS=Object.freeze([
  'action_seer','action_aura_read','action_fox_scan','action_bear_scan',
  'action_scan_three','action_find_seer','action_destroyer_scry','action_compare_faction',
  'action_wolf_seer','action_rotten_seer'
]);
export function resolveNightReveal({actionId,targetIds=[],assignments=[]}={}){
  const action=String(actionId||'');
  if(!DIVINATION_ACTION_IDS.includes(action))return null;
  const targets=[...new Set((Array.isArray(targetIds)?targetIds:[]).map(login).filter(Boolean))];
  const required=['action_fox_scan','action_scan_three'].includes(action)?3:
    ['action_bear_scan','action_compare_faction'].includes(action)?2:1;
  if(targets.length!==required)return null;
  const byId=new Map((Array.isArray(assignments)?assignments:[]).map(a=>[login(a.loginId),a]));
  if(targets.some(x=>!byId.has(x)))return null;
  const reads=targets.map(id=>{
    const a=byId.get(id),roleId=String(a.roleId||''),
      faction=String(a.roleCard?.factionId||a.factionId||a.faction||'').toLowerCase(),
      wolf=isWolfAssignment(a);
    return {loginId:id,roleId,roleName:String(a.roleName||a.roleCard?.name||roleId),
      faction,wolf,functions:(a.roleCard?.functions||[]).map(f=>String(f.actionId||'')).filter(Boolean)};
  });
  if(action==='action_aura_read'){
    const result=reads[0];return {kind:'aura',actionId:action,targets:reads.map(({loginId,roleName,functions})=>({loginId,roleName,functions})),
      message:result.roleName};
  }
  if(action==='action_destroyer_scry')
    return {kind:'role',actionId:action,targets:reads.map(x=>({loginId:x.loginId,roleName:x.roleName})),message:reads[0].roleName};
  if(action==='action_find_seer'){
    const found=reads[0].roleId==='role_seer';
    return {kind:'seer-check',actionId:action,targets:reads.map(x=>({loginId:x.loginId})),
      found,message:found?'TIÊN TRI':'KHÔNG PHẢI TIÊN TRI'};
  }
  if(action==='action_compare_faction'){
    if(!reads[0].faction||!reads[1].faction)return null;
    const same=reads[0].faction===reads[1].faction;
    return {kind:'faction-compare',actionId:action,targets:reads.map(x=>({loginId:x.loginId})),
      same,message:same?'CÙNG PHE':'KHÁC PHE'};
  }
  // The Alpha Wolf deceives the regular Seer only, not a group check.
  const wolves=reads.some(x=>x.wolf&&(action!=='action_seer'||x.roleId!=='role_alpha_wolf'));
  return {kind:'wolf-check',actionId:action,targets:reads.map(x=>({loginId:x.loginId})),
    wolf:wolves,message:wolves?'CÓ SÓI':action==='action_seer'?'KHÔNG PHẢI SÓI':'KHÔNG CÓ SÓI'};
}
