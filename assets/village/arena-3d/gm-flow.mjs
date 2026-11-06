// GĐ55 - Thanh tiến trình + nút "CHẠM ĐỂ TIẾP" giống màn vận hành 2D, đặt trong trang Arena 3D.
// Chỉ bấm hộ các nút ĐÃ CÓ của trang (Core vẫn là nơi quyết định); không tự gọi API riêng.
export const GM_FLOW_VERSION='gmww.gm-flow.1';
export const FLOW_STEPS=Object.freeze(['Sảnh chờ','Tập hợp','Ván Mẫu','Phân Vai','Phát Vai','Vào Trận']);
// state: {room, phase, cyclePhase, seatsLocked}. Trả {step:1..6, next:{label,hint,target}|null}
export function flowState({room=null,phase=null,cyclePhase=null,seatsLocked=false}={}){
  if(!room)return {step:1,next:{label:'Vào phòng',hint:'Kết nối phòng',target:'connect'}};
  if(phase==='running'){
    const night=cyclePhase==='night';
    return {step:6,next:night?{label:'☀️ Sang Ngày',hint:'Chạm để tiếp',target:'day'}:{label:'🌙 Sang Đêm',hint:'Chạm để tiếp',target:'night'}};
  }
  if(seatsLocked)return {step:5,next:{label:'Vào Trận',hint:'Chạm để tiếp',target:'start'}};
  return {step:2,next:{label:'Thiết lập / Phát Vai',hint:'Chọn ván, phân vai',target:'open-setup'}};
}
const CSS=`#gm-steps{position:fixed;left:8px;right:8px;top:calc(env(safe-area-inset-top) + 6px);z-index:31;display:none;gap:2px;padding:6px 4px;
border-radius:20px;background:#0d2a3de6;border:1px solid #8fd0d6;justify-content:space-around}
body.immersive #gm-steps{display:flex}
#gm-steps div{flex:1;text-align:center;font:700 10.5px system-ui,-apple-system,sans-serif;color:#c9e7ea;border-radius:14px;padding:3px 0;min-width:0}
#gm-steps b{display:block;width:26px;height:26px;line-height:26px;margin:0 auto 2px;border-radius:50%;background:#2a6f7d;color:#fff;font-size:13px}
#gm-steps .done b{background:#4fb28b}#gm-steps .cur{background:#ffffff1f}#gm-steps .cur b{background:#f0c75e;color:#3b2a05}
body.immersive #state{display:none!important}
#gm-dock #gm-next{flex:1;max-width:430px;min-height:52px;background:linear-gradient(#2a8197,#1d6b82);font-weight:800;font-size:16px;line-height:1.1}
#gm-dock #gm-next small{display:block;font-size:10px;letter-spacing:.08em;font-weight:700;opacity:.85;margin-top:2px;text-transform:uppercase}
#gm-dock #gm-next[disabled]{opacity:.5}
body.immersive #gm-dock #dock-ballot{display:none}`;
export function installGmFlow({doc=document,read,click=id=>doc.getElementById(id)?.click(),interval=500}={}){
  const style=doc.createElement('style');style.id='gm-flow-style';style.textContent=CSS;doc.head.appendChild(style);
  const strip=doc.createElement('div');strip.id='gm-steps';strip.setAttribute('aria-label','Tiến trình ván');
  const cells=FLOW_STEPS.map((name,i)=>{const d=doc.createElement('div'),b=doc.createElement('b'),t=doc.createElement('span');
    b.textContent=String(i+1);t.textContent=name;d.append(b,t);strip.append(d);return d});
  doc.body.append(strip);
  const dock=doc.getElementById('gm-dock'),open=doc.getElementById('gm-dock-open');
  const next=doc.createElement('button');next.type='button';next.id='gm-next';
  if(dock)dock.insertBefore(next,open?open.nextSibling:null);
  let current=null;
  next.onclick=()=>{if(current?.next)click(current.next.target)};
  function refresh(){
    let st=null;try{st=read()}catch{}
    current=flowState(st||{});
    cells.forEach((d,i)=>{d.className=i+1<current.step?'done':i+1===current.step?'cur':''});
    next.replaceChildren();const main=doc.createElement('span');main.textContent=current.next?.label||'';
    const small=doc.createElement('small');small.textContent=current.next?.hint||'';next.append(main,small);
    next.disabled=!current.next;
  }
  refresh();const timer=setInterval(refresh,interval);
  return {refresh,get state(){return current},dispose(){clearInterval(timer);strip.remove();next.remove();style.remove()}};
}
