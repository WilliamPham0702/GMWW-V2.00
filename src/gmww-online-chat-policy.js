import {statusTagsFor} from './gmww-public-room-contract.js';
// GMWW Online chat: private, server-authoritative permissions.
// The room's night queue is the single source of truth; never infer access from faction alone.
const normalize=id=>String(id||'').trim().toLowerCase().replace(/^member:/,'');
const active=(row,match,now)=>row&&row.effectActive!==false&&(!row.matchId||String(row.matchId)===String(match||''))&&(!row.expiresAt||Date.parse(row.expiresAt)>now);
export function chatBlockedByEffects(rows,match,loginId,now=Date.now()){
  const id=normalize(loginId);
  let dead=false,expelled=false,frozen=false,mute=false;
  for(const x of Array.isArray(rows)?rows:[]){
    if(normalize(x?.loginId)!==id||!active(x,match,now))continue;
    if(x.type==='dead')dead=true;
    if(x.type==='frozen')frozen=true;
    if(x.type==='expelled')expelled=true;
    if(x.type==='status'&&x.statusId==='mute')mute=true;
  }
  return{dead,expelled,frozen,mute};
}
function stepGroups(step){
  if(!step||typeof step!=='object')return [];
  if(['wolf-introduction','wolf-pack-bite'].includes(step.kind)){
    const members=step.kind==='wolf-introduction'?step.recognitionIds:step.loginIds;
    return[{id:'wolves',members:(members||[]).map(normalize)}];
  }
  if(step.kind==='role-group')return(step.roles||[]).map(r=>({id:'role:'+String(r.roleId||''),members:(r.loginIds||[]).map(normalize)}));
  if(step.kind==='role')return[{id:'role:'+String(step.roleId||''),members:(step.loginIds||[]).map(normalize)}];
  return [];
}
export function chatPolicy({meta,players,rows,runtime,loginId,bans={},now=Date.now()}){
  const id=normalize(loginId),member=players?.['member:'+id];
  if(!id||!member||meta?.enabled===false||!['lobby','waiting','role_delivery','running'].includes(String(meta?.phase||'')))
    return{canRead:false,canSend:false,channel:null,reason:'CHAT_NOT_IN_RUNNING_ROOM'};
  if(['lobby','waiting','role_delivery'].includes(String(meta.phase)))return{canRead:true,canSend:bans[id]!==true,channel:'lobby',scope:'village',reason:bans[id]===true?'CHAT_MUTED_GM':null};
  const effects=chatBlockedByEffects(rows,meta?.matchId,id,now);
  const phase=String(meta.cyclePhase||'');
  // Freeze blocks group/village chat at night only. Morning restores it.
  // Death and exile continue to block village and group chat in every phase.
  const frozen=phase==='night'&&effects.frozen;
  const blocked=effects.dead||effects.expelled||frozen||effects.mute||bans[id]===true;
  const reason=effects.dead?'CHAT_DEAD':effects.expelled?'CHAT_EXPELLED':frozen?'CHAT_FROZEN':effects.mute?'CHAT_MUTED_ARTIFACT':bans[id]===true?'CHAT_MUTED_GM':null;
  if(phase==='morning'||phase==='day')
    return{canRead:true,canSend:!blocked,channel:'day',scope:'village',reason};
  if(phase!=='night'||effects.dead||effects.expelled||effects.frozen)
    return{canRead:false,canSend:false,channel:null,reason:reason||'CHAT_NIGHT_CLOSED'};
  const step=!runtime?.completed?runtime?.queue?.[runtime.cursor]:null;
  const groups=stepGroups(step);
  // One person cannot bridge unrelated night groups in a shared queue step.
  const permitted=groups.filter(g=>g.members.length>=2&&g.members.includes(id)&&
    g.members.filter(other=>{
      const e=chatBlockedByEffects(rows,meta?.matchId,other,now);
      return !!players['member:'+other]&&!e.dead&&!e.expelled;
    }).length>=2);
  if(permitted.length!==1)return{canRead:false,canSend:false,channel:null,reason:'CHAT_NIGHT_NOT_SHARED'};
  const group=permitted[0],channel='night:'+String(meta.cycleKey||'')+':'+String(step.id||'')+':'+group.id;
  return{canRead:true,canSend:!blocked,channel,scope:'secret',reason};
}
export function chatNormalizeText(value){
  if(typeof value!=='string')return'';
  return value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,280);
}

// Lobby conversations are isolated by room reset; old match effects cannot mute a new lobby.
export function chatStorageScope(meta){return String(meta?.phase)==='running'?String(meta?.matchId||''):('lobby-'+String(meta?.resetVersion||0))}
export function publicChatNotices(meta,players,rows){
  // Public announcements are emitted only after night resolution. Never reveal
  // night actors, tentative wolf targets, private chat, or unconfirmed choices.
  if(meta?.enabled===false||meta?.phase!=='running'||
     !['morning','day'].includes(String(meta.cyclePhase||'')))return [];
  const match=String(meta.matchId||''),now=Date.now(),members=players||{};
  const nameOf=id=>{const key=normalize(id);return String(members['member:'+key]?.displayName||key||'Người chơi').slice(0,80)};
  const eligible=row=>!!row&&(!row.matchId||String(row.matchId)===match)&&
    (!row.expiresAt||Date.parse(row.expiresAt)>now);
  const negative={dead:'đã chết',expelled:'đã bị đuổi khỏi làng',frozen:'đã bị đóng băng',
    wolf_bitten:'đã bị Sói cắn',marked:'đã bị đánh dấu',infected:'đã bị nhiễm bệnh',
    mute:'đã bị câm',disabled_permanent:'đã mất năng lực',disabled_2n:'đã mất năng lực 2 đêm'};
  const messages=[],seen=new Set();
  const add=(row,id,text,stamp)=>{
    const player=normalize(id);if(!members['member:'+player])return;
    const key='notice:'+match+':'+String(row.id||row.clientEventId||row.createdAt||'')+':'+player+':'+text;
    if(seen.has(key))return;seen.add(key);
    const parsed=Date.parse(String(stamp||row.respondedAt||row.resolvedAt||row.createdAt||''));
    messages.push({id:key,senderId:'system',senderName:'Thông cáo Làng',system:true,isGM:false,
      text,at:Number.isFinite(parsed)?parsed:0});
  };
  const all=Array.isArray(rows)?rows:[];
  for(const row of all){
    if(!eligible(row)||!normalize(row.loginId))continue;
    const name=nameOf(row.loginId);
    if(row.type==='assassin_mark'){
      if(row.status==='responded'&&['👍','👎'].includes(String(row.response))&&
         ['👍','👎'].includes(String(row.gmChoice))){
        // Public chat reports the verified outcome only. Never expose the actor's
        // name, role or choice to other players (including notice IDs).
        const survived=row.response===row.gmChoice;
        add(row,row.loginId,survived?
          'Chúc mừng '+name+' đã lựa chọn đúng và tiếp tục sống.':
          'Chia buồn '+name+' đã lựa chọn sai và đã chết.',row.respondedAt);
      }else if(row.effectActive!==false&&row.status!=='responded'){
        add(row,row.loginId,name+' đã bị đánh dấu.');
      }
      continue;
    }
    if(row.effectActive===false)continue;
    if(row.type==='dead'&&row.source==='assassin'&&all.some(mark=>
       mark.type==='assassin_mark'&&normalize(mark.loginId)===normalize(row.loginId)&&
       mark.status==='responded'&&eligible(mark)))continue;
    const type=row.type==='status'?String(row.statusId||''):String(row.type||'');
    if(!Object.hasOwn(negative,type))continue;
    if(type==='dead')add(row,row.loginId,'Đêm qua '+name+' đã chết.');
    else add(row,row.loginId,name+' '+negative[type]+'.');
  }
  return messages.sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id)).slice(-100);
}
