import {installVillageCamera} from "./village-camera.mjs";
import {createPublicRoomPoller,mergeStableSeats,validateRoomCode} from "./village-room.mjs";
import {startVillagePerformanceReporter} from "./village-performance.mjs";
// Isolated visual prototype: never writes to live rooms or player accounts.
// Exported helpers allow deterministic Node tests without a DOM.
export function normalizeVillagePoint(x,y,fallbackX=50,fallbackY=76){
  const rawY=Number(y),fy=Number(fallbackY),py=Math.max(34,Math.min(86,Number.isFinite(rawY)?rawY:(Number.isFinite(fy)?fy:76)));
  const half=py<44?30+(py-34)*1.2:py>76?42-(py-76)*.8:42,rawX=Number(x),fx=Number(fallbackX),px=Math.max(50-half,Math.min(50+half,Number.isFinite(rawX)?rawX:(Number.isFinite(fx)?fx:50)));
  return{x:Math.round(px*100)/100,y:Math.round(py*100)/100};
}
export function positions(count){
  if(!Number.isInteger(count)||count<1||count>30)throw Error("COUNT_OUT_OF_RANGE");
  const ringSizes=count<=12?[count]:[Math.ceil(count/2),Math.floor(count/2)],defs=count<=12?[[Math.min(34,18+count*1.35),16,52]]:[[36,18,52],[26,12,52]],out=[];
  ringSizes.forEach((n,r)=>{const [rx,ry,cy]=defs[r]||defs[defs.length-1];for(let i=0;i<n;i++){const angle=2*Math.PI*(i/n)+(r===1?Math.PI/n:0)-Math.PI/2;const p=normalizeVillagePoint(50+rx*Math.cos(angle),cy+ry*Math.sin(angle));out.push({...p,ring:r});}});
  return out;
}
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
    ready:!!p.ready,setupComplete:!!p.setupComplete,online:p.online!==false
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
  let night=false,selectedId=null,count=12,setupState={enabled:false,walkEnabled:false,previewCharacterId:"",selectedSeatId:null,viewerParticipantId:""},moveFrame=0,arrivalNotified=new Set();
  function easeMove(t){t=Math.max(0,Math.min(1,Number(t)||0));return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2}
  function spawnPosition(id){let h=0;for(const ch of String(id||""))h=(h*31+ch.charCodeAt(0))>>>0;return normalizeVillagePoint(18+(h%6400)/100,69+((h>>>8)%1700)/100)}
  function movementPosition(data,seatPos=null,now=Date.now()){
    const validCoord=v=>v!==null&&v!==undefined&&v!==""&&Number.isFinite(Number(v));
    if(data?.movementStatus==="moving"&&data?.moveStartedAt&&data?.moveDurationMs&&[data?.moveFromX,data?.moveFromY,data?.moveToX,data?.moveToY].every(validCoord)){
      const t=Math.max(0,Math.min(1,(now-Number(data.moveStartedAt))/Math.max(1,Number(data.moveDurationMs)))),e=easeMove(t),p=normalizeVillagePoint(Number(data.moveFromX)+(Number(data.moveToX)-Number(data.moveFromX))*e,Number(data.moveFromY)+(Number(data.moveToY)-Number(data.moveFromY))*e);
      return{...p,progress:t,moving:t<1}
    }
    if(seatPos){const p=normalizeVillagePoint(seatPos.x,seatPos.y);return{...p,progress:1,moving:false}}
    const fallback=spawnPosition(data?.id),p=normalizeVillagePoint(validCoord(data?.positionX)?Number(data.positionX):fallback.x,validCoord(data?.positionY)?Number(data.positionY):fallback.y,fallback.x,fallback.y);return{...p,progress:1,moving:false}
  }
  function makePlayerButton(data,position,seatId=null,index=0){
    const actualSeat=Number(data?.seatId||seatId||0)||null,playerName=safeText(data.displayName||data.name||names[index]||"Người chơi"),button=document.createElement("button");
    button.type="button";button.className="player"+(selectedId===data.id?" selected":"")+(String(data.id)===String(setupState.viewerParticipantId||"")?" self":"")+(data.movementStatus==="moving"?" moving":"")+(actualSeat?" seated":" roaming");
    button.dataset.style=String(((actualSeat||index+1)-1)%5);button.dataset.playerId=safeText(data.id||("sample-"+(index+1)));if(actualSeat)button.dataset.seatId=String(actualSeat);if(data.moveId)button.dataset.moveId=String(data.moveId);
    button.style.left=position.x+"%";button.style.top=position.y+"%";button.style.zIndex=String(10+Math.round(position.y));
    const avatar=document.createElement("span");avatar.className="portrait";
    const characterId=typeof data.gameCharacterId==="string"&&/^character-(?:0[1-9]|[1-3][0-9]|4[0-2])$/.test(data.gameCharacterId)?data.gameCharacterId:"";
    const avatarId=typeof data.avatarId==="string"&&/^[A-Za-z0-9._-]{1,100}$/.test(data.avatarId)?data.avatarId:"";
    const characterUrl=characterId?("/api/game-characters/"+encodeURIComponent(characterId)+"/image"):"";
    const avatarUrl=trustedAvatarUrl(data.avatarUrl||characterUrl||(avatarId?"/api/avatars/"+encodeURIComponent(avatarId)+"/image":""));
    if(avatarUrl){avatar.classList.add("has-image",characterId?"game-character":"avatar-fallback");const img=document.createElement("img");img.src=avatarUrl;img.alt="";img.loading="lazy";img.decoding="async";img.addEventListener("error",()=>{img.remove();avatar.classList.remove("has-image")});avatar.append(img)}
    const name=document.createElement("span");name.className="name";name.textContent=actualSeat?(actualSeat+" · "+playerName):playerName;
    const stateTag=document.createElement("span");stateTag.className="player-state";stateTag.textContent=data.movementStatus==="moving"?"➜":data.ready?"✓":data.online?"●":"○";
    button.append(avatar,stateTag,name);button.setAttribute("aria-label",(actualSeat?("Vị trí "+actualSeat+" · "):"")+" "+playerName);
    button.addEventListener("click",e=>{e.stopPropagation();selectedId=data.id;document.getElementById("selectedLabel").textContent="Đã chọn: "+(actualSeat?("Vị trí "+actualSeat+" · "):"")+playerName;selection.hidden=false;render()});
    return button
  }
  function render(){
    cancelAnimationFrame(moveFrame);moveFrame=0;
    const seatCount=Math.max(1,Math.min(30,Number(count)||12)),ps=positions(seatCount),seatMap=new Map(),unseated=[];
    for(const item of all){const sid=Number(item?.seatId||0);if(sid>=1&&sid<=seatCount&&!seatMap.has(sid))seatMap.set(sid,item);else if(!sid)unseated.push(item)}
    players.replaceChildren();roster.replaceChildren();
    ps.forEach((p,i)=>{
      const seatId=i+1,data=seatMap.get(seatId)||(!liveRoom&&!embedded?(all[i]||sample[i]):null);
      if(!data){
        const reserved=all.some(x=>Number(x?.moveTargetSeatId||0)===seatId&&x?.movementStatus==="moving"),empty=document.createElement("button");empty.type="button";empty.className="seat-empty"+(Number(setupState.selectedSeatId||0)===seatId?" selected":"")+(reserved?" reserved":"");empty.dataset.seatId=String(seatId);empty.style.left=p.x+"%";empty.style.top=p.y+"%";empty.style.zIndex=String(9+Math.round(p.y));empty.innerHTML='<span class="seat-dot" aria-hidden="true">＋</span><b>'+(reserved?'Đang tới ':'Vị trí ')+seatId+'</b>';
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
      const pos=movementPosition(data,null,Date.now());el.style.left=pos.x+"%";el.style.top=pos.y+"%";el.style.zIndex=String(10+Math.round(pos.y));active=active||pos.moving;
      if(!pos.moving&&embedded&&String(data.id)===String(setupState.viewerParticipantId||"")&&!arrivalNotified.has(String(data.moveId))){arrivalNotified.add(String(data.moveId));try{window.parent.postMessage({type:"gmww:move-arrived",participantId:String(data.id),moveId:String(data.moveId)},window.location.origin)}catch{}}
    }
    if(active)moveFrame=requestAnimationFrame(animateMovementFrame);else moveFrame=0
  }
  if(supplied?.length){count=Math.min(30,Math.max(supplied.length,...supplied.map(x=>Number(x?.seatId||0)||0)));document.getElementById("size").hidden=true;document.querySelector("label[for=size]").hidden=true;}
  document.getElementById("size").addEventListener("change",e=>{count=Number(e.target.value);selectedId=null;selection.hidden=true;render();});
  installVillageCamera(document.querySelector(".stage"),document.getElementById("scene"),document.getElementById("zoom"));
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
    all=incoming;count=Math.max(1,Math.min(30,Number(room.seatCount||0)||Math.max(incoming.length,...incoming.map(x=>Number(x?.seatId||0)||0),1)));setupState=payload?.setup&&typeof payload.setup==="object"?payload.setup:{enabled:false,walkEnabled:false,previewCharacterId:"",selectedSeatId:null,viewerParticipantId:""};
    if(selectedId&&!all.some(p=>p.id===selectedId)){selectedId=null;selection.hidden=true;}
    if(phase==="night"||phase==="day"||phase==="morning")applyPhase(phase==="night",cycle);
    if(room.roomName)document.title="GMWW · "+safeText(room.roomName);
    render();
  }
  if(embedded){
    document.getElementById("size").hidden=true;document.querySelector("label[for=size]").hidden=true;
    document.getElementById("mode").hidden=true;
    const stage=document.querySelector(".stage");stage.addEventListener("click",event=>{if(!setupState.enabled||!setupState.walkEnabled)return;if(event.target.closest(".player,.seat-empty,.hud,.scene-controls"))return;const r=stage.getBoundingClientRect(),p=normalizeVillagePoint((event.clientX-r.left)/Math.max(1,r.width)*100,(event.clientY-r.top)/Math.max(1,r.height)*100);try{window.parent.postMessage({type:"gmww:ground-click",x:p.x,y:p.y},window.location.origin)}catch{}});

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
