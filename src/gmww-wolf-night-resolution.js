/* GMWW G4.3: pure night wolf-effect resolver, no writes or implicit phase changes.
 * Input rows are confirmed GM interaction receipts, recorded during real night turns.
 * The result is intentionally deterministic so Durable Object retries cannot
 * select a different victim; saved matches and arbitrary death causes are untouched.
 */
import {isWolfRole} from './gmww-pack-night-rules.js';
const login=value=>String(value??'').trim().toLowerCase().replace(/^member:/,'');
const isFrom=(row,matchId,night)=>String(row?.matchId||'')===matchId&&Number(row?.night)===night;
const distinct=values=>[...new Set(values)];

// Private rule snapshots are intentionally not added to public assignment summaries.
export async function readNightAssignments(storage,matchId){
  const summary=await storage.get('assignments')||[];
  return Promise.all(summary.map(async row=>{
    const id=login(row.loginId),stored=await storage.get('roles:'+id),legacy=await storage.get('role:'+id);
    const records=Array.isArray(stored)&&stored.length?stored:(legacy?[legacy]:[]);
    const record=records.find(r=>String(r.roleId)===String(row.roleId)&&(!r.matchId||String(r.matchId)===String(matchId)));
    return {...row,roleCard:record?.roleCard||row.roleCard||{}};
  }));
}
export function isNightImmune(assignments,loginId){
  return assignments.some(row=>login(row.loginId)===login(loginId)&&row.roleCard?.flags?.nightImmune===true);
}

export function resolveWolfNight({interactions=[],players={},assignments=[],matchId,night}={}){
  const match=String(matchId||''),cycle=Number(night);
  if(!match||!Number.isInteger(cycle)||cycle<1)
    return {ok:false,error:'INVALID_RESOLUTION_CONTEXT',victims:[],blocked:[],transfers:[],attacked:[],biteCount:0};
  const rows=Array.isArray(interactions)?interactions:[],
    actions=rows.filter(row=>isFrom(row,match,cycle)&&row?.type==='effect_notice'),
    bites=distinct(actions.filter(row=>row.actionId==='action_wolf_bite').map(row=>login(row.loginId)).filter(Boolean)),
    guards=new Set(actions.filter(row=>['action_protect','action_witch_save'].includes(row.actionId)).map(row=>login(row.loginId)).filter(Boolean)),
    direction=actions.filter(row=>row.actionId==='action_transfer_bite'&&['left','right'].includes(row.direction)).at(-1)?.direction||'';
  if(!bites.length)return {ok:true,victims:[],blocked:[],transfers:[],attacked:[],biteCount:0};
  // NIGHT-02: an Alpha Wolf frozen by Snow Wolf or expelled from the village
  // disables the lethal pack bite. Frozen Alpha does not reveal bitten targets
  // to the Witch; the submitted intent may still be recorded for history.
  const alphaIds=new Set((Array.isArray(assignments)?assignments:[]).filter(x=>
    x?.roleId==='role_alpha_wolf'&&!rows.some(y=>isFrom(y,match,cycle)&&y?.type==='dead'&&
      y.effectActive!==false&&login(y.loginId)===login(x.loginId))).map(x=>login(x.loginId)));
  const disabledAlpha=rows.some(x=>String(x?.matchId||'')===match&&alphaIds.has(login(x.loginId))&&
    (x.effectActive!==false||(x.type==='frozen'&&x.expiredReason==='MORNING_START'&&Number(x.night)===cycle))&&
    ((x.type==='frozen'&&Number(x.night)===cycle)||x.type==='expelled'));
  if(disabledAlpha)return {ok:true,victims:[],blocked:[],transfers:[],attacked:[],biteCount:bites.length,
    packDisabled:true,reason:'ALPHA_FROZEN_OR_EXPELLED'};

  const targets=Object.values(players&&typeof players==='object'?players:{}),
    byLogin=new Map(targets.filter(x=>login(x?.loginId)).map(x=>[login(x.loginId),x]));
  const seated=targets.filter(x=>Number.isInteger(Number(x?.seatId))&&Number(x.seatId)>0&&login(x?.loginId))
    .map(x=>({loginId:login(x.loginId),seatId:Number(x.seatId)}))
    .sort((a,b)=>a.seatId-b.seatId||a.loginId.localeCompare(b.loginId));
  // Do not guess who is adjacent if a transfer was confirmed without reliable seats.
  if(direction&&(seated.length<2||
    new Set(seated.map(x=>x.seatId)).size!==seated.length||
    bites.some(id=>!seated.some(x=>x.loginId===id))))
    return {ok:false,error:'SEAT_ORDER_UNAVAILABLE',victims:[],blocked:[],transfers:[],attacked:[],biteCount:bites.length};
  // A Maiden who confirmed a house visit is physically away from her own
  // house when wolves bite. The visited house is resolved separately at dawn.
  // Ignore undone, cross-match, cross-night and forged non-Maiden visit rows.
  const visitingMaidens=new Set(actions.filter(row=>row.actionId==='action_visit_house'&&
    row.undone!==true&&login(row.actorId)!==login(row.loginId)&&
    byLogin.has(login(row.actorId))&&byLogin.has(login(row.loginId))&&
    assignments.some(a=>login(a.loginId)===login(row.actorId)&&a.roleId==='role_maiden'))
    .map(row=>login(row.actorId)));
  const protectedTargets=[],transfers=[],victims=[],attacked=[];
  for(const origin of bites){
    if(!byLogin.has(origin))continue;
    let target=origin;
    if(direction){
      const n=seated.findIndex(x=>x.loginId===origin);
      // Seat IDs increase clockwise in the displayed GM ring: visual right is the previous seat.
      const next=(n+(direction==='right'?-1:1)+seated.length)%seated.length;
      // Do not transfer a bite into a person dead on an earlier day/night.
      const directionDelta=direction==='right'?-1:1;
      const eligible=row=>!rows.some(x=>x?.type==='dead'&&x.effectActive!==false&&
        String(x.matchId||'')===match&&login(x.loginId)===row.loginId);
      const candidate=Array.from({length:seated.length-1},(_,i)=>
        seated[(n+directionDelta*(i+1)+seated.length*(i+1))%seated.length]).find(eligible);
      if(!candidate)continue;
      target=candidate.loginId;
      transfers.push({from:origin,to:target,direction});
    }
    const protectedTarget=guards.has(target)||isNightImmune(assignments,target)||visitingMaidens.has(target);
    attacked.push({from:origin,to:target,direction:direction||'none',protected:protectedTarget});
    if(protectedTarget){protectedTargets.push(target);continue}
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
  'action_wolf_seer','action_rotten_seer','action-digan-scry','action-rotten-seer-check','action-vampire-check'
]);
export function resolveNightReveal({actionId,targetIds=[],assignments=[],expelledIds=[]}={}){
  const action=String(actionId||'');
  if(!DIVINATION_ACTION_IDS.includes(action))return null;
  const targets=[...new Set((Array.isArray(targetIds)?targetIds:[]).map(login).filter(Boolean))];
  const required=['action_fox_scan','action_scan_three','action-vampire-check'].includes(action)?3:
    ['action_bear_scan','action_compare_faction'].includes(action)?2:1;
  if(targets.length!==required)return null;
  const byId=new Map((Array.isArray(assignments)?assignments:[]).map(a=>[login(a.loginId),a]));
  if(targets.some(x=>!byId.has(x)))return null;
  const reads=targets.map(id=>{
    const a=byId.get(id),roleId=String(a.roleId||''),
      rawFaction=String(a.factionId||a.faction||a.roleCard?.factionId||'').toLowerCase(),
      faction=/^(village|villager|dân|dan)$|dân làng|dan lang/.test(rawFaction)?'village':/^(wolf|wolves)$|sói|soi/.test(rawFaction)?'wolf':/^(third)$|phe ba|phe thứ|phe thu/.test(rawFaction)?'third':rawFaction,
      wolf=roleId==='role_snow_wolf'||roleId==='role_wolf'||roleId==='role_alpha_wolf'||
        faction==='wolf'||faction.includes('sói')||faction.includes('soi');
    return {loginId:id,roleId,roleName:String(a.roleName||a.roleCard?.name||roleId),
      faction,wolf,functions:(a.roleCard?.functions||[]).map(f=>String(f.actionId||'')).filter(Boolean),hasFunction:(a.roleCard?.functions||[]).some(f=>!f.passive&&!['trigger','setup'].includes(f.phase))};
  });
  if(action==='action_aura_read'){
    const result=reads[0];return {kind:'aura',actionId:action,targets:reads.map(({loginId,roleId,roleName,functions})=>({loginId,roleId,roleName,functions})),
      message:result.roleName};
  }
  if(action==='action_destroyer_scry')
    return {kind:'role',actionId:action,targets:reads.map(x=>({loginId:x.loginId,roleName:x.roleName})),message:reads[0].roleName};
  if(action==='action-digan-scry')return {kind:'faction',actionId:action,targets:reads.map(x=>({loginId:x.loginId})),faction:reads[0].faction,message:reads[0].faction==='wolf'?'PHE SÓI':reads[0].faction==='village'?'PHE DÂN LÀNG':reads[0].faction==='third'?'PHE BA':reads[0].faction};
  if(['action-rotten-seer-check','action_rotten_seer'].includes(action))return {kind:'function-check',actionId:action,targets:reads.map(x=>({loginId:x.loginId})),hasFunction:reads[0].hasFunction,message:reads[0].hasFunction?'CÓ CHỨC NĂNG':'KHÔNG CÓ CHỨC NĂNG'};
  if(action==='action_find_seer'||action==='action-vampire-check'){
    const found=reads.some(x=>x.roleId==='role_seer');
    return {kind:'seer-check',actionId:action,targets:reads.map(x=>({loginId:x.loginId})),
      found,message:found?'TIÊN TRI':'KHÔNG PHẢI TIÊN TRI'};
  }
  if(action==='action_compare_faction'){
    if(!reads[0].faction||!reads[1].faction)return null;
    const same=reads[0].faction===reads[1].faction;
    return {kind:'faction-compare',actionId:action,targets:reads.map(x=>({loginId:x.loginId,roleId:x.roleId,roleName:x.roleName})),
      same,message:same?'CÙNG PHE':'KHÁC PHE'};
  }
  // Expelled targets do not receive an effect. The regular Seer nevertheless
  // receives the neutral, non-wolf verdict without revealing their real role.
  // Preserve the Alpha Wolf's existing false-negative rule.
  const expelled=new Set((Array.isArray(expelledIds)?expelledIds:[]).map(login));
  const wolves=reads.some(x=>action==='action_seer'?
    (!expelled.has(x.loginId)&&(x.roleId==='role_human_wolf'||(x.wolf&&!['role_alpha_wolf','role_lycan'].includes(x.roleId)))):x.wolf);
  return {kind:'wolf-check',actionId:action,targets:reads.map(x=>({loginId:x.loginId})),
    wolf:wolves,message:action==='action_seer'?(wolves?'Người bạn soi là Sói':'Người bạn soi không phải là Sói'):(wolves?'CÓ SÓI':'KHÔNG CÓ SÓI')};
}

/* Match-local Snow Wolf and Maiden rules; never infer deaths from player-web state. */
export function canSnowWolfBite({assignments=[],interactions=[],matchId}={}){
  const match=String(matchId||'');
  const dead=new Set((Array.isArray(interactions)?interactions:[]).filter(row=>
    String(row?.matchId||'')===match&&row?.type==='dead'&&row?.effectActive!==false)
    .map(row=>login(row.loginId)));
  // Even two living Snow Wolves do NOT satisfy "one Snow Wolf alone".
  const aliveWolves=(Array.isArray(assignments)?assignments:[]).filter(row=>{
    return isWolfRole(row)&&!dead.has(login(row?.loginId));
  });
  return aliveWolves.length===1&&aliveWolves[0]?.roleId==='role_snow_wolf';
}
export function resolveMaidenNight({assignments=[],interactions=[],matchId,night}={}){
  const match=String(matchId||''),cycle=Number(night);
  if(!match||!Number.isInteger(cycle)||cycle<1)return [];
  const rows=Array.isArray(interactions)?interactions:[],assigned=Array.isArray(assignments)?assignments:[],
    roles=new Map(assigned.map(a=>[login(a?.loginId),a]));
  const dead=new Set(rows.filter(row=>row?.type==='dead'&&row?.effectActive!==false&&
    String(row?.matchId||'')===match&&Number(row?.night)===cycle).map(row=>login(row.loginId)));
  const victimIds=[];
  for(const visit of rows){
    if(visit?.type!=='effect_notice'||visit?.actionId!=='action_visit_house'||visit?.undone||
      String(visit?.matchId||'')!==match||Number(visit?.night)!==cycle)continue;
    const maiden=login(visit.actorId),target=login(visit.loginId),visitor=roles.get(maiden),visited=roles.get(target);
    if(visitor?.roleId!=='role_maiden'||!visited||!target||!maiden||maiden===target||dead.has(maiden))continue;
    const wolf=isWolfRole(visited);
    if(wolf||dead.has(target))victimIds.push(maiden);
  }
  return [...new Set(victimIds)];
}
