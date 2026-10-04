import {installVillageCamera} from "./village-camera.mjs";
import {createPublicRoomPoller,mergeStableSeats,validateRoomCode} from "./village-room.mjs";
import {startVillagePerformanceReporter} from "./village-performance.mjs";
// Isolated visual prototype: never writes to live rooms or player accounts.
// Exported helpers allow deterministic Node tests without a DOM.
export function positions(count){
  if(!Number.isInteger(count)||count<1||count>30)throw Error("COUNT_OUT_OF_RANGE");
  const rings=count<=12?[count]:[Math.min(12,count),count-12],out=[];
  rings.forEach((n,r)=>{const radius=rings.length===1?Math.min(34,12+count*1.9):r===0?25:42;
    for(let i=0;i<n;i++){const angle=2*Math.PI*(i/n)+(r===1?Math.PI/n:0)-Math.PI/2;
      out.push({x:50+radius*Math.cos(angle),y:57+radius*.68*Math.sin(angle),ring:r});}
  });return out;
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
    characterId:/^chibi-(?:0[1-9]|[1-3][0-9]|4[0-2])$/.test(p.characterId)?p.characterId:"",
    online:p.online!==false
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
  const sample=names.map((displayName,i)=>({id:"sample-"+(i+1),displayName,avatarUrl:"",characterId:"chibi-"+String(i%42+1).padStart(2,"0")}));
  let all=embedded?[]:(supplied?.length?supplied:sample);
  let liveRoom=embedded;
  function trustedAvatarUrl(raw){
    if(typeof raw!=="string"||!raw.trim())return "";
    try{const u=new URL(raw,window.location.href);
      return u.origin===window.location.origin&&["http:","https:"].includes(u.protocol)?u.href:"";
    }catch{return "";}
  }
  let night=false,selectedId=null,count=12;
  function render(){
    const ps=positions(count);players.replaceChildren();roster.replaceChildren();
    ps.forEach((p,i)=>{
      const data=all[i]||sample[i];const playerName=safeText(data.displayName||data.name||names[i]);
      const button=document.createElement("button");button.type="button";button.className="player"+(selectedId===data.id?" selected":"");button.dataset.style=String(i%5);button.dataset.playerId=safeText(data.id||("sample-"+(i+1)));
      button.style.left=p.x+"%";button.style.top=p.y+"%";button.style.zIndex=String(10+Math.round(p.y));
      const avatar=document.createElement("span");avatar.className="portrait";
      const characterId=/^chibi-(?:0[1-9]|[1-3][0-9]|4[0-2])$/.test(data.characterId)?data.characterId:"";
      const avatarId=typeof data.avatarId==="string"&&/^[A-Za-z0-9._-]{1,100}$/.test(data.avatarId)?data.avatarId:"";
      const avatarUrl=trustedAvatarUrl(data.avatarUrl||(avatarId?"/api/avatars/"+encodeURIComponent(avatarId)+"/image":""));
      if(characterId){avatar.classList.add("has-image","is-character");const img=document.createElement("img");img.src="/characters/v253/"+characterId+".webp";img.alt="";img.loading="lazy";img.decoding="async";img.addEventListener("error",()=>{img.remove();avatar.classList.remove("has-image","is-character")});avatar.append(img);}
      else if(avatarUrl){avatar.classList.add("has-image");const img=document.createElement("img");img.src=avatarUrl;img.alt="";img.loading="lazy";img.decoding="async";img.addEventListener("error",()=>{img.remove();avatar.classList.remove("has-image")});avatar.append(img);}
      const name=document.createElement("span");name.className="name";name.textContent=(i+1)+" · "+playerName;
      button.append(avatar,name);button.setAttribute("aria-label","Chọn người chơi "+playerName);button.addEventListener("click",()=>{selectedId=data.id;document.getElementById("selectedLabel").textContent="Đã chọn: "+(i+1)+" · "+playerName;selection.hidden=false;render();});
      players.append(button);const item=document.createElement("span");item.textContent=(i+1)+" · "+playerName+(liveRoom?(data.online?" ●":" ○"):"");roster.append(item);
    });
    document.getElementById("count").textContent=count+"/"+count;
  }
  if(supplied?.length){count=Math.min(30,supplied.length);document.getElementById("size").hidden=true;document.querySelector("label[for=size]").hidden=true;}
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
    const incoming=mapPublicPlayers({players:Array.isArray(payload?.players)?payload.players:[]});
    all=mergeStableSeats(all.filter(p=>!String(p.id).startsWith("sample-")),incoming);count=all.length;
    if(selectedId&&!all.some(p=>p.id===selectedId)){selectedId=null;selection.hidden=true;}
    const room=payload?.room||{},cycle=payload?.cycle||{},phase=String(cycle.phase||"").toLowerCase();
    if(phase==="night"||phase==="day"||phase==="morning")applyPhase(phase==="night",cycle);
    if(room.roomName)document.title="GMWW · "+safeText(room.roomName);
    if(count)render();else{players.replaceChildren();roster.replaceChildren();document.getElementById("count").textContent="0/0";}
  }
  if(embedded){
    document.getElementById("size").hidden=true;document.querySelector("label[for=size]").hidden=true;
    document.getElementById("mode").hidden=true;
    window.addEventListener("message",event=>{
      if(event.origin!==window.location.origin||event.source!==window.parent)return;
      if(event.data?.type==="gmww:village-state")applyExternalState(event.data);
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
        all=mergeStableSeats(all.filter(p=>!String(p.id).startsWith("sample-")),mapPublicPlayers(state));
        count=all.length;
        if(selectedId&&!all.some(p=>p.id===selectedId)){selectedId=null;selection.hidden=true;}
        if(count){render();}else{players.replaceChildren();roster.replaceChildren();document.getElementById("count").textContent="0/0";}
        const room=state.room;
        if(room?.roomName)document.title="GMWW · "+safeText(room.roomName);
      },
      onError:()=>{document.getElementById("count").textContent="Mất kết nối";}
    });
  }
  if(!liveRoom)render();
  else{players.replaceChildren();roster.replaceChildren();document.getElementById("count").textContent="Đang kết nối";}
}
