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
const game=document.getElementById("game");
if(game){
  const players=document.getElementById("players"),roster=document.getElementById("roster"),selection=document.getElementById("selection");
  const names=["Minh","Lan","Huy","An","Mai","Khoa","Linh","Dũng","Phương","Quân","Trang","Đức","Ngọc","Hà","Nam","Thảo","Long","Vy","Tuấn","Nhi","Khánh","Tú","Sơn","Oanh","Hùng","Hoa","Bảo","Tâm","Vân","Đạt"];
  const icons=["🧑🏻","👩🏻","🧑🏽","👨🏻","👩🏼","👩🏽","🧑🏼","👨🏽","👩🏻","👨🏼"];
  let night=false,selected=null,count=12;
  function render(){
    const ps=positions(count);players.replaceChildren();roster.replaceChildren();
    ps.forEach((p,i)=>{
      const button=document.createElement("button");button.type="button";button.className="player"+(selected===i?" selected":"");
      button.style.left=p.x+"%";button.style.top=p.y+"%";button.style.zIndex=String(10+Math.round(p.y));
      const avatar=document.createElement("span");avatar.className="portrait";avatar.textContent=icons[i%icons.length];
      const name=document.createElement("span");name.className="name";name.textContent=(i+1)+" · "+names[i];
      button.append(avatar,name);button.setAttribute("aria-label","Chọn người chơi "+names[i]);button.addEventListener("click",()=>{selected=i;document.getElementById("selectedLabel").textContent="Đã chọn: "+(i+1)+" · "+names[i];selection.hidden=false;render();});
      players.append(button);const item=document.createElement("span");item.textContent=(i+1)+" · "+names[i];roster.append(item);
    });
    document.getElementById("count").textContent=count+"/"+count;
  }
  document.getElementById("size").addEventListener("change",e=>{count=Number(e.target.value);selected=null;selection.hidden=true;render();});
  document.getElementById("zoom").addEventListener("input",e=>document.getElementById("scene").style.setProperty("--zoom",Number(e.target.value)/100));
  document.getElementById("mode").addEventListener("click",()=>{
    night=!night;game.classList.toggle("night",night);game.classList.toggle("day",!night);
    document.getElementById("phaseIcon").textContent=night?"🌙":"☀️";
    document.getElementById("phaseLabel").textContent=night?"Đêm 02":"Ngày 02";
    document.getElementById("phaseDetail").textContent=night?"Nhóm được thức (minh họa)":"Thảo luận ban ngày";
    document.getElementById("mode").textContent=night?"☀️ Ngày":"🌙 Đêm";
    document.getElementById("chatTitle").textContent=night?"Chat nhóm riêng (mô phỏng)":"Chat chung";
    document.getElementById("voiceState").textContent=night?"● Không có voice ban đêm":"● Voice đang mở";
    document.getElementById("voice").hidden=night;
    document.getElementById("messages").replaceChildren();
  });
  document.querySelectorAll("[data-tab]").forEach(btn=>btn.addEventListener("click",()=>{
    document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("active",b===btn));
    document.querySelectorAll(".tab").forEach(t=>{t.hidden=t.id!==btn.dataset.tab;t.classList.toggle("active",t.id===btn.dataset.tab)});
  }));
  document.getElementById("clearSelection").addEventListener("click",()=>{selected=null;selection.hidden=true;render()});
  document.getElementById("chatForm").addEventListener("submit",e=>{
    e.preventDefault();const input=document.getElementById("chatText"),text=input.value.trim();if(!text)return;
    const p=document.createElement("p"),b=document.createElement("b");b.textContent="Bạn: ";p.append(b,document.createTextNode(text));document.getElementById("messages").append(p);input.value="";p.scrollIntoView({block:"nearest"});
  });
  let muted=true,speaker=true;document.getElementById("mic").addEventListener("click",e=>{muted=!muted;e.target.textContent=muted?"🎙️ Micro: Tắt":"🎙️ Micro: Bật (mô phỏng)"});
  document.getElementById("speaker").addEventListener("click",e=>{speaker=!speaker;e.target.textContent=speaker?"🔊 Loa: Bật":"🔇 Loa: Tắt"});
  render();
}
