import "./village-layout.js";
const layout=globalThis.GMWW_VILLAGE_LAYOUT;
import {installVillageCamera} from "./village-camera.mjs";
import {createPublicRoomPoller,mergeStableSeats,validateRoomCode} from "./village-room.mjs";
import {startVillagePerformanceReporter} from "./village-performance.mjs";
// Isolated visual prototype: never writes to live rooms or player accounts.
// Exported helpers allow deterministic Node tests without a DOM.
export function positions(count){if(!Number.isInteger(count)||count<1||count>30)throw Error("COUNT_OUT_OF_RANGE");return layout.positions(count)}
export function safeText(v){return String(v??"").slice(0,80)}
export function mapPublicPlayers(state){
  const players=Array.isArray(state?.players)?state.players:[];
  const ids=new Set();
  return players.slice(0,30).filter(p=>{
    const id=String(p?.participantId||p?.id||"");
    if(!id||ids.has(id))return false;ids.add(id);return true;
  }).map(p=>({
    id:String(p.participantId||p.id),displayName:safeText(p.displayName||"Người chơi"),
    avatarId:typeof p.avatarId==="string"?p.avatarId:"",
    gameCharacterId:typeof p.gameCharacterId==="string"?p.gameCharacterId:"",
    seatId:Number(p.seatId||0)||null,
    positionX:p.positionX==null?null:Number(p.positionX),positionY:p.positionY==null?null:Number(p.positionY),
    movementStatus:p.movementStatus==="moving"?"moving":"idle",moveId:String(p.moveId||""),
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
  function easeMove(t){t=Math.max(0,Math.min(1,Number(t)||0));return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2}
  function spawnPosition(id){return layout.spawn(id)}
  function movementPosition(data,seatPos=null,now=Date.now()+Number(setupState.clockOffsetMs||0)){
    const pos=data?.movementStatus==='moving'?layout.interpolate(data,now):seatPos||((data?.positionX!=null&&data?.positionY!=null)?layout.clampPoint(data.positionX,data.positionY):spawnPosition(data?.id)),progress=Math.max(0,Math.min(1,(now-Number(data?.moveStartedAt||0))/Math.max(1,Number(data?.moveDurationMs||1))));
    return{...pos,progress,moving:data?.movementStatus==='moving'&&progress<1};
  }
  function screenPoint(p){const stage=document.querySelector('.stage');return layout.toScreen(p,stage.clientWidth||864,stage.clientHeight||1536)}
  function walkDirection(data){const dx=Number(data?.moveToX)-Number(data?.moveFromX);return Number.isFinite(dx)&&dx<-.01?"left":"right"}
  function walkFrameUrl(characterId,frame=1,direction="right"){const f=Math.max(1,Math.min(6,Number(frame)||1)),dir=direction==="left"?"?dir=left":"";return "/api/game-characters/"+encodeURIComponent(characterId)+"/frame/"+f+dir}
  function walkFrameFor(data,now=Date.now()+Number(setupState.clockOffsetMs||0)){if(data?.movementStatus!=="moving"||!data?.moveStartedAt)return 1;return (Math.floor(Math.max(0,now-Number(data.moveStartedAt))/95)%6)+1}
  function makePlayerButton(data,position,seatId=null,index=0){
    const actualSeat=Number(data?.seatId||seatId||0)||null,playerName=safeText(data.displayName||data.name||names[index]||"Người chơi"),button=document.createElement("button");
    button.type="button";button.className="player"+(selectedId===data.id?" selected":"")+(String(data.id)===String(setupState.viewerParticipantId||"")?" self":"")+(position?.moving?" moving":"")+(actualSeat?" seated":" roaming");
    button.dataset.style=String(((actualSeat||index+1)-1)%5);button.dataset.playerId=safeText(data.id||("sample-"+(index+1)));if(actualSeat)button.dataset.seatId=String(actualSeat);if(data.moveId)button.dataset.moveId=String(data.moveId);
    const display=screenPoint(position);button.style.left=display.x+"%";button.style.top=display.y+"%";button.style.zIndex=String(10+Math.round(position.y));if(position?.moving)button.dataset.walkDir=walkDirection(data)
    const avatar=document.createElement("span");avatar.className="portrait";
    const rawCharacterId=typeof data.gameCharacterId==="string"&&/^character-(?:0[1-9]|[1-3][0-9]|4[0-2])$/.test(data.gameCharacterId)?data.gameCharacterId:"";
    const legacyIndex=rawCharacterId?Number(rawCharacterId.slice(-2)):0,seed=String(data.id||data.participantId||data.displayName||index),seedHash=[...seed].reduce((h,ch)=>((h*31)+ch.charCodeAt(0))>>>0,0);
    const characterId=rawCharacterId?"character-"+String(((legacyIndex-1)%20)+1).padStart(2,"0"):"character-"+String((seedHash%20)+1).padStart(2,"0");
    const avatarId=typeof data.avatarId==="string"&&/^[A-Za-z0-9._-]{1,100}$/.test(data.avatarId)?data.avatarId:"";
    const direction=position?.moving?walkDirection(data):"right",characterUrl=trustedAvatarUrl(walkFrameUrl(characterId,walkFrameFor(data),direction)),legacyUrl=trustedAvatarUrl(data.avatarUrl||(avatarId?"/api/avatars/"+encodeURIComponent(avatarId)+"/image":"")),safeDefault=trustedAvatarUrl(walkFrameUrl("character-01",1));
    const sources=[characterUrl,legacyUrl,safeDefault].filter((u,i,a)=>u&&a.indexOf(u)===i);
    if(sources.length){avatar.classList.add("has-image","game-character");const scale=normalizeCharacterScale(setupState.characterScale)/100,compact=window.innerWidth<=390,baseW=compact?50:62,baseH=compact?67:82;avatar.style.width=baseW+"px";avatar.style.height=baseH+"px";button.style.setProperty("--gmww-character-scale",String(scale));button.style.minWidth=Math.max(52,baseW+10)+"px";const img=document.createElement("img");let sourceIndex=0;img.src=sources[sourceIndex];img.alt="";img.loading="eager";img.decoding="async";img.dataset.walkCharacter=characterId;img.dataset.walkDir=direction;img.dataset.walkFrame=String(walkFrameFor(data));img.addEventListener("error",()=>{sourceIndex++;if(sourceIndex<sources.length){img.src=sources[sourceIndex];return}img.remove();avatar.classList.remove("has-image","game-character")});avatar.append(img)}
    const name=document.createElement("span");name.className="name";name.textContent=playerName;
    const status=document.createElement("span");status.className="player-status";status.textContent=position?.moving?"ĐANG DI CHUYỂN":safeText(data.statusLabel||(data.online===false?"OFFLINE":data.ready?"READY":"ONLINE"));
    const over=document.createElement("span");over.className="player-over";over.append(name,status);
    const role=document.createElement("span");role.className="player-role";role.textContent=safeText(data.roleName||"");if(!role.textContent)role.hidden=true;
    button.append(over,avatar,role);button.setAttribute("aria-label",(actualSeat?("Vị trí "+actualSeat+" · "):"")+playerName+" · "+status.textContent);
    button.addEventListener("click",e=>{e.stopPropagation();if(embedded){if(String(data.id)!==String(setupState.viewerParticipantId||""))window.parent.postMessage({type:"gmww:player-click",participantId:data.id,seatId:actualSeat},window.location.origin);return}selectedId=data.id;document.getElementById("selectedLabel").textContent="Đã chọn: "+(actualSeat?("Vị trí "+actualSeat+" · "):"")+playerName;selection.hidden=false;render()});
    return button
  }
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
        if(embedded&&setupState.enabled&&!reserved)empty.addEventListener("click",e=>{e.stopPropagation();try{window.parent.postMessage({type:"gmww:seat-click",seatId,x:p.x,y:p.y},window.location.origin)}catch{}});
        else empty.disabled=true;players.append(empty);return
      }
      const pos=movementPosition(data,p),button=makePlayerButton(data,pos,seatId,i);players.append(button);const item=document.createElement("span");item.textContent=seatId+" · "+safeText(data.displayName)+(liveRoom?(data.online?" ●":" ○"):"");roster.append(item)
    });
    for(const data of unseated){const pos=movementPosition(data,null),button=makePlayerButton(data,pos,null,all.indexOf(data));players.append(button);const item=document.createElement("span");item.textContent="Làng · "+safeText(data.displayName)+(data.online?" ●":" ○");roster.append(item)}
    document.getElementById("count").textContent=all.filter(x=>Number(x?.seatId||0)>0).length+"/"+seatCount;
    if(all.some(x=>x?.movementStatus==="moving"))moveFrame=requestAnimationFrame(animateMovementFrame)
  }
  function animateMovementFrame(now){
    let active=false;
    for(const data of all){
      if(data?.movementStatus!=="moving"||!data.moveId)continue;const el=players.querySelector('[data-player-id="'+CSS.escape(String(data.id))+'"]');if(!el)continue;
      const nowMs=Date.now()+Number(setupState.clockOffsetMs||0),pos=movementPosition(data,null,nowMs),display=screenPoint(pos);el.style.left=display.x+"%";el.style.top=display.y+"%";el.style.zIndex=String(10+Math.round(pos.y));active=active||pos.moving;const img=el.querySelector("img[data-walk-character]");if(img){const frame=pos.moving?walkFrameFor(data,nowMs):1,direction=pos.moving?walkDirection(data):"right",key=direction+":"+frame;if(img.dataset.walkFrame!==key){img.dataset.walkFrame=key;img.dataset.walkDir=direction;img.src=walkFrameUrl(img.dataset.walkCharacter,frame,direction)}}el.dataset.walkDir=pos.moving?walkDirection(data):"right";el.classList.toggle("moving",!!pos.moving);
      if(!pos.moving&&embedded&&String(data.id)===String(setupState.viewerParticipantId||"")&&!arrivalNotified.has(String(data.moveId))){arrivalNotified.add(String(data.moveId));try{window.parent.postMessage({type:"gmww:move-arrived",participantId:String(data.id),moveId:String(data.moveId)},window.location.origin)}catch{}}
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
    const incoming=mapPublicPlayers({players:Array.isArray(payload?.players)?payload.players:[]}),room=payload?.room||{},cycle=payload?.cycle||{},phase=String(cycle.phase||"").toLowerCase();
    all=incoming;count=Math.max(1,Math.min(30,Number(room.seatCount||0)||Math.max(incoming.length,...incoming.map(x=>Number(x?.seatId||0)||0),1)));setupState=payload?.setup&&typeof payload.setup==="object"?payload.setup:{enabled:false,walkEnabled:false,previewCharacterId:"",selectedSeatId:null,viewerParticipantId:"",clockOffsetMs:0,characterScale:100};setupState.characterScale=normalizeCharacterScale(setupState.characterScale);
    if(selectedId&&!all.some(p=>p.id===selectedId)){selectedId=null;selection.hidden=true;}
    if(phase==="night"||phase==="day"||phase==="morning")applyPhase(phase==="night",cycle);
    if(room.roomName)document.title="GMWW · "+safeText(room.roomName);
    const fire=document.querySelector('.fire'),point=screenPoint(layout.fire);if(fire){fire.style.left=point.x+'%';fire.style.top=point.y+'%';}
    render();
  }
  if(embedded){
    document.getElementById("size").hidden=true;document.querySelector("label[for=size]").hidden=true;
    document.getElementById("mode").hidden=true;
    const stage=document.querySelector('.stage');stage.addEventListener('click',event=>{if(!setupState.walkEnabled)return;if(event.target.closest('.player,.seat-empty,.hud,.scene-controls,.fire'))return;const r=stage.getBoundingClientRect(),raw=layout.fromScreen(event.clientX-r.left,event.clientY-r.top,r.width,r.height);if(!layout.inside(raw.x,raw.y))return;const point=layout.clampPoint(raw.x,raw.y);window.parent.postMessage({type:'gmww:ground-click',...point},window.location.origin)});
    document.querySelector('.fire')?.addEventListener('click',()=>window.parent.postMessage({type:'gmww:fire-click'},window.location.origin));
    window.addEventListener('resize',()=>{render();const f=document.querySelector('.fire'),p=screenPoint(layout.fire);if(f){f.style.left=p.x+'%';f.style.top=p.y+'%';}});


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
