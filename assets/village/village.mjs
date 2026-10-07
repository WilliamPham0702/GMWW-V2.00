import "./village-layout.js";
const layout=globalThis.GMWW_VILLAGE_LAYOUT;
import {installVillageCamera} from "./village-camera.mjs";
import {createPublicRoomPoller,mergeStableSeats,validateRoomCode} from "./village-room.mjs";
import {startVillagePerformanceReporter} from "./village-performance.mjs";
import {mountCharacterRenderer,updateCharacterRenderer,normalizeRendererCommand} from "./character-renderer.mjs";
// Isolated visual prototype: never writes to live rooms or player accounts.
// Exported helpers allow deterministic Node tests without a DOM.
export function positions(count){if(!Number.isInteger(count)||count<1||count>30)throw Error("COUNT_OUT_OF_RANGE");return layout.positions(count)}
export function safeText(v){return String(v??"").slice(0,80)}
export function mapCharacterAnimation(p){
  const a=p?.characterAnimation;
  if(!a||typeof a!=="object")return null;
  return{
    characterId:typeof a.characterId==="string"?safeText(a.characterId):"",
    rigId:typeof a.rigId==="string"?safeText(a.rigId):"",
    state:typeof a.state==="string"?safeText(a.state):"idle",
    motion:typeof a.motion==="string"?safeText(a.motion):"idle-breathe",
    facing:a.facing==="left"?"left":"right",
    loop:a.loop!==false,
    engineVersion:typeof a.engineVersion==="string"?safeText(a.engineVersion):"",
    activity:typeof a.activity==="string"?safeText(a.activity):"idle"
  };
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
    ready:!!p.ready,setupComplete:!!p.setupComplete,online:p.online!==false,statusLabel:safeText(p.statusLabel||""),roleName:safeText(p.roleName||"")
  }));
}
const game=typeof document==="undefined"?null:document.getElementById("game");
if(game){
  const players=document.getElementById("players"),roster=document.getElementById("roster"),selection=document.getElementById("selection");
  const names=["Minh","Lan","Huy","An","Mai","Khoa","Linh","Dũng","Phương","Quân","Trang","Đức","Ngọc","Hà","Nam","Thảo","Long","Vy","Tuấn","Nhi","Khánh","Tú","Sơn","Oanh","Hùng","Hoa","Bảo","Tâm","Vân","Đạt"];
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
  const sample=names.map((displayName,i)=>({id:"sample-"+(i+1),displayName,avatarUrl:""}));
  let all=embedded?[]:(supplied?.length?supplied:sample);
  let liveRoom=embedded;
  function trustedAvatarUrl(raw){
    if(typeof raw!=="string"||!raw.trim())return "";
    try{const u=new URL(raw,window.location.href);
      return u.origin===window.location.origin&&["http:","https:"].includes(u.protocol)?u.href:"";
    }catch{return "";}
  }
  const CHARACTER_SCALES=[75,100,125,150,175,200],normalizeCharacterScale=value=>{const n=Number(value);if(!Number.isFinite(n))return 100;return CHARACTER_SCALES.reduce((best,x)=>Math.abs(x-n)<Math.abs(best-n)?x:best,CHARACTER_SCALES[0])};
  let night=false,selectedId=null,count=12,setupState={enabled:false,walkEnabled:false,previewCharacterId:"",selectedSeatId:null,viewerParticipantId:"",clockOffsetMs:0,characterScale:100},moveFrame=0,arrivalNotified=new Set();
  const visualFallbackMoves=new Map();
  const GMWW_SEATED_CHARACTER01_URL="data:image/webp;base64,"+["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"].join("");
  const GMWW_SEATED_CHARACTER_URLS=Object.freeze({"character-01":GMWW_SEATED_CHARACTER01_URL,"character-02":"/characters/seated-v296/character-02/front.webp","character-03":"/characters/seated-v297/character-03/front.webp","character-04":"/characters/seated-v300/character-04/front.webp"});
  function seatedCharacterUrl(characterId){return GMWW_SEATED_CHARACTER_URLS[String(characterId||"")]||""}
  function sittingNow(data,now=Date.now()+Number(setupState.clockOffsetMs||0)){return Number(data?.seatId||0)>0||(data?.villageActivity==="sitting"&&Number(data?.sitUntil||0)>now)}

  function easeMove(t){t=Math.max(0,Math.min(1,Number(t)||0));return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2}
  function spawnPosition(id){return layout.spawn(id)}
  function movementPosition(data,seatPos=null,now=Date.now()+Number(setupState.clockOffsetMs||0)){
    const pos=data?.movementStatus==='moving'?layout.interpolate(data,now):seatPos||((data?.positionX!=null&&data?.positionY!=null)?layout.clampPoint(data.positionX,data.positionY):spawnPosition(data?.id)),progress=Math.max(0,Math.min(1,(now-Number(data?.moveStartedAt||0))/Math.max(1,Number(data?.moveDurationMs||1)))),sitting=sittingNow(data,now);
    return{...pos,progress,moving:data?.movementStatus==='moving'&&progress<1,sitting,sitRemainingMs:sitting?Math.max(0,Number(data.sitUntil)-now):0};
  }
  function visualPlayerPoint(data,seatCount=count,now=Date.now()+Number(setupState.clockOffsetMs||0)){
    if(data?.movementStatus==='moving'&&data?.moveStartedAt&&data?.moveDurationMs)return layout.interpolate(data,now);
    if(data?.positionX!=null&&data?.positionY!=null)return layout.clampPoint(data.positionX,data.positionY);
    const sid=Number(data?.seatId||0),seat=sid?positions(Math.max(1,Math.min(30,Number(seatCount)||12)))[sid-1]:null;
    return seat||spawnPosition(data?.id)
  }
  function bridgeIncomingPositions(incoming,nextSetup,nextCount,previousRows=all){
    const clock=Number(nextSetup?.clockOffsetMs||setupState.clockOffsetMs||0),now=Date.now()+clock,previous=new Map(previousRows.map(p=>[String(p?.id||''),p])),seen=new Set();
    const out=incoming.map(p=>{
      const id=String(p?.id||'');if(!id)return p;seen.add(id);
      if(p?.movementStatus==='moving'){visualFallbackMoves.delete(id);return p}
      const target=visualPlayerPoint(p,nextCount,now),existing=visualFallbackMoves.get(id);
      if(existing){
        const sameTarget=Math.hypot(Number(existing.moveToX)-target.x,(Number(existing.moveToY)-target.y)*2)<.65;
        if(sameTarget&&now<Number(existing.moveStartedAt)+Number(existing.moveDurationMs))return{...p,...existing,movementStatus:'moving'};
        visualFallbackMoves.delete(id)
      }
      const prev=previous.get(id);if(!prev)return p;
      const from=visualPlayerPoint(prev,count,now),distance=Math.hypot(target.x-from.x,(target.y-from.y)*2);
      if(!Number.isFinite(distance)||distance<.65)return p;
      const duration=Math.max(720,Math.min(1900,Math.round(distance*42))),move={moveFromX:from.x,moveFromY:from.y,moveToX:target.x,moveToY:target.y,moveStartedAt:now,moveDurationMs:duration,moveId:'visual:'+id+':'+now};
      visualFallbackMoves.set(id,move);return{...p,...move,movementStatus:'moving'}
    });
    for(const id of visualFallbackMoves.keys())if(!seen.has(id))visualFallbackMoves.delete(id);
    return out
  }
  function screenPoint(p){const stage=document.querySelector('.stage');return layout.toScreen(p,stage.clientWidth||864,stage.clientHeight||1536)}
  function walkDirection(data){const dx=Number(data?.moveToX)-Number(data?.moveFromX);return Number.isFinite(dx)&&dx<-.01?"left":"right"}
  function walkFrameUrl(characterId,frame=1,direction="right"){const f=Math.max(1,Math.min(6,Number(frame)||1)),dir=direction==="left"?"?dir=left":"";return "/api/game-characters/"+encodeURIComponent(characterId)+"/frame/"+f+dir}
  function walkFrameFor(data,now=Date.now()+Number(setupState.clockOffsetMs||0)){if(data?.movementStatus!=="moving"||!data?.moveStartedAt)return 1;return (Math.floor(Math.max(0,now-Number(data.moveStartedAt))/95)%6)+1}
  function animationCommandFor(data,position){
    const base=data?.characterAnimation&&typeof data.characterAnimation==="object"?data.characterAnimation:{};
    const moving=!!position?.moving,state=moving?(base.state==="running"?"running":"walking"):(data?.ready?"ready":"idle"),motion=moving?(state==="running"?"run":"walk"):(state==="ready"?"ready":"idle-breathe");
    return normalizeRendererCommand({...base,characterId:data?.gameCharacterId||base.characterId,state,motion,facing:moving?walkDirection(data):(base.facing||"right"),activity:data?.villageActivity||base.activity||"idle"},data?.gameCharacterId||"character-01")
  }
  function makePlayerButton(data,position,seatId=null,index=0){
    const isGM=data?.isGM===true||data?.kind==="gm",actualSeat=Number(data?.seatId||seatId||0)||null,playerName=safeText(data.displayName||data.name||names[index]||"Người chơi"),button=document.createElement("button");
    button.type="button";button.className="player"+(isGM?" gm":"")+(selectedId===data.id?" selected":"")+(String(data.id)===String(setupState.viewerParticipantId||"")?" self":"")+(position?.moving?" moving":"")+(position?.sitting?" sitting":"")+(actualSeat?" seated":" roaming");
    button.dataset.style=String(((actualSeat||index+1)-1)%5);button.dataset.playerId=safeText(data.id||("sample-"+(index+1)));if(actualSeat)button.dataset.seatId=String(actualSeat);if(data.moveId)button.dataset.moveId=String(data.moveId);
    const display=screenPoint(position);button.style.left=display.x+"%";button.style.top=display.y+"%";button.style.zIndex=String(10+Math.round(position.y));if(position?.moving)button.dataset.walkDir=walkDirection(data)
    const avatar=document.createElement("span");avatar.className="portrait";
    const rawCharacterId=typeof data.gameCharacterId==="string"&&/^character-(?:0[1-9]|[1-3][0-9]|4[0-2])$/.test(data.gameCharacterId)?data.gameCharacterId:"";
    const legacyIndex=rawCharacterId?Number(rawCharacterId.slice(-2)):0,seed=String(data.id||data.participantId||data.displayName||index),seedHash=[...seed].reduce((h,ch)=>((h*31)+ch.charCodeAt(0))>>>0,0);
    const characterId=rawCharacterId?"character-"+String(((legacyIndex-1)%20)+1).padStart(2,"0"):"character-"+String((seedHash%20)+1).padStart(2,"0");
    const avatarId=typeof data.avatarId==="string"&&/^[A-Za-z0-9._-]{1,100}$/.test(data.avatarId)?data.avatarId:"";
    const direction=position?.moving?walkDirection(data):"right",gmUrl=isGM?trustedAvatarUrl(data.avatarUrl||"/gm/gm-white-wolf.webp"):"",characterUrl=isGM?"":(position?.sitting&&seatedCharacterUrl(characterId)?seatedCharacterUrl(characterId):trustedAvatarUrl(walkFrameUrl(characterId,walkFrameFor(data),direction))),legacyUrl=trustedAvatarUrl(data.avatarUrl||(avatarId?"/api/avatars/"+encodeURIComponent(avatarId)+"/image":"")),safeDefault=trustedAvatarUrl(walkFrameUrl("character-01",1));
    const sources=(isGM?[gmUrl]:[characterUrl,legacyUrl,safeDefault]).filter((u,i,a)=>u&&a.indexOf(u)===i);
    if(sources.length){avatar.classList.add("has-image","game-character");if(isGM)avatar.classList.add("gm-character");const scale=normalizeCharacterScale(setupState.characterScale)/100,compact=window.innerWidth<=390,baseW=compact?50:62,baseH=compact?67:82;avatar.style.width=baseW+"px";avatar.style.height=baseH+"px";button.style.setProperty("--gmww-character-scale",String(scale));button.style.minWidth=Math.max(52,baseW+10)+"px";if(isGM){const shell=document.createElement("span"),shadow=document.createElement("span");shell.className="gm-wolf-sprite";shadow.className="gm-wolf-shadow";shell.append(shadow);for(const cls of ["gm-wolf-body","gm-wolf-head","gm-wolf-leg gm-wolf-leg-a","gm-wolf-leg gm-wolf-leg-b"]){const img=document.createElement("img");img.className=cls;img.src=sources[0];img.alt="";img.loading="eager";img.decoding="async";shell.append(img)}const dx=Number(data?.moveToX??position?.x??0)-Number(data?.moveFromX??position?.x??0);button.style.setProperty("--gm-run-dir",String(dx<0?-1:1));avatar.append(shell)}else{const command=animationCommandFor({...data,gameCharacterId:characterId},position),renderer=mountCharacterRenderer(avatar,{characterId,command,sources,sitting:!!position?.sitting});const img=renderer?.querySelector?.("img[data-walk-character]");if(img){img.dataset.walkFrame=String(walkFrameFor(data));img.dataset.walkDir=direction}}}
    const name=document.createElement("span");name.className="name";name.textContent=playerName;
    const status=document.createElement("span");status.className="player-status";status.textContent=isGM?(position?.moving?"GM ĐANG TUẦN TRA":"GM ONLINE"):(position?.moving?"ĐANG DI CHUYỂN":safeText(data.statusLabel||(data.online===false?"OFFLINE":data.ready?"READY":"ONLINE")));
    const over=document.createElement("span");over.className="player-over";over.append(name,status);
    const role=document.createElement("span");role.className="player-role";role.textContent=safeText(data.roleName||"");if(!role.textContent)role.hidden=true;
    button.append(over,avatar,role);button.setAttribute("aria-label",(actualSeat?("Vị trí "+actualSeat+" · "):"")+playerName+" · "+status.textContent);
    button.addEventListener("click",e=>{e.stopPropagation();if(isGM){if(embedded)window.parent.postMessage({type:"gmww:gm-character-click"},window.location.origin);return}if(embedded){if(String(data.id)!==String(setupState.viewerParticipantId||""))window.parent.postMessage({type:"gmww:player-click",participantId:data.id,seatId:actualSeat},window.location.origin);return}selectedId=data.id;document.getElementById("selectedLabel").textContent="Đã chọn: "+(actualSeat?("Vị trí "+actualSeat+" · "):"")+playerName;selection.hidden=false;render()});
    return button
  }
  function renderPortal(){document.getElementById('gmwwPortal')?.remove();document.getElementById('gmwwPortalNotice')?.remove()}
  function render(){
    cancelAnimationFrame(moveFrame);moveFrame=0;
    const seatCount=Math.max(1,Math.min(30,Number(count)||12)),ps=positions(seatCount),seatMap=new Map(),unseated=[];
    for(const item of all){const sid=Number(item?.seatId||0);if(sid>=1&&sid<=seatCount&&!seatMap.has(sid))seatMap.set(sid,item);else if(!sid)unseated.push(item)}
    players.replaceChildren();roster.replaceChildren();
    (setupState.showSeats===false?[]:ps).forEach((p,i)=>{
      const seatId=i+1,data=seatMap.get(seatId)||(!liveRoom&&!embedded?(all[i]||sample[i]):null);
      if(!data){
        const reserved=all.some(x=>Number(x?.moveTargetSeatId||0)===seatId&&x?.movementStatus==="moving"),empty=document.createElement("button");empty.type="button";empty.className="seat-empty"+(Number(setupState.selectedSeatId||0)===seatId?" selected":"")+(reserved?" reserved":"");empty.dataset.seatId=String(seatId);const display=screenPoint(p);empty.style.left=display.x+"%";empty.style.top=display.y+"%";empty.style.zIndex=String(9+Math.round(p.y));empty.innerHTML='<span class="seat-dot"></span><b>'+(reserved?'Đang tới ':'Vị trí ')+seatId+'</b>';
        empty.setAttribute("aria-label","Vị trí "+seatId+(reserved?" đang được chọn":" đang trống"));
        empty.disabled=true;players.append(empty);return
      }
      const pos=movementPosition(data,p),button=makePlayerButton(data,pos,seatId,i);players.append(button);const item=document.createElement("span");item.textContent=seatId+" · "+safeText(data.displayName)+(liveRoom?(data.online?" ●":" ○"):"");roster.append(item)
    });
    for(const data of unseated){const pos=movementPosition(data,null),button=makePlayerButton(data,pos,null,all.indexOf(data));players.append(button);if(data?.isGM===true||data?.kind==="gm")continue;const item=document.createElement("span");item.textContent="Làng · "+safeText(data.displayName)+(data.online?" ●":" ○");roster.append(item)}
    document.getElementById("count").textContent=all.filter(x=>Number(x?.seatId||0)>0).length+"/"+seatCount;
    renderPortal();
    if(all.some(x=>x?.movementStatus==="moving"||x?.villageActivity==="sitting"))moveFrame=requestAnimationFrame(animateMovementFrame)
  }
  function animateMovementFrame(now){
    let active=false;
    for(const data of all){
      const nowMs=Date.now()+Number(setupState.clockOffsetMs||0),sitTagged=data?.villageActivity==="sitting";
      if(data?.movementStatus!=="moving"&&!sitTagged)continue;
      const el=players.querySelector('[data-player-id="'+CSS.escape(String(data.id))+'"]');if(!el)continue;
      const pos=movementPosition(data,null,nowMs),display=screenPoint(pos);el.style.left=display.x+"%";el.style.top=display.y+"%";el.style.zIndex=String(10+Math.round(pos.y));active=active||pos.moving||pos.sitting;
      const avatar=el.querySelector(".portrait.game-character"),semantic=animationCommandFor(data,pos),rigUpdated=avatar?updateCharacterRenderer(avatar,semantic):false;const img=rigUpdated?null:el.querySelector("img[data-walk-character]");if(img){const characterId=img.dataset.walkCharacter,frame=pos.moving?walkFrameFor(data,nowMs):1,direction=pos.moving?walkDirection(data):"right",src=pos.sitting&&seatedCharacterUrl(characterId)?seatedCharacterUrl(characterId):walkFrameUrl(characterId,frame,direction),key=(pos.sitting?"sit":direction)+":"+frame;if(img.dataset.walkFrame!==key){img.dataset.walkFrame=key;img.dataset.walkDir=direction;img.src=src}}
      const status=el.querySelector(".player-status");if(status){const gm=data?.isGM===true||data?.kind==="gm";status.textContent=gm?(pos.moving?"GM ĐANG TUẦN TRA":"GM ONLINE"):(pos.moving?"ĐANG DI CHUYỂN":safeText(data.statusLabel||(data.online===false?"OFFLINE":data.ready?"READY":"ONLINE")))}
      el.dataset.walkDir=pos.moving?walkDirection(data):"right";el.classList.toggle("moving",!!pos.moving);el.classList.toggle("sitting",!!pos.sitting);
      if(!pos.moving&&data?.movementStatus==="moving"&&!String(data.moveId||"").startsWith("visual:")&&embedded&&String(data.id)===String(setupState.viewerParticipantId||"")&&!arrivalNotified.has(String(data.moveId))){arrivalNotified.add(String(data.moveId));try{window.parent.postMessage({type:"gmww:move-arrived",participantId:String(data.id),moveId:String(data.moveId)},window.location.origin)}catch{}}
    }
    if(active)moveFrame=requestAnimationFrame(animateMovementFrame);else moveFrame=0
  }
  if(supplied?.length){count=Math.min(30,Math.max(supplied.length,...supplied.map(x=>Number(x?.seatId||0)||0)));document.getElementById("size").hidden=true;document.querySelector("label[for=size]").hidden=true;}
  document.getElementById("size").addEventListener("change",e=>{count=Number(e.target.value);selectedId=null;selection.hidden=true;render();});
  if(!embedded)installVillageCamera(document.querySelector(".stage"),document.getElementById("scene"),document.getElementById("zoom"));
  function applyPhase(nextNight,cycle={}){
    night=!!nextNight;game.classList.toggle("night",night);game.classList.toggle("day",!night);
    const n=Number(cycle?.night||0),d=Number(cycle?.day||0),seq=night?n:d;
    document.getElementById("phaseIcon").textContent=night?"🌙":"☀️";
    document.getElementById("phaseLabel").textContent=(night?"Đêm ":"Ngày ")+(seq?String(seq).padStart(2,"0"):"");
    document.getElementById("phaseDetail").textContent=night?"Ban đêm":"Thảo luận ban ngày";
    document.getElementById("mode").textContent=night?"☀️ Ngày":"🌙 Đêm";
    document.getElementById("chatTitle").textContent=night?"Chat nhóm riêng":"Chat chung";
    document.getElementById("voiceState").textContent=night?"● Không có voice ban đêm":"● Voice ban ngày";
    document.getElementById("voice").hidden=night;
  }
  document.getElementById("mode").addEventListener("click",()=>applyPhase(!night,{}));
  document.querySelectorAll("[data-tab]").forEach(btn=>btn.addEventListener("click",()=>{
    document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active",b===btn));
    document.querySelectorAll(".tab").forEach(t=>{t.hidden=t.id!==btn.dataset.tab;t.classList.toggle("active",t.id===btn.dataset.tab)});
  }));
  document.getElementById("clearSelection").addEventListener("click",()=>{selectedId=null;selection.hidden=true;render()});
  document.getElementById("chatForm").addEventListener("submit",e=>{
    e.preventDefault();const input=document.getElementById("chatText"),text=input.value.trim();if(!text)return;
    const p=document.createElement("p"),b=document.createElement("b");b.textContent="Bạn: ";p.append(b,document.createTextNode(text));document.getElementById("messages").append(p);input.value="";p.scrollIntoView({block:"nearest"});
  });
  let muted=true,speaker=true;document.getElementById("mic").addEventListener("click",e=>{muted=!muted;e.target.textContent=muted?"🎙️ Micro: Tắt":"🎙️ Micro: Bật (mô phỏng)"});
  document.getElementById("speaker").addEventListener("click",e=>{speaker=!speaker;e.target.textContent=speaker?"🔊 Loa: Bật":"🔇 Loa: Tắt"});
  function applyExternalState(payload){
    const incoming=mapPublicPlayers({players:Array.isArray(payload?.players)?payload.players:[]}),room=payload?.room||{},cycle=payload?.cycle||{},phase=String(cycle.phase||"").toLowerCase(),nextSetup=payload?.setup&&typeof payload.setup==="object"?payload.setup:{enabled:false,walkEnabled:false,previewCharacterId:"",selectedSeatId:null,viewerParticipantId:"",clockOffsetMs:0,characterScale:100},nextCount=Math.max(1,Math.min(30,Number(room.seatCount||0)||Math.max(incoming.length,...incoming.map(x=>Number(x?.seatId||0)||0),1)));
    
    const previousAll=all;all=incoming;const bridged=bridgeIncomingPositions(incoming,nextSetup,nextCount,previousAll);setupState=nextSetup;setupState.characterScale=normalizeCharacterScale(setupState.characterScale);all=bridged;count=nextCount;const offline=String(room.roomMode||"online").toLowerCase()==="offline",onlineSupport=document.getElementById("onlineSupport");if(onlineSupport){onlineSupport.hidden=offline;onlineSupport.setAttribute("aria-hidden",offline?"true":"false")}document.body.classList.toggle("room-offline",offline);document.body.classList.toggle("room-online",!offline);
    if(selectedId&&!all.some(p=>p.id===selectedId)){selectedId=null;selection.hidden=true;}
    if(phase==="night"||phase==="day"||phase==="morning")applyPhase(phase==="night",cycle);
    if(room.roomName)document.title="GMWW · "+safeText(room.roomName);
    const fire=document.querySelector('.fire'),point=screenPoint(layout.fire);if(fire){fire.style.left=point.x+'%';fire.style.top=point.y+'%';}
    render();
  }
  if(embedded){
    document.getElementById("size").hidden=true;document.querySelector("label[for=size]").hidden=true;
    document.getElementById("mode").hidden=true;
    const stage=document.querySelector('.stage');stage.addEventListener('click',event=>{if(!setupState.walkEnabled)return;if(event.target.closest('.player,.seat-empty,.hud,.scene-controls,.fire,.gmww-portal,.gmww-portal-notice'))return;const r=stage.getBoundingClientRect(),raw=layout.fromScreen(event.clientX-r.left,event.clientY-r.top,r.width,r.height);if(!layout.inside(raw.x,raw.y))return;const point=layout.clampPoint(raw.x,raw.y);window.parent.postMessage({type:'gmww:ground-click',...point},window.location.origin)});
    document.querySelector('.fire')?.addEventListener('click',()=>window.parent.postMessage({type:'gmww:fire-click'},window.location.origin));
    window.addEventListener('resize',()=>{render();const f=document.querySelector('.fire'),p=screenPoint(layout.fire);if(f){f.style.left=p.x+'%';f.style.top=p.y+'%';}renderPortal()});


    window.addEventListener("message",event=>{
      if(event.origin!==window.location.origin||event.source!==window.parent)return;
      if(event.data?.type==="gmww:village-state")applyExternalState(event.data);
      else if(event.data?.type==="gmww:seat-position-request"){const seatId=Number(event.data.seatId||0),ps=positions(Math.max(1,Math.min(30,Number(count)||12))),p=ps[seatId-1];if(p)try{window.parent.postMessage({type:"gmww:seat-position",seatId,x:p.x,y:p.y},window.location.origin)}catch{}}
    });
    startVillagePerformanceReporter();
    try{window.parent.postMessage({type:"gmww:village-ready"},window.location.origin)}catch{}
  }
  // Opt-in live public state only. Never infer a room or credentials from storage.
  const roomCode=embedded?"":validateRoomCode(window.GMWW_VILLAGE_ROOM_CODE||params.get("room"));
  if(roomCode){
    liveRoom=true;
    document.getElementById("size").hidden=true;
    document.querySelector("label[for=size]").hidden=true;
    createPublicRoomPoller({
      roomCode,
      visibility:()=>!document.hidden,
      onState:state=>{
        all=mapPublicPlayers(state);const room=state.room||{};count=Math.max(1,Math.min(30,Number(room.seatCount||0)||Math.max(all.length,...all.map(x=>Number(x?.seatId||0)||0),1)));
        if(selectedId&&!all.some(p=>p.id===selectedId)){selectedId=null;selection.hidden=true;}
        render();if(room?.roomName)document.title="GMWW · "+safeText(room.roomName);
      },
      onError:()=>{document.getElementById("count").textContent="Mất kết nối";}
    });
  }
  if(!liveRoom)render();
  else{players.replaceChildren();roster.replaceChildren();document.getElementById("count").textContent="Đang kết nối";}
}
