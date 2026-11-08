// Match history ("Thư viện"): one public record per finished match + a short per-night summary.
// Pure functions only. The summary lists PUBLIC outcomes (deaths, revivals, expulsions, freezes) —
// never private role actions (seer peeks, protections...), so it is safe to show every web player.
export const MATCH_HISTORY_LIMIT=200,MATCH_NIGHT_LINE_LIMIT=12;
const PUBLIC_EVENTS={dead:"chết",revive:"được hồi sinh",expelled:"bị trục xuất",frozen:"bị đóng băng"};
const text=(v,max=120)=>String(v??"").trim().slice(0,max);
const norm=v=>String(v||"").trim().toLowerCase();

export function buildMatchHistory({matchId,roomCode="",roomName="",gameName="",endedAt="",winnerFaction="",winnerLabel="",endNight=0,players=[],assignments=[],interactions=[]}={}){
  const id=text(matchId,80);if(!id)return null;
  const playerList=Array.isArray(players)?players:Object.values(players||{});
  const nameOf=new Map();for(const p of playerList){const k=norm(p?.loginId||p?.participantId);if(k)nameOf.set(k,text(p?.displayName||p?.loginId||p?.participantId,40))}
  const roleOf=new Map();for(const a of Array.isArray(assignments)?assignments:[]){const k=norm(a?.loginId);if(!k)continue;const name=text(a?.roleName||a?.roleCard?.name,60),faction=text(a?.roleCard?.faction??a?.faction,40),cur=roleOf.get(k)||{roles:[],factions:[]};if(name)cur.roles.push(name);if(faction)cur.factions.push(faction);roleOf.set(k,cur)}
  const label=lid=>nameOf.get(norm(lid))||text(lid,40)||"Người chơi";
  const rows=(Array.isArray(interactions)?interactions:[]).filter(x=>x&&PUBLIC_EVENTS[x.type]&&(!x.matchId||String(x.matchId)===id));
  const deadIds=new Set(rows.filter(x=>x.type==="dead").map(x=>norm(x.loginId)));
  for(const x of rows.filter(r=>r.type==="revive"))deadIds.delete(norm(x.loginId));
  const byNight=new Map();let last=Math.max(0,Math.trunc(Number(endNight)||0));
  for(const x of rows){const n=Math.max(0,Math.trunc(Number(x.night)||0));last=Math.max(last,n);const list=byNight.get(n)||[];const verb=PUBLIC_EVENTS[x.type],cause=x.type==="dead"?text(x.effectName,60):"";const line=label(x.loginId)+" "+verb+(cause?" ("+cause+")":"");if(!list.includes(line))list.push(line);byNight.set(n,list)}
  const nights=[];for(let n=1;n<=last;n++){const events=(byNight.get(n)||[]).slice(0,MATCH_NIGHT_LINE_LIMIT);nights.push({night:n,events,summary:"Đêm "+n+": "+(events.length?events.join(" · "):"Không có ai chết.")})}
  const extra=byNight.get(0);if(extra?.length)nights.push({night:0,events:extra.slice(0,MATCH_NIGHT_LINE_LIMIT),summary:"Khác: "+extra.slice(0,MATCH_NIGHT_LINE_LIMIT).join(" · ")});
  const roster=playerList.map(p=>{const k=norm(p?.loginId||p?.participantId),r=roleOf.get(k);return{name:text(p?.displayName||p?.loginId,40),roleName:r?r.roles.join(" + "):"",faction:r?r.factions.join(" + "):"",alive:!deadIds.has(k)}}).filter(p=>p.name);
  return{matchId:id,roomCode:text(roomCode,12),roomName:text(roomName),gameName:text(gameName),endedAt:text(endedAt,40)||new Date().toISOString(),winnerFaction:text(winnerFaction,40),winnerLabel:text(winnerLabel,120),playerCount:roster.length,players:roster,nights,summary:nights.map(n=>n.summary)};
}

// Light row for the Thư viện list (no night text).
export function matchHistoryListRow(r){return{matchId:r.matchId,roomName:r.roomName,gameName:r.gameName,endedAt:r.endedAt,winnerFaction:r.winnerFaction,winnerLabel:r.winnerLabel,playerCount:r.playerCount,nightCount:Array.isArray(r.nights)?r.nights.filter(n=>n.night>0).length:0}}

// Idempotent on matchId (gm/end can be retried); newest first; capped.
export function upsertMatchIndex(index,record){
  const rows=(Array.isArray(index)?index:[]).filter(x=>x&&x.matchId!==record.matchId);
  rows.unshift(matchHistoryListRow(record));
  rows.sort((a,b)=>String(b.endedAt).localeCompare(String(a.endedAt)));
  return rows.slice(0,MATCH_HISTORY_LIMIT);
}
