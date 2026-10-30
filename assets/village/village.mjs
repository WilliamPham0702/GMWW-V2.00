import "../status-visuals.js?v=v3139-orbits";
import "./village-layout.js?v=fire3101-gp2&seat=3195-rigid&drag=20261024";
const layout=globalThis.GMWW_VILLAGE_LAYOUT;
import {installVillageCamera} from "./village-camera.mjs";
import {createPublicRoomPoller,mergeStableSeats,validateRoomCode} from "./village-room.mjs";
import {startVillagePerformanceReporter} from "./village-performance.mjs";
import {mountCharacterRenderer,updateCharacterRenderer,normalizeRendererCommand} from "./character40-renderer.mjs?v=c40-1-mobile2";
import {resolveVillageCharacterId} from "./character40-identity.mjs";
// Isolated visual prototype: never writes to live rooms or player accounts.
// Exported helpers allow deterministic Node tests without a DOM.
export function positions(count,shape="",offset=null,spacing=100){if(!Number.isInteger(count)||count<1||count>30)throw Error("COUNT_OUT_OF_RANGE");return layout.positions(count,shape,offset,spacing)}
export function safeText(v){return String(v??"").slice(0,80)}
// A disconnected participant keeps presence/ready data, but does not need an OFFLINE · READY chip.
export function visibleVillagePlayerStatus(data,{moving=false,gm=false}={}){
  if(gm)return moving?"GM ĐANG TUẦN TRA":"GM ONLINE";
  if(moving)return "ĐANG DI CHUYỂN";
  const label=safeText(data?.statusLabel||"").trim();
  if(data?.online===false&&(!label||/^(?:OFFLINE|READY|CHƯA READY)(?:\s*[·•-]\s*(?:READY|CHƯA READY))?$/i.test(label)))return "";
  return label||(data?.online===false?"":data?.ready?"READY":"ONLINE");
}
export function reconcileVillageChildren(container,nodes){
  for(let i=0;i<nodes.length;i++)if(container.children[i]!==nodes[i])container.insertBefore(nodes[i],container.children[i]||null);
  while(container.children.length>nodes.length)container.lastElementChild.remove();
}
export function villageMotionNeedsFrame(players){return players.some(p=>p?.movementStatus==="moving")}
export function liveDisplaySeatId(player, projectedSeats={}) {
  // Preview Seat IDs are only placeholders. Never anchor an unseated walker to
  // one: that disables interpolation and makes click-to-move look like teleport.
  const assigned=Number(player?.seatId||0);
  if(!Number.isInteger(assigned)||assigned<=0)return null;
  return Number(projectedSeats?.[String(player?.id||player?.participantId||'')])||assigned;
}


export function mapCharacterAnimation(p){
  const a=p?.characterAnimation;
  if(!a||typeof a!=="object")return null;
  return{characterId:typeof a.characterId==="string"?safeText(a.characterId):"",rigId:typeof a.rigId==="string"?safeText(a.rigId):"",state:typeof a.state==="string"?safeText(a.state):"idle",motion:typeof a.motion==="string"?safeText(a.motion):"idle-breathe",facing:a.facing==="left"?"left":"right",loop:a.loop!==false,engineVersion:typeof a.engineVersion==="string"?safeText(a.engineVersion):"",activity:typeof a.activity==="string"?safeText(a.activity):"idle"};
}
export function mapPublicPlayers(state){
  const players=Array.isArray(state?.players)?state.players:[];
  const ids=new Set();let regularCount=0,gmIncluded=false;
  return players.filter(p=>{
    const id=String(p?.participantId||p?.id||"");if(!id||ids.has(id))return false;
    const gm=p?.isGM===true||p?.kind==="gm";if(gm){if(gmIncluded)return false;gmIncluded=true}else{if(regularCount>=30)return false;regularCount++}
    ids.add(id);return true;
  }).map(p=>({
    id:String(p.participantId||p.id),displayName:safeText(p.displayName||"Người chơi"),kind:p?.kind==="gm"?"gm":safeText(p?.kind||""),isGM:p?.isGM===true||p?.kind==="gm",avatarUrl:typeof p.avatarUrl==="string"?p.avatarUrl:"",
    avatarId:typeof p.avatarId==="string"?p.avatarId:"",
    gameCharacterId:typeof p.gameCharacterId==="string"?p.gameCharacterId:"",
    seatId:Number(p.seatId||0)||null,
    positionX:p.positionX==null?null:Number(p.positionX),positionY:p.positionY==null?null:Number(p.positionY),
    movementStatus:p.movementStatus==="moving"?"moving":"idle",characterAnimation:mapCharacterAnimation(p),villageActivity:safeText(p.villageActivity||"idle"),sitStartedAt:Number(p.sitStartedAt||0)||null,sitUntil:Number(p.sitUntil||0)||null,moveId:String(p.moveId||""),
    moveFromX:p.moveFromX==null?null:Number(p.moveFromX),moveFromY:p.moveFromY==null?null:Number(p.moveFromY),
    moveToX:p.moveToX==null?null:Number(p.moveToX),moveToY:p.moveToY==null?null:Number(p.moveToY),
    moveStartedAt:Number(p.moveStartedAt||0)||null,moveDurationMs:Number(p.moveDurationMs||0)||null,moveTargetSeatId:Number(p.moveTargetSeatId||0)||null,
    ready:!!p.ready,setupComplete:!!p.setupComplete,online:p.online!==false,statusLabel:safeText(p.statusLabel||""),roleName:safeText(p.roleName||""),frozen:p?.frozen===true,statusTags:Array.isArray(p.statusTags)?p.statusTags.slice(0,8).map(x=>({statusId:safeText(x?.statusId||""),icon:safeText(x?.icon||""),label:safeText(x?.label||"")})):[]
  }));
}
const game=typeof document==="undefined"?null:document.getElementById("game");
if(game){
  const players=document.getElementById("players");
  // Integration contract: server-filtered public player records only (never role/faction).
  const params=new URLSearchParams(window.location.search),embedded=params.get("embed")==="1"&&window.parent!==window;
  if(embedded)document.documentElement.classList.add("embedded");
  if(embedded){
    let gmwwLastActivitySignal=0;
    const gmwwSignalUserActivity=()=>{
      const now=Date.now();if(now-gmwwLastActivitySignal<450)return;gmwwLastActivitySignal=now;
      try{window.parent.postMessage({type:"gmww:user-activity"},window.location.origin)}catch{}
    };
    ["pointerdown","pointermove","touchstart","wheel","keydown"].forEach(type=>window.addEventListener(type,gmwwSignalUserActivity,{passive:true,capture:true}));
  }
  const supplied=Array.isArray(window.GMWW_VILLAGE_PLAYERS)?window.GMWW_VILLAGE_PLAYERS.slice(0,30):mapPublicPlayers(window.GMWW_PUBLIC_ROOM_STATE);
  // Only server-supplied participants; never render generated demo players.
  let all=embedded?[]:(supplied||[]);
  let liveRoom=embedded;
  function trustedAvatarUrl(raw){
    if(typeof raw!=="string"||!raw.trim())return "";
    try{const u=new URL(raw,window.location.href);
      return u.origin===window.location.origin&&["http:","https:"].includes(u.protocol)?u.href:"";
    }catch{return "";}
  }
  const CHARACTER_SCALES=[75,100,125,150,175,200],normalizeCharacterScale=value=>{const n=Number(value);if(!Number.isFinite(n))return 100;return CHARACTER_SCALES.reduce((best,x)=>Math.abs(x-n)<Math.abs(best-n)?x:best,CHARACTER_SCALES[0])};
  let matchStartedAt=0,battleStatic=false;
  let night=false,selectedId=null,count=12,seatLayout="",seatOffset={x:0,y:0},seatSpacing=100,setupState={enabled:false,walkEnabled:false,previewCharacterId:"",selectedSeatId:null,viewerParticipantId:"",clockOffsetMs:0,characterScale:100,showSeats:false},moveFrame=0,arrivalNotified=new Set();
  const visualFallbackMoves=new Map();
  // Last actually painted world position; never infer an expired move's start
  // from a newer heartbeat (which would make avatars teleport to the endpoint).
  const visualLastPaintedPositions=new Map();
  const mountedPlayerNodes=new Map(),mountedEmptySeatNodes=new Map();
  let sitWakeTimer=0;
  const villageRenderMetrics={renders:0,created:0,reused:0,movementFrames:0,mounted:0};
  window.GMWWVillageRenderMetrics=villageRenderMetrics;
  const stageElement=document.querySelector('.stage');
  const GMWW_SEATED_CHARACTER01_URL="data:image/webp;base64,"+["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"].join("");
  const GMWW_SEATED_CHARACTER_URLS=Object.freeze({"character-01":GMWW_SEATED_CHARACTER01_URL,"character-02":"/characters/seated-v296/character-02/front.webp","character-03":"/characters/seated-v297/character-03/front.webp","character-04":"/characters/seated-v300/character-04/front.webp"});
  function seatedCharacterUrl(characterId){return ""}
  function sittingNow(data,now=Date.now()+Number(setupState.clockOffsetMs||0)){return data?.villageActivity==="sitting"&&Number(data?.sitUntil||0)>now}

  function easeMove(t){t=Math.max(0,Math.min(1,Number(t)||0));return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2}
  function spawnPosition(id){return layout.spawn(id)}
  // UI-only anchor: a deceased person's displayed position must remain fixed
  // even when a separate autonomous movement system continues publishing coordinates.
  const deceasedDisplayPoints=new Map();
  function seatedMovementAllowed(data,now=Date.now()+Number(setupState.clockOffsetMs||0)){
    if(data?.movementStatus!=="moving")return false;
    // Preserve previous interpolation for unseated visitors and the stored
    // per-person death anchor even after the movement duration elapses.
    if(!Number(data?.seatId||0))return true; // Only actual assigned Seats block free roaming.
    const started=Number(data?.moveStartedAt||0),duration=Number(data?.moveDurationMs||0);
    if(!(started>0&&duration>0&&now<started+duration))return false;
    // Assigned Seats remain on the fire-centred template in setup; only a
    // genuine post-start move may leave a locked Seat during battle.
    return matchStartedAt>0&&started>matchStartedAt;
  }
  function movementPosition(data,seatPos=null,now=Date.now()+Number(setupState.clockOffsetMs||0)){
    const id=String(data?.id||data?.participantId||'');
    const dead=visuallyDeceased(data);
    if(!dead&&id)deceasedDisplayPoints.delete(id);
    if(dead&&id&&deceasedDisplayPoints.has(id))
      return{...deceasedDisplayPoints.get(id),progress:1,moving:false,sitting:false,sitRemainingMs:0};
    const activeMove=seatedMovementAllowed(data,now),pos=activeMove?layout.interpolate(data,now):seatPos||((data?.positionX!=null&&data?.positionY!=null)?layout.clampPoint(data.positionX,data.positionY):spawnPosition(data?.id)),progress=Math.max(0,Math.min(1,(now-Number(data?.moveStartedAt||0))/Math.max(1,Number(data?.moveDurationMs||1)))),sitting=sittingNow(data,now);
    if(dead){
      if(id)deceasedDisplayPoints.set(id,{x:pos.x,y:pos.y});
      return{...pos,progress:1,moving:false,sitting:false,sitRemainingMs:0};
    }
    return{...pos,progress,moving:activeMove&&progress<1,sitting,sitRemainingMs:sitting?Math.max(0,Number(data.sitUntil)-now):0};
  }
  function visualPlayerPoint(data,seatCount=count,now=Date.now()+Number(setupState.clockOffsetMs||0)){
    if(seatedMovementAllowed(data,now))return layout.interpolate(data,now);
    // For a seated player, the authoritative seat map always wins over stale
    // pre-layout world coordinates retained by older room versions.
    const sid=Number(data?.displaySeatId||data?.seatId||0),seat=sid?positions(Math.max(1,Math.min(30,Number(seatCount)||12)),seatLayout,seatOffset,seatSpacing)[sid-1]:null;
    if(seat)return seat;
    if(data?.positionX!=null&&data?.positionY!=null)return layout.clampPoint(data.positionX,data.positionY);
    return spawnPosition(data?.id)
  }
  function bridgeIncomingPositions(incoming,nextSetup,nextCount,previousRows=all){
    if(battleStatic){visualFallbackMoves.clear();visualLastPaintedPositions.clear();return incoming}
    const clock=Number(nextSetup?.clockOffsetMs||setupState.clockOffsetMs||0),now=Date.now()+clock,previous=new Map(previousRows.map(p=>[String(p?.id||''),p])),seen=new Set();
    const out=incoming.map(p=>{
      const id=String(p?.id||'');if(!id)return p;seen.add(id);
      if(p?.movementStatus==='moving'){visualFallbackMoves.delete(id);return p}
      // Fixed seats are never visually interpolated from stale room positions.
      // That legacy correction moved seated players away from the fire ring.
      if(Number(p?.displaySeatId||p?.seatId||0)>0){
        visualFallbackMoves.delete(id);
        return p;
      }
      const target=visualPlayerPoint(p,nextCount,now),existing=visualFallbackMoves.get(id);
      if(existing){
        const sameTarget=Math.hypot(Number(existing.moveToX)-target.x,(Number(existing.moveToY)-target.y)*2)<.65;
        if(sameTarget&&now<Number(existing.moveStartedAt)+Number(existing.moveDurationMs))return{...p,...existing,movementStatus:'moving'};
        visualFallbackMoves.delete(id)
      }
      const prev=previous.get(id);if(!prev)return p;
      const painted=visualLastPaintedPositions.get(id);
      const from=painted||movementPosition(prev,null,now),distance=Math.hypot(target.x-from.x,(target.y-from.y)*2);
      if(!Number.isFinite(distance)||distance<.65)return p;
      const duration=Math.max(720,Math.min(1900,Math.round(distance*42))),move={moveFromX:from.x,moveFromY:from.y,moveToX:target.x,moveToY:target.y,moveStartedAt:now,moveDurationMs:duration,moveId:'visual:'+id+':'+now};
      visualFallbackMoves.set(id,move);return{...p,...move,movementStatus:'moving'}
    });
    for(const id of visualFallbackMoves.keys())if(!seen.has(id))visualFallbackMoves.delete(id);
    for(const id of visualLastPaintedPositions.keys())if(!seen.has(id))visualLastPaintedPositions.delete(id);
    return out
  }
  function screenPoint(p,width=stageElement.clientWidth||864,height=stageElement.clientHeight||1536){return layout.toScreen(p,width,height)}
  function walkDirection(data){const dx=Number(data?.moveToX)-Number(data?.moveFromX);return Number.isFinite(dx)&&dx<-.01?"left":"right"}
  function walkFrameUrl(characterId,frame=1,direction="right"){const f=Math.max(1,Math.min(6,Number(frame)||1)),dir=direction==="left"?"?rev=c40-1&dir=left":"?rev=c40-1";return "/api/game-characters/"+encodeURIComponent(characterId)+"/frame/"+f+dir}
  function visuallyDeceased(data){return Array.isArray(data?.statusTags)&&data.statusTags.some(x=>x?.statusId==="dead")}
  function walkFrameFor(data,now=Date.now()+Number(setupState.clockOffsetMs||0)){if(visuallyDeceased(data)||data?.movementStatus!=="moving"||!data?.moveStartedAt)return 1;return (Math.floor(Math.max(0,now-Number(data.moveStartedAt))/95)%6)+1}
  function animationCommandFor(data,position){const base=data?.characterAnimation&&typeof data.characterAnimation==="object"?data.characterAnimation:{};const dead=visuallyDeceased(data),hanging=battleStatic&&!dead&&data?.isGM!==true&&data?.kind!=="gm"&&setupState?.gallowsHanging?.active===true&&String(data?.id||"").replace(/^member:/,"")===String(setupState.gallowsHanging.candidateId||""),moving=!battleStatic&&!dead&&!!position?.moving,sitting=!battleStatic&&!dead&&!!position?.sitting,state=hanging?"walking":sitting?"sitting":moving?(base.state==="running"?"running":"walking"):(data?.ready?"ready":"idle"),motion=dead?"dead":state==="sitting"?"sit":hanging?"walk":moving?(state==="running"?"run":"walk"):(state==="ready"?"ready":"idle-breathe");return normalizeRendererCommand({...base,characterId:data?.gameCharacterId||base.characterId,state:dead?"dead":state,motion,facing:moving?walkDirection(data):(base.facing||"right"),activity:hanging?"walk":data?.villageActivity||base.activity||"idle",paused:hanging?false:base.paused},data?.gameCharacterId||"character-01")}
  function gmActionFor(data,position,now=Date.now()+Number(setupState.clockOffsetMs||0)){if(!(data?.isGM===true||data?.kind==="gm"))return"";if(position?.moving)return String(data?.villageActivity||"")==="gm_manual"?"run":"walk";const phase=Math.floor(Number(now||0)/2200)%12;return phase===8?"shake":phase===10?"howl":"idle"}
  /* Pirate nomination gesture lives INSIDE the village iframe so pointerup
     can hit a Character. The parent sends a signed member request to the DO. */
  /* V3.206: preview-only drag. The parent validates the player and sends the
     actual vote only after explicit OK, so a dropped flag can be restored. */
  function syncPirateNominationFlag(){
    if(!embedded)return;
    let flag=document.getElementById('gmwwPirateNominate');
    if(!flag){
      const style=document.createElement('style');style.id='gmwwPirateSnapCss';
      style.textContent=`
        #gmwwPirateNominate{transition:filter .12s ease,scale .12s ease;cursor:grab}
        #gmwwPirateNominate.gmww-snap-near{filter:drop-shadow(0 0 14px #ffe77b) drop-shadow(0 4px 7px #000b)!important;scale:1.14}
        #gmwwPirateNominate.gmww-snap-picked{filter:drop-shadow(0 0 16px #ffe77b) drop-shadow(0 6px 8px #000d)!important}
        #players .player.gmww-gallows-snap-target .portrait,
        #players .player.gmww-gallows-snap-target img{outline:4px solid #ffdf6c!important;outline-offset:4px;
          box-shadow:0 0 0 7px #ff5c5d88,0 0 28px 11px #ffdb66dd!important;
          filter:brightness(1.28)!important;transition:box-shadow .12s ease,filter .12s ease}
        #players .player.gmww-gallows-snap-target .name{background:#b32937!important;
          border:2px solid #ffe69b!important;color:white!important;font-weight:900}
        #gmwwPirateConfirm{position:fixed;z-index:1012;display:flex;align-items:center;justify-content:center;
          gap:7px;transform:translate(-50%,0);pointer-events:auto}
        #gmwwPirateConfirm[hidden]{display:none!important}
        #gmwwPirateConfirm button{min-width:65px;min-height:38px;padding:5px 8px;border:2px solid #ffe2a0;
          border-radius:12px;color:white;font-weight:900;background:#116b69eF;box-shadow:0 4px 12px #000a}
        #gmwwPirateConfirm button[data-gallows-reset]{background:#214b60ee}
        #gmwwPirateSnapHint{position:fixed;z-index:1011;transform:translate(-50%,-100%);
          padding:3px 9px;border-radius:12px;background:#a92439f2;border:1px solid #ffe6a3;
          color:white;font-size:12px;font-weight:900;white-space:nowrap;pointer-events:none}
        #gmwwPirateSnapHint[hidden]{display:none!important}
      `;
      document.head.append(style);
      flag=document.createElement('button');flag.id='gmwwPirateNominate';flag.type='button';
      flag.setAttribute('aria-label','Kéo cờ đỏ gần Character để hút; thả để chọn tạm, OK để gửi đề cử hoặc Khôi Phục');
      flag.title='Cờ đỏ: kéo tới người chơi · thả chọn tạm · OK hoặc Khôi Phục';
      // Use the native red-flag emoji at its regular icon scale, without a box.
      flag.textContent='🚩';
      flag.style.cssText='position:fixed;z-index:1008;width:48px;height:48px;font-size:38px;line-height:48px;text-align:center;padding:0;background:transparent;border:0;box-shadow:none;touch-action:none;user-select:none;transform:translate(-50%,-50%)';
      flag.hidden=true;document.body.append(flag);
      const controls=document.createElement('div');controls.id='gmwwPirateConfirm';controls.hidden=true;
      controls.innerHTML='<button type="button" data-gallows-ok>✓ OK</button><button type="button" data-gallows-reset>↶ KHÔI PHỤC</button>';
      document.body.append(controls);
      const hint=document.createElement('span');hint.id='gmwwPirateSnapHint';hint.hidden=true;
      hint.setAttribute('role','status');hint.setAttribute('aria-live','polite');document.body.append(hint);
      const atFire=()=>{
        const point=screenPoint(layout.fire),r=stageElement.getBoundingClientRect();
        flag.style.left=Math.round(r.left+r.width*point.x/100)+'px';
        flag.style.top=Math.round(r.top+r.height*point.y/100)+'px';
      };
      let gesture=null,lastTap=0,pendingId='',snapNode=null;
      const playerId=node=>String(node?.dataset.playerId||'').replace(/^member:/,'');
      const eligibleNode=node=>{
        if(!node||node.classList.contains('gmww-sv-dead')||node.classList.contains('gm'))return false;
        const id=playerId(node),allowed=Array.isArray(setupState.gallowsEligibleTargets)?setupState.gallowsEligibleTargets:[];
        return !!id&&id!==String(setupState.viewerParticipantId||'').replace(/^member:/,'')&&allowed.includes(id);
      };
      const snapCandidate=(x,y)=>{
        let best=null,score=Infinity;
        document.querySelectorAll('#players .player[data-player-id]').forEach(node=>{
          if(!eligibleNode(node))return;
          const r=node.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
          const dist=Math.hypot(x-cx,y-cy);
          const radius=Math.max(56,Math.min(103,Math.max(r.width,r.height)*.95));
          if(dist<radius&&dist<score){best=node;score=dist}
        });
        return best;
      };
      const highlight=node=>{
        if(snapNode!==node){
          snapNode?.classList.remove('gmww-gallows-snap-target');
          snapNode=node||null;
          snapNode?.classList.add('gmww-gallows-snap-target');
        }
        flag.classList.toggle('gmww-snap-near',!!node);
        hint.hidden=!node;
        if(node)hint.textContent='🎯 '+String(node.querySelector('.name-text')?.textContent||node.dataset.playerId||'');
      };
      const moveTo=(x,y)=>{
        flag.style.left=Math.max(34,Math.min(innerWidth-34,x))+'px';
        flag.style.top=Math.max(50,Math.min(innerHeight-70,y))+'px';
      };
      const positionDecor=()=>{
        const x=Number.parseFloat(flag.style.left)||innerWidth/2,y=Number.parseFloat(flag.style.top)||innerHeight/2;
        controls.style.left=Math.max(110,Math.min(innerWidth-110,x))+'px';
        controls.style.top=Math.max(56,Math.min(innerHeight-49,y+47))+'px';
        hint.style.left=Math.max(78,Math.min(innerWidth-78,x))+'px';
        hint.style.top=Math.max(55,y-46)+'px';
      };
      const post=(type,participantId='')=>{
        try{window.parent.postMessage({type,participantId},window.location.origin)}catch{}
      };
      const syncSelected=()=>{
        if(gesture?.dragged)return;
        if(!setupState.gallowsCanNominate){
          pendingId='';highlight(null);controls.hidden=true;hint.hidden=true;return;
        }
        const previousPending=pendingId;
        pendingId=String(setupState.gallowsSelectedId||'');
        if(previousPending&&!pendingId)atFire();
        const node=[...document.querySelectorAll('#players .player[data-player-id]')].find(p=>playerId(p)===pendingId&&eligibleNode(p));
        if(node){
          const r=node.getBoundingClientRect();
          moveTo(r.left+r.width/2,r.top+r.height/2);
          highlight(node);
        }else{
          if(pendingId){pendingId='';post('gmww:gallows-reset-nominate')}
          highlight(null);
        }
        flag.classList.toggle('gmww-snap-picked',!!node);
        controls.hidden=!node;
        if(node)hint.textContent='🎯 '+String(node.querySelector('.name-text')?.textContent||pendingId);
        positionDecor();
      };
      flag.gmwwAtFire=atFire;
      flag.gmwwSyncSelection=syncSelected;
      const reset=()=>{
        pendingId='';flag.classList.remove('gmww-snap-picked');
        highlight(null);controls.hidden=true;hint.hidden=true;atFire();
        post('gmww:gallows-reset-nominate');
      };
      controls.querySelector('[data-gallows-ok]').addEventListener('click',()=>{
        if(!pendingId)return;
        post('gmww:gallows-confirm-nominate',pendingId);
      });
      controls.querySelector('[data-gallows-reset]').addEventListener('click',reset);
      flag.addEventListener('pointerdown',e=>{
        if(!setupState.gallowsCanNominate||e.button>0)return;
        const r=flag.getBoundingClientRect();
        gesture={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left+r.width/2,top:r.top+r.height/2,dragged:false};
        try{flag.setPointerCapture(e.pointerId)}catch{}
        e.preventDefault();
      });
      flag.addEventListener('pointermove',e=>{
        if(!gesture||gesture.id!==e.pointerId)return;
        const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
        if(!gesture.dragged&&Math.hypot(dx,dy)<10)return;
        if(!gesture.dragged){
          gesture.dragged=true;pendingId='';controls.hidden=true;
          flag.classList.remove('gmww-snap-picked');
          post('gmww:gallows-reset-nominate');
        }
        const x=gesture.left+dx,y=gesture.top+dy,node=snapCandidate(x,y);
        if(node){
          const r=node.getBoundingClientRect();
          moveTo(r.left+r.width/2,r.top+r.height/2);
        }else moveTo(x,y);
        highlight(node);positionDecor();
        e.preventDefault();
      });
      flag.addEventListener('pointerup',e=>{
        if(!gesture||gesture.id!==e.pointerId)return;
        const dragged=gesture.dragged;
        gesture=null;
        if(dragged){
          if(snapNode&&eligibleNode(snapNode)){
            pendingId=playerId(snapNode);
            flag.classList.add('gmww-snap-picked');
            controls.hidden=false;positionDecor();
            post('gmww:gallows-preview-nominate',pendingId);
          }else{
            controls.hidden=true;highlight(null);
          }
          lastTap=0;
        }else{
          const now=Date.now();
          if(now-lastTap<450){
            lastTap=0;post('gmww:gallows-open-nominations');
          }else lastTap=now;
        }
        e.preventDefault();
      });
      flag.addEventListener('pointercancel',()=>{
        gesture=null;highlight(null);flag.gmwwSyncSelection?.();
      });
      flag.addEventListener('keydown',e=>{
        if(e.key==='Enter'||e.key===' '){post('gmww:gallows-open-nominations');e.preventDefault()}
      });
    }
    const visible=!!setupState.gallowsCanNominate;
    if(visible&&flag.hidden!==false)flag.gmwwAtFire?.();
    if(!visible)flag.dataset.resetAtFire='1';
    if(visible&&flag.dataset.resetAtFire==='1'){flag.gmwwAtFire?.();delete flag.dataset.resetAtFire}
    flag.hidden=!visible;
    const controls=document.getElementById('gmwwPirateConfirm'),hint=document.getElementById('gmwwPirateSnapHint');
    if(!visible){if(controls)controls.hidden=true;if(hint)hint.hidden=true;
      document.querySelectorAll('#players .gmww-gallows-snap-target').forEach(n=>n.classList.remove('gmww-gallows-snap-target'));
    }
  }
  function makePlayerButton(data,position,seatId=null,index=0){
    const isGM=data?.isGM===true||data?.kind==="gm",actualSeat=Number(data?.seatId||seatId||0)||null,playerName=safeText(data.displayName||data.name||names[index]||"Người chơi"),button=document.createElement("button");
    button.type="button";button.className="player"+(isGM?" gm gm-action-"+gmActionFor(data,position):"")+(data?.frozen===true&&!isGM?" is-frozen":"")+(selectedId===data.id?" selected":"")+(String(data.id)===String(setupState.viewerParticipantId||"")?" self":"")+(position?.moving?" moving":"")+(position?.sitting?" sitting":"")+(actualSeat?" seated":" roaming");
    button.dataset.style=String(((actualSeat||index+1)-1)%5);button.dataset.playerId=safeText(data.id||("sample-"+(index+1)));if(actualSeat)button.dataset.seatId=String(actualSeat);if(data.moveId)button.dataset.moveId=String(data.moveId);
    if(Array.isArray(data.statusTags)&&data.statusTags.length){
      const visualEffects={frozen:"orbit",protected:"orbit",wolf_bitten:"orbit",marked:"orbit",dead:"gray-smoke",expelled:"orbit",infected:"orbit",mute:"orbit",disabled_permanent:"orbit",disabled_2n:"orbit",linked:"orbit",recover:"orbit",transform:"orbit",attack:"orbit",inspect:"orbit",hunt:"orbit"};
      const rows=data.statusTags.filter(x=>Object.prototype.hasOwnProperty.call(visualEffects,x.statusId)),panel=document.createElement("span"),badges=document.createElement("span");
      if(rows.length){button.classList.add("gmww-sv-stage");if(rows.some(x=>x.statusId==="dead"))button.classList.add("gmww-sv-dead");
        const approvedVisuals=globalThis.GMWW_STATUS_VISUALS;
        if(approvedVisuals)button.insertAdjacentHTML("beforeend",approvedVisuals.overlay(rows.map(x=>x.statusId)));
        else{panel.className="gmww-sv-overlay";panel.setAttribute("aria-hidden","true");
        const unique=[...new Set(rows.map(x=>x.statusId))],priority=["dead","expelled","wolf_bitten","frozen","disabled_permanent","disabled_2n","marked","infected","protected","mute","linked"],ordered=priority.filter(id=>unique.includes(id)),visible=ordered.includes("dead")?["dead"]:ordered.includes("expelled")?["expelled"]:ordered.slice(0,3);
        for(const id of visible){const effect=document.createElement("span");effect.className="gmww-sv-fx gmww-sv-"+visualEffects[id];effect.dataset.statusFx=id;for(let i=0;i<3;i++)effect.appendChild(document.createElement("i"));panel.appendChild(effect)}
        badges.className="gmww-sv-badges";badges.setAttribute("aria-hidden","true");
        for(const x of rows){const tag=document.createElement("span");tag.textContent=x.icon;tag.title=x.label;badges.appendChild(tag)}
        button.append(panel,badges);}
      }
    }
    const display=screenPoint(position);button.style.left=display.x+"%";button.style.top=display.y+"%";button.style.zIndex=String(10+Math.round(position.y));if(position?.moving)button.dataset.walkDir=walkDirection(data)
    const avatar=document.createElement("span");avatar.className="portrait";
    const characterId=resolveVillageCharacterId(data.gameCharacterId,data.id||data.participantId||data.displayName||index);
    const avatarId=typeof data.avatarId==="string"&&/^[A-Za-z0-9._-]{1,100}$/.test(data.avatarId)?data.avatarId:"";
    const direction=position?.moving&&!visuallyDeceased(data)?walkDirection(data):"right",gmUrl=isGM?trustedAvatarUrl(data.avatarUrl||"/gm/gm-white-wolf.webp"):"",characterUrl=isGM?"":(position?.sitting&&!visuallyDeceased(data)&&seatedCharacterUrl(characterId)?seatedCharacterUrl(characterId):trustedAvatarUrl(walkFrameUrl(characterId,walkFrameFor(data),direction))),legacyUrl=trustedAvatarUrl(data.avatarUrl||(avatarId?"/api/avatars/"+encodeURIComponent(avatarId)+"/image":"")),safeDefault=trustedAvatarUrl(walkFrameUrl("character-01",1));
    const sources=(isGM?[gmUrl]:[characterUrl,legacyUrl,safeDefault]).filter((u,i,a)=>u&&a.indexOf(u)===i);
    if(sources.length){avatar.classList.add("has-image","game-character");if(isGM)avatar.classList.add("gm-character");const scale=normalizeCharacterScale(setupState.characterScale)/100,compact=window.innerWidth<=390,baseW=compact?50:62,baseH=compact?67:82;avatar.style.width=baseW+"px";avatar.style.height=baseH+"px";button.style.setProperty("--gmww-character-scale",String(scale));button.style.minWidth=Math.max(52,baseW+10)+"px";if(isGM){const runtime=document.createElement("span"),shell=document.createElement("span"),shadow=document.createElement("span");runtime.className="gm-wolf-character";runtime.dataset.gmWolfRuntime="1";shell.className="gm-wolf-sprite";shadow.className="gm-wolf-shadow";runtime.append(shadow,shell);for(const cls of ["gm-wolf-segment gm-wolf-body","gm-wolf-segment gm-wolf-rear-legs","gm-wolf-segment gm-wolf-front-legs","gm-wolf-segment gm-wolf-head"]){const img=document.createElement("img");img.className=cls;img.src=sources[0];img.alt="";img.loading="eager";img.decoding="async";shell.append(img)}const dx=Number(data?.moveToX??position?.x??0)-Number(data?.moveFromX??position?.x??0);button.style.setProperty("--gm-run-dir",String(dx<0?-1:1));avatar.append(runtime)}else{const command=animationCommandFor({...data,gameCharacterId:characterId},position),renderer=mountCharacterRenderer(avatar,{characterId,command,sources,sitting:!!position?.sitting});const img=renderer?.querySelector?.("img[data-walk-character]");if(img){img.dataset.walkFrame=String(walkFrameFor(data));img.dataset.walkDir=direction}}}
    const name=document.createElement("span");name.className="name";
    const nameText=document.createElement("span");nameText.className="name-text";nameText.textContent=playerName;
    const presence=document.createElement("span");presence.className="player-presence";presence.dataset.online=data?.online===false?"false":"true";presence.setAttribute("aria-hidden","true");
    name.append(nameText,presence);
    const over=document.createElement("span");over.className="player-over";
    const role=document.createElement("span");role.className="player-role";role.textContent=safeText(data.roleName||"");if(!role.textContent)role.hidden=true;
    over.append(name,role);button.append(over,avatar);const statusBadge=button.querySelector(":scope > .gmww-sv-badges");if(statusBadge)over.prepend(statusBadge);button.setAttribute("aria-label",(actualSeat?("Vị trí "+actualSeat+" · "):"")+playerName+(data?.online===false?" · Offline":" · Online"));
    button._gmwwLive={data,actualSeat,playerName,isGM};
    // Player-led nomination: drag the viewer's own Character to another Character.
    // The server validates eligibility, nomination window and restrictions.
    if(embedded&&!isGM){
      button.addEventListener('pointerdown',e=>{
        if(!setupState.gallowsCanNominate||!button.classList.contains('self')||e.button>0)return;
        const startX=e.clientX,startY=e.clientY,pointerId=e.pointerId;
        const release=up=>{
          if(up.pointerId!==pointerId)return;
          document.removeEventListener('pointerup',release,true);
          document.removeEventListener('pointercancel',cancel,true);
          if(Math.hypot(up.clientX-startX,up.clientY-startY)<20)return;
          const target=document.elementFromPoint(up.clientX,up.clientY)?.closest?.('.player[data-player-id]');
          const targetId=String(target?.dataset.playerId||'');
          if(!targetId||target===button||targetId==='gm')return;
          try{window.parent.postMessage({type:'gmww:gallows-drag-nominate',participantId:targetId},window.location.origin)}catch{}
        };
        const cancel=()=>{document.removeEventListener('pointerup',release,true);document.removeEventListener('pointercancel',cancel,true)};
        document.addEventListener('pointerup',release,true);
        document.addEventListener('pointercancel',cancel,true);
      });
    }

    button.addEventListener("click",e=>{e.stopPropagation();
      const current=button._gmwwLive||{data,actualSeat,playerName,isGM},player=current.data;
      if(current.isGM){if(embedded)window.parent.postMessage({type:"gmww:gm-character-click"},window.location.origin);return}
      if(embedded){if(String(player.id)===String(setupState.viewerParticipantId||"")){const now=Date.now();if(now-Number(button._gmwwOwnTapAt||0)<380){button._gmwwOwnTapAt=0;window.parent.postMessage({type:"gmww:own-character-doubletap"},window.location.origin)}else button._gmwwOwnTapAt=now}else window.parent.postMessage({type:"gmww:player-click",participantId:player.id,seatId:current.actualSeat},window.location.origin);return}
      // Standalone scene is read-only; the active shell handles player actions.
    });
    return button
  }
  // Stable character nodes must reconcile visual status independently of avatar artwork.
  // Heartbeats must not restart the six approved orbit symbols or rebuild the rig.
  function statusVisualSignature(data){
    return JSON.stringify((Array.isArray(data?.statusTags)?data.statusTags:[]).map(x=>String(x?.statusId||"")).sort());
  }
  // Public Lên Giàn votes are transient UI labels, not gameplay status effects.
  // Reconcile on every frame so 👍/👎 changes never recreate the Character rig.
  function syncGallowsVoteBadge(button,data){
    const host=button.querySelector('.player-over');if(!host)return;
    const loginId=String(data?.loginId||data?.id||'').replace(/^member:/,''),
      stat=(setupState.gallowsNominationTotals||[]).find(row=>String(row.loginId)===loginId),
      count=Math.max(0,Math.trunc(Number(stat?.votes)||0));
    let pearl=host.querySelector(':scope>.gmww-nomination-pearl');
    if(count>0){
      if(!pearl){pearl=document.createElement('span');pearl.className='gmww-nomination-pearl';
        pearl.setAttribute('aria-label','Số phiếu đề cử')}
      pearl.textContent='✦ '+count;pearl.title=count+' phiếu đề cử';
      if(host.firstElementChild!==pearl)host.prepend(pearl);
    }else pearl?.remove();
    const vote=(Array.isArray(data?.statusTags)?data.statusTags:[]).find(x=>x?.statusId==='gallows_vote')?.icon;
    let badge=host.querySelector(':scope>.gmww-gallows-vote');
    if(vote!=='👍'&&vote!=='👎'){badge?.remove();return}
    if(!badge){badge=document.createElement('span');badge.className='gmww-gallows-vote';badge.setAttribute('aria-label','Phiếu cứu hoặc giết')}
    if(badge.textContent!==vote)badge.textContent=vote;
    if(host.firstElementChild!==badge)host.prepend(badge);
  }
  // Static sea-pearl count is public tally only; no faction/role details leak.
  function ensureNominationPearlStyle(){
    if(document.getElementById('gmwwNominationPearlCss'))return;
    const css=document.createElement('style');css.id='gmwwNominationPearlCss';
    css.textContent='#players .player .gmww-nomination-pearl{display:inline-flex;align-items:center;justify-content:center;min-width:36px;min-height:32px;padding:2px 9px;margin:0 auto 3px;border-radius:999px;border:2px solid #ffe3a5;color:#fffae3;font-weight:1000;font-size:16px;background:radial-gradient(circle at 20% 15%,#70e7e7,#116478 72%,#062f48);box-shadow:0 4px 16px #001a3188;text-shadow:0 1px 3px #002838;pointer-events:none}';
    document.head.appendChild(css);
  }
  ensureNominationPearlStyle();
  function stablePlayerNode(data,pos,seatId,index){
    const id=String(data?.id||""),gm=data?.isGM===true||data?.kind==="gm";
    const appearance=JSON.stringify([gm,data?.gameCharacterId||"",data?.avatarId||"",data?.avatarUrl||""]);
    let button=mountedPlayerNodes.get(id);
    if(!button||button.dataset.gmwwAppearance!==appearance){
      button=makePlayerButton(data,pos,seatId,index);
      syncGallowsVoteBadge(button,data);
      button.dataset.gmwwAppearance=appearance;
      button.dataset.gmwwStatusSig=statusVisualSignature(data);
      mountedPlayerNodes.set(id,button);villageRenderMetrics.created++;
      return button;
    }
    villageRenderMetrics.reused++;
    const nextStatusSig=statusVisualSignature(data);
    if(button.dataset.gmwwStatusSig!==nextStatusSig){
      button.dataset.gmwwStatusSig=nextStatusSig;
      // Remove only direct status overlays, never the existing character/rig.
      button.querySelectorAll(':scope > .gmww-sv-overlay, .player-over > .gmww-sv-badges').forEach(el=>el.remove());
      const ids=(Array.isArray(data?.statusTags)?data.statusTags:[]).map(x=>String(x?.statusId||""));
      const visuals=globalThis.GMWW_STATUS_VISUALS;
      const active=visuals?visuals.layers(ids).items:[];
      button.classList.toggle("gmww-sv-stage",active.length>0);
      button.classList.toggle("gmww-sv-dead",active.includes("dead"));
      if(active.length){button.insertAdjacentHTML("beforeend",visuals.overlay(ids));const badge=button.querySelector(":scope > .gmww-sv-badges");if(badge)button.querySelector(".player-over")?.prepend(badge);}
    }
    syncGallowsVoteBadge(button,data);
    const actualSeat=Number(data?.seatId||seatId||0)||null,playerName=safeText(data.displayName||data.name||names[index]||"Người chơi");
    button._gmwwLive={data,actualSeat,playerName,isGM:gm};
    button.classList.toggle("selected",selectedId===data.id);
    button.classList.toggle("is-frozen",data?.frozen===true&&!gm);
    button.classList.toggle("self",String(data.id)===String(setupState.viewerParticipantId||""));
    button.classList.toggle("moving",!!pos.moving);
    button.classList.toggle("sitting",!!pos.sitting);
    button.classList.toggle("seated",!!actualSeat);
    button.classList.toggle("roaming",!actualSeat);
    if(actualSeat){if(button.dataset.seatId!==String(actualSeat))button.dataset.seatId=String(actualSeat)}
    else if(button.dataset.seatId)delete button.dataset.seatId;
    if(data.moveId){if(button.dataset.moveId!==String(data.moveId))button.dataset.moveId=String(data.moveId)}
    else if(button.dataset.moveId)delete button.dataset.moveId;
    if(id)visualLastPaintedPositions.set(id,{x:pos.x,y:pos.y});
    const point=screenPoint(pos),left=point.x+"%",top=point.y+"%",depth=String(10+Math.round(pos.y));
    if(button.style.left!==left)button.style.left=left;
    if(button.style.top!==top)button.style.top=top;
    if(button.style.zIndex!==depth)button.style.zIndex=depth;
    const scale=String(normalizeCharacterScale(setupState.characterScale)/100);
    if(button.style.getPropertyValue("--gmww-character-scale")!==scale)button.style.setProperty("--gmww-character-scale",scale);
    const title=button.querySelector(".name-text"),presence=button.querySelector(".player-presence"),role=button.querySelector(".player-role");
    if(title&&title.textContent!==playerName)title.textContent=playerName;
    const online=data?.online===false?"false":"true";
    if(presence&&presence.dataset.online!==online)presence.dataset.online=online;
    const roleText=safeText(data.roleName||"");
    if(role){if(role.textContent!==roleText)role.textContent=roleText;role.hidden=!roleText}
    const aria=(actualSeat?"Vị trí "+actualSeat+" · ":"")+playerName+(data?.online===false?" · Offline":" · Online");
    if(button.getAttribute("aria-label")!==aria)button.setAttribute("aria-label",aria);
    if(gm){
      const action="gm-action-"+gmActionFor(data,pos);
      if(!button.classList.contains(action)){button.classList.remove("gm-action-idle","gm-action-walk","gm-action-run","gm-action-shake","gm-action-howl");button.classList.add(action)}
      const dx=Number(data?.moveToX??pos.x??0)-Number(data?.moveFromX??pos.x??0),dir=String(dx<0?-1:1);
      if(button.style.getPropertyValue("--gm-run-dir")!==dir)button.style.setProperty("--gm-run-dir",dir);
    }else{
      const avatar=button.querySelector(".portrait.game-character");
      const renderedId=avatar?.querySelector('[data-character-renderer]')?.dataset.characterId||data?.gameCharacterId;
      const command=animationCommandFor({...data,gameCharacterId:renderedId},pos);
      const commandKey=[command.characterId,command.state,command.motion,command.rigId,command.facing,command.activity,command.paused].join("|");
      if(avatar&&button.dataset.gmwwMotion!==commandKey){updateCharacterRenderer(avatar,command);button.dataset.gmwwMotion=commandKey}
    }
    return button;
  }
  function renderPortal(){document.getElementById('gmwwPortal')?.remove();document.getElementById('gmwwPortalNotice')?.remove()}
  function syncGallowsHangingVisual(){
    // Reposition the existing Character DOM only. Seat coordinates stay untouched.
    const hanging=setupState?.gallowsHanging,accused=battleStatic&&hanging?.active===true?
      String(hanging.candidateId||''):'';
    const live=all.some(p=>String(p?.id||'').replace(/^member:/,'')===accused&&!visuallyDeceased(p));
    const target=live?accused:'',sceneAnchor=globalThis.GMWW_VILLAGE_GALLOWS_ANCHORS?.[night?'night':'day'],configured=!!(sceneAnchor&&[sceneAnchor.x,sceneAnchor.y].every(Number.isFinite)),firePoint=target?(configured?{x:sceneAnchor.x,y:sceneAnchor.y}:screenPoint(layout.fire)):null;
    players.classList.toggle('has-gallows-hanging',!!target);
    for(const data of all){
      const node=mountedPlayerNodes.get(String(data?.id||''));if(!node)continue;
      const isAccused=!!(target&&firePoint&&String(data.id).replace(/^member:/,'')===target&&
        data.isGM!==true&&data.kind!=='gm');
      node.classList.toggle('gmww-gallows-hanging',isAccused);
      if(isAccused){
        node.style.left=Math.max(10,Math.min(90,firePoint.x))+'%';
        node.style.top=Math.max(5,Math.min(90,configured?firePoint.y:firePoint.y-15))+'%';
        node.style.zIndex='950';
        node.setAttribute('aria-label',safeText(data.displayName||data.name||target)+' · Đang treo Lên Giàn');
      }
      // Other nodes are already reset to their real positions by stablePlayerNode.
    }
  }
  function render(){
    syncPirateNominationFlag();
    cancelAnimationFrame(moveFrame);moveFrame=0;
    if(sitWakeTimer){clearTimeout(sitWakeTimer);sitWakeTimer=0}
    villageRenderMetrics.renders++;
    const seatCount=Math.max(1,Math.min(30,Number(count)||12)),ps=positions(seatCount,seatLayout,seatOffset,seatSpacing),seatMap=new Map(),unseated=[];
    for(const item of all){const sid=Number(item?.displaySeatId||item?.seatId||0);if(sid>=1&&sid<=seatCount&&!seatMap.has(sid))seatMap.set(sid,item);else if(!sid)unseated.push(item)}
    const desiredPlayers=[];
    // Empty leaves are optional; occupied seats must always render their characters.
    ps.forEach((p,i)=>{
      const seatId=i+1,data=seatMap.get(seatId)||null;
      if(!data){
        if(setupState.showSeats===false)return;
        const reserved=all.some(x=>Number(x?.moveTargetSeatId||0)===seatId&&x?.movementStatus==="moving");
        let empty=mountedEmptySeatNodes.get(seatId);
        if(!empty){empty=document.createElement("button");empty.type="button";empty.className="seat-empty";empty.dataset.seatId=String(seatId);empty.innerHTML='<span class="seat-dot"></span><b></b>';empty.disabled=true;mountedEmptySeatNodes.set(seatId,empty)}
        empty.classList.toggle("selected",Number(setupState.selectedSeatId||0)===seatId);
        empty.classList.toggle("reserved",reserved);
        const display=screenPoint(p),left=display.x+"%",top=display.y+"%",depth=String(9+Math.round(p.y));
        if(empty.style.left!==left)empty.style.left=left;
        if(empty.style.top!==top)empty.style.top=top;
        if(empty.style.zIndex!==depth)empty.style.zIndex=depth;
        const label=(reserved?"Đang tới ":"Vị trí ")+seatId,b=empty.querySelector("b");
        if(b&&b.textContent!==label)b.textContent=label;
        const aria="Vị trí "+seatId+(reserved?" đang được chọn":" đang trống");
        if(empty.getAttribute("aria-label")!==aria)empty.setAttribute("aria-label",aria);
        desiredPlayers.push(empty);return
      }
      const pos=movementPosition(data,p),button=stablePlayerNode(data,pos,seatId,i);desiredPlayers.push(button)
    });
    for(const data of unseated){const gmIdle=(data?.isGM===true||data?.kind==="gm")&&data?.movementStatus!=="moving";const pos=gmIdle?{x:layout.fire.x,y:layout.fire.y-7.5}:movementPosition(data,null),button=stablePlayerNode(data,pos,null,all.indexOf(data));desiredPlayers.push(button)}
    reconcileVillageChildren(players,desiredPlayers);
    document.getElementById('gmwwPirateNominate')?.gmwwSyncSelection?.();
    syncGallowsHangingVisual();
    const alive=new Set(all.map(p=>String(p.id)));
    for(const id of mountedPlayerNodes.keys())if(!alive.has(id)){mountedPlayerNodes.delete(id);deceasedDisplayPoints.delete(id)}
    villageRenderMetrics.mounted=mountedPlayerNodes.size;
    renderPortal();
    const clock=Date.now()+Number(setupState.clockOffsetMs||0);
    const expirations=all.filter(p=>p?.villageActivity==="sitting"&&Number(p.sitUntil||0)>clock).map(p=>Number(p.sitUntil));
    if(expirations.length)sitWakeTimer=setTimeout(()=>{sitWakeTimer=0;render()},Math.max(40,Math.min(2147483647,Math.min(...expirations)-clock+30)));
    if(!battleStatic&&villageMotionNeedsFrame(all)&&!document.hidden)moveFrame=requestAnimationFrame(animateMovementFrame)
  }
  window.addEventListener('gmww:village-gallows-anchor',()=>{if(battleStatic)render()});
  function animateMovementFrame(now){
    moveFrame=0;if(document.hidden||battleStatic)return;
    villageRenderMetrics.movementFrames++;
    let active=false;
    const nowMs=Date.now()+Number(setupState.clockOffsetMs||0),width=stageElement.clientWidth||864,height=stageElement.clientHeight||1536;
    for(const data of all){
      if(data?.movementStatus!=="moving")continue;
      const el=mountedPlayerNodes.get(String(data.id));if(!el||!el.isConnected)continue;if(visuallyDeceased(data))continue; // Display-only: deceased chibi does not visually walk.
      const pos=movementPosition(data,null,nowMs),display=screenPoint(pos,width,height);visualLastPaintedPositions.set(String(data.id),{x:pos.x,y:pos.y});el.style.left=display.x+"%";el.style.top=display.y+"%";el.style.zIndex=String(10+Math.round(pos.y));active=active||pos.moving;
      const avatar=el.querySelector(".portrait.game-character"),renderedId=avatar?.querySelector('[data-character-renderer]')?.dataset.characterId||data?.gameCharacterId,
      semantic=animationCommandFor({...data,gameCharacterId:renderedId},pos);
      const rigUpdated=!!avatar?.querySelector('[data-character-renderer]');
      const signature=[semantic.characterId,semantic.state,semantic.motion,semantic.rigId,semantic.facing,semantic.activity,semantic.paused].join("|");
      if(rigUpdated&&el.dataset.gmwwMotion!==signature){updateCharacterRenderer(avatar,semantic);el.dataset.gmwwMotion=signature}const img=rigUpdated?null:el.querySelector("img[data-walk-character]");if(img){const characterId=img.dataset.walkCharacter,frame=pos.moving?walkFrameFor(data,nowMs):1,direction=pos.moving?walkDirection(data):"right",src=pos.sitting&&seatedCharacterUrl(characterId)?seatedCharacterUrl(characterId):walkFrameUrl(characterId,frame,direction),key=(pos.sitting?"sit":direction)+":"+frame;if(img.dataset.walkFrame!==key){img.dataset.walkFrame=key;img.dataset.walkDir=direction;img.src=src}}
      el.dataset.walkDir=pos.moving?walkDirection(data):"right";el.classList.toggle("moving",!!pos.moving);el.classList.toggle("sitting",!!pos.sitting);if(data?.isGM===true||data?.kind==="gm"){el.classList.remove("gm-action-idle","gm-action-walk","gm-action-run","gm-action-shake","gm-action-howl");el.classList.add("gm-action-"+gmActionFor(data,pos,nowMs));const dx=Number(data?.moveToX??pos.x??0)-Number(data?.moveFromX??pos.x??0);el.style.setProperty("--gm-run-dir",String(dx<0?-1:1))}
      if(!pos.moving&&data?.movementStatus==="moving"&&!String(data.moveId||"").startsWith("visual:")&&embedded&&String(data.id)===String(setupState.viewerParticipantId||"")&&!arrivalNotified.has(String(data.moveId))){arrivalNotified.add(String(data.moveId));try{window.parent.postMessage({type:"gmww:move-arrived",participantId:String(data.id),moveId:String(data.moveId)},window.location.origin)}catch{}}
    }
    if(active)moveFrame=requestAnimationFrame(animateMovementFrame);else moveFrame=0
  }
  if(supplied?.length)count=Math.min(30,Math.max(supplied.length,...supplied.map(x=>Number(x?.seatId||0)||0)));
  if(!embedded)installVillageCamera(document.querySelector(".stage"),document.getElementById("scene"),null);
  // Phase artwork follows the real room state; no local Online setup toggles.
  function applyPhase(nextNight){night=!!nextNight;game.classList.toggle("night",night);game.classList.toggle("day",!night);}
  let lastExternalRenderSignature="";
  function applyExternalState(payload){
    const incoming=mapPublicPlayers({players:Array.isArray(payload?.players)?payload.players:[]}),room=payload?.room||{},cycle=payload?.cycle||{},phase=String(cycle.phase||"").toLowerCase(),nextSetup=payload?.setup&&typeof payload.setup==="object"?payload.setup:{enabled:false,walkEnabled:false,previewCharacterId:"",selectedSeatId:null,viewerParticipantId:"",clockOffsetMs:0,characterScale:100},nextCount=Math.max(1,Math.min(30,Number(room.seatCount||0)||Math.max(incoming.length,...incoming.map(x=>Number(x?.seatId||0)||0),1)));
    
    seatLayout=layout.normalizeSeatLayout(room.seatLayout);seatOffset=layout.normalizeSeatOffset(room.seatOffset);seatSpacing=layout.normalizeSeatSpacing(room.seatSpacing);
    // Same deterministic seat repair as GM, without modifying server Seat IDs.
    // Old running rooms with missing IDs no longer spawn players in a clump.
    const visualSeats=layout.projectedSeatIds(incoming.filter(p=>!p.isGM),nextCount);
    matchStartedAt=Date.parse(room.startedAt||"")||0;
    battleStatic=room.playerSceneMode==='battle'||['running','started','game','playing'].includes(String(room.phase||'').toLowerCase());
    for(const p of incoming){
      if(battleStatic){p.movementStatus='idle';p.villageActivity='idle';}
      if(p.isGM)continue;
      p.displaySeatId=liveDisplaySeatId(p,visualSeats);
      if(matchStartedAt&&p.movementStatus==="moving"&&Number(p.moveStartedAt)>0&&
        Number(p.moveStartedAt)<=matchStartedAt)p.movementStatus="idle";
    }
    const previousAll=all;all=incoming;const bridged=bridgeIncomingPositions(incoming,nextSetup,nextCount,previousAll);setupState=nextSetup;setupState.characterScale=normalizeCharacterScale(setupState.characterScale);all=bridged;count=nextCount;const offline=String(room.roomMode||"online").toLowerCase()==="offline";document.body.classList.toggle("room-offline",offline);document.body.classList.toggle("room-online",!offline);
    document.body.classList.toggle("player-prep",room.playerSceneMode==="lobby");
    document.body.classList.toggle("player-battle",battleStatic);
    if(selectedId&&!all.some(p=>p.id===selectedId))selectedId=null;
    if(phase==="night"||phase==="day"||phase==="morning")applyPhase(phase==="night",cycle);
    if(room.roomName)document.title="GMWW · "+safeText(room.roomName);
    const fire=document.querySelector('.fire'),point=screenPoint(layout.fire);if(fire){fire.style.left=point.x+'%';fire.style.top=point.y+'%';}
    const nextSig=JSON.stringify([nextCount,seatLayout,seatOffset,seatSpacing,room.roomMode,room.playerSceneMode,
      setupState,all.map(x=>[x.id,x.seatId,x.displaySeatId,x.positionX,x.positionY,x.movementStatus,x.moveId,
        x.moveFromX,x.moveFromY,x.moveToX,x.moveToY,x.moveStartedAt,x.moveDurationMs,
        x.online,x.gameCharacterId,x.avatarId,x.avatarUrl,x.displayName,x.ready,x.statusLabel,x.statusTags])]);
    if(nextSig!==lastExternalRenderSignature){lastExternalRenderSignature=nextSig;render()}
  }
  if(embedded){
    const stage=document.querySelector('.stage');stage.addEventListener('click',event=>{if(!setupState.walkEnabled)return;if(event.target.closest('.player,.seat-empty,.hud,.scene-controls,.fire,.gmww-portal,.gmww-portal-notice'))return;const r=stage.getBoundingClientRect(),raw=layout.fromScreen(event.clientX-r.left,event.clientY-r.top,r.width,r.height);if(!layout.inside(raw.x,raw.y))return;const point=layout.clampPoint(raw.x,raw.y);window.parent.postMessage({type:'gmww:ground-click',...point},window.location.origin)});
    document.querySelector('.fire')?.addEventListener('click',()=>window.parent.postMessage({type:'gmww:fire-click'},window.location.origin));
    window.addEventListener('resize',()=>{render();const f=document.querySelector('.fire'),p=screenPoint(layout.fire);if(f){f.style.left=p.x+'%';f.style.top=p.y+'%';}renderPortal()});


    window.addEventListener("message",event=>{
      if(event.origin!==window.location.origin||event.source!==window.parent)return;
      if(event.data?.type==="gmww:village-state")applyExternalState(event.data);
      else if(event.data?.type==="gmww:seat-position-request"){const seatId=Number(event.data.seatId||0),ps=positions(Math.max(1,Math.min(30,Number(count)||12)),seatLayout,seatOffset,seatSpacing),p=ps[seatId-1];if(p)try{window.parent.postMessage({type:"gmww:seat-position",seatId,x:p.x,y:p.y},window.location.origin)}catch{}}
    });
    startVillagePerformanceReporter();
    try{window.parent.postMessage({type:"gmww:village-ready"},window.location.origin)}catch{}
  }
  // Opt-in live public state only. Never infer a room or credentials from storage.
  const roomCode=embedded?"":validateRoomCode(window.GMWW_VILLAGE_ROOM_CODE||params.get("room"));
  if(roomCode){
    liveRoom=true;
    createPublicRoomPoller({
      roomCode,
      visibility:()=>!document.hidden,
      onState:state=>{
        all=mapPublicPlayers(state);const room=state.room||{};seatLayout=layout.normalizeSeatLayout(room.seatLayout);
        seatOffset=layout.normalizeSeatOffset(room.seatOffset);seatSpacing=layout.normalizeSeatSpacing(room.seatSpacing);
        count=Math.max(1,Math.min(30,Number(room.seatCount||0)||Math.max(all.length,...all.map(x=>Number(x?.seatId||0)||0),1)));
        matchStartedAt=Date.parse(room.startedAt||"")||0;
        const visualSeats=layout.projectedSeatIds(all.filter(p=>!p.isGM),count);
        for(const p of all)if(!p.isGM)p.displaySeatId=liveDisplaySeatId(p,visualSeats);
        if(selectedId&&!all.some(p=>p.id===selectedId))selectedId=null;
        render();if(room?.roomName)document.title="GMWW · "+safeText(room.roomName);
      },
      onError:()=>{document.body.dataset.villageConnection="error";}
    });
  }
  if(!liveRoom)render();
  else{players.replaceChildren();document.body.dataset.villageConnection="connecting";}
}
