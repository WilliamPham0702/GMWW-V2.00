// GMWW Arena 3D Stage4: accessible GM control dashboard.
// Render publicly allowed server snapshots ONLY; no role/Artifact or private receipts.
// Actions are UI intents. Server checks bearer GM permissions for every mutation.
export function publicGMRows(frame){
  if(!frame||!Array.isArray(frame.players))return [];
  return frame.players.filter(p=>p.kind!=='gm'&&p.seatId!==null).map(p=>({
    id:p.id,seatId:p.seatId,label:String(p.displayName||'Thành viên').slice(0,80),
    online:p.online===true,ready:p.ready===true,
    statuses:(p.statusTags||[]).map(s=>({id:s.statusId,label:String(s.label||s.statusId).slice(0,70)}))
  })).sort((a,b)=>a.seatId-b.seatId);
}
export function publicPhaseName(room){
  if(room?.phase==='role_delivery')return 'Đã Phát Vai';
  if(room?.phase==='running')return room.cyclePhase==='night'?'ĐÊM '+(room.cycleNight||1):
    room.cyclePhase==='morning'?'NGÀY '+(room.cycleNight||1):'Đang trong trận';
  return room?.phase==='ended'?'Đã kết thúc':'Chờ vào trận';
}
export function publicVoteSummary(ballot){
  if(!ballot)return 'Chưa mở đề cử/bỏ phiếu';
  const stage={ready:'Chuẩn bị',nominating:'Đề cử',selecting:'Chốt người',voting:'Đang bỏ phiếu',
    resolved:'Đã xử lý',completed:'Hoàn tất',closed:'Hết giờ'}[ballot.stage]||ballot.stage;
  const save=Number(ballot.save)||0,kill=Number(ballot.kill)||0;
  const decision=ballot.outcome==='dead'?'Bị xử tử':ballot.outcome==='alive'?'Được cứu':'Chưa kết luận';
  return stage+' · 👍 '+save+' / 👎 '+kill+' · '+decision;
}
export function createGmDashboard({container,onSelect,onAction,onToggleQuality}){
  if(!container||typeof container.replaceChildren!=='function')throw new TypeError('DASHBOARD_CONTAINER_REQUIRED');
  let frame=null,ballot=null,selectedId=null,hasGM=false,activeTab='room',lowPower=false,lastNotice='';
  const controls=[
    ['room','Phòng'],['day','Ngày / Đêm'],['gallows','Lên Giàn'],['vfx','Hiệu ứng'],['perf','Hiệu năng']
  ];
  const root=document.createElement('section');root.className='gm-console';
  const header=document.createElement('div');header.className='gm-console-head';
  const title=document.createElement('strong'),subtitle=document.createElement('small');
  header.append(title,subtitle);
  const tabs=document.createElement('div');tabs.className='gm-console-tabs';tabs.setAttribute('role','tablist');
  const body=document.createElement('div');body.className='gm-console-body';
  const announce=document.createElement('div');announce.className='gm-console-status';announce.setAttribute('aria-live','polite');
  root.append(header,tabs,body,announce);container.replaceChildren(root);
  function el(tag,text,cls){const o=document.createElement(tag);if(text!==undefined)o.textContent=String(text);if(cls)o.className=cls;return o}
  function btn(text,action,{disabled=false,selected=false}={}){
    const b=el('button',text,'gm-console-button');b.type='button';b.disabled=disabled;
    if(selected)b.classList.add('chosen');
    b.addEventListener('click',()=>action());return b;
  }
  function render(){
    const rows=publicGMRows(frame),room=frame?.room||{};
    title.textContent='Điều hành Arena 3D · '+(room.code||'Bản xem mẫu');
    subtitle.textContent=publicPhaseName(room)+' · '+rows.length+' người'+(hasGM?' · GM có quyền':' · Chỉ xem');
    tabs.replaceChildren(...controls.map(([key,label])=>{
      const t=btn(label,()=>{activeTab=key;render()},{selected:activeTab===key});
      t.setAttribute('role','tab');t.setAttribute('aria-selected',String(activeTab===key));return t;
    }));
    body.replaceChildren();
    const top=el('div','','gm-console-summary');
    top.append(el('span','PHÒNG '+(room.code||'DEMO')),el('span',publicPhaseName(room)),el('span','Seat '+(room.seatCount||'—')));
    body.append(top);
    if(activeTab==='room'){
      body.append(el('p','Chọn Seat/nhân vật để quan sát. Việc Phát Vai và mọi lệnh thay đổi trận đấu do Core V2 xác thực.','gm-console-hint'));
      const list=el('div','','gm-seat-grid');
      if(!rows.length)list.append(el('p','Chưa có người chơi trong phòng thử.'));
      for(const p of rows){
        const isPicked=selectedId===p.id;
        const status=p.statuses.map(s=>s.label).join(', ');
        const b=btn(''+p.seatId+' · '+p.label+(p.online?' ●':' ○')+(status?' · '+status:''),()=>{
          selectedId=p.id;onSelect?.(p.id);render();
        },{selected:isPicked});
        b.dataset.seatId=String(p.seatId);list.append(b);
      }
      body.append(list);
      const b=el('div','','gm-console-actions');
      b.append(btn('Khóa Seat',()=>onAction?.('lock'),{disabled:!hasGM}));
      b.append(btn('Phát Vai',()=>onAction?.('deal'),{disabled:!hasGM}));
      b.append(btn('Vào Trận',()=>onAction?.('start'),{disabled:!hasGM}));
      body.append(b);
    }else if(activeTab==='day'){
      body.append(el('p','Core V2 xử lý các luật và hành động. Arena chỉ ra lệnh GM và cập nhật góc nhìn sau khi Server xác nhận.','gm-console-hint'));
      const actions=el('div','','gm-console-actions');
      actions.append(btn('🌙 Chuyển Đêm',()=>onAction?.('night'),{disabled:!hasGM}));
      actions.append(btn('☀️ Chuyển Ngày',()=>onAction?.('day'),{disabled:!hasGM}));
      actions.append(btn('Đồng bộ trạng thái',()=>onAction?.('refresh')));
      body.append(actions);
    }else if(activeTab==='gallows'){
      body.append(el('p',publicVoteSummary(ballot),'gm-console-vote'));
      const names=(ballot?.nominationTotals||[]).map(x=>x.loginId+': '+x.votes).join(' · ');
      if(names)body.append(el('div','Đề cử: '+names,'gm-console-hint'));
      const candidate=el('p','','gm-console-hint');
      candidate.textContent='Người được chọn: '+(rows.find(x=>x.id===selectedId)?.label||'Chưa chọn');
      body.append(candidate);
      const actions=el('div','','gm-console-actions');
      actions.append(btn('Mở đề cử tự động',()=>onAction?.('nominate'),{disabled:!hasGM}));
      actions.append(btn('Bỏ phiếu cho Seat đã chọn',()=>onAction?.('vote',selectedId),{disabled:!hasGM||!selectedId}));
      body.append(actions);
      body.append(el('p','Người chơi vote 👍/👎 qua Player Web STAGING; thông số lấy từ Core, không hiển thị ai vote cho ai.','gm-console-hint'));
    }else if(activeTab==='vfx'){
      body.append(el('p','Các hiệu ứng vai bí mật chỉ cấp cho GM từ Server. Màn hình của Player không tiết lộ vai/đích đêm.','gm-console-hint'));
      body.append(el('div','🛡️ Bảo Vệ · 🔮 Tiên Tri · 💚 Phù Thủy · ✨ Tác động · 🗳️ Lên Giàn','gm-console-vote'));
      body.append(el('p','Trạng thái đã công khai có thể hiện trên tất cả Client; chi tiết đêm kín chỉ GM có quyền nhận.','gm-console-hint'));
    }else if(activeTab==='perf'){
      body.append(el('p','Chọn tiết kiệm để giảm tốc độ khung hình/độ phân giải, phù hợp iPhone nóng máy. Không làm chậm Core và Player Web.','gm-console-hint'));
      const controls=el('div','','gm-console-actions');
      controls.append(btn('Mượt',()=>{lowPower=false;onToggleQuality?.(false);render()},{selected:!lowPower}));
      controls.append(btn('Tiết kiệm pin',()=>{lowPower=true;onToggleQuality?.(true);render()},{selected:lowPower}));
      body.append(controls);
    }
    announce.textContent=lastNotice;
    document.body.dataset.gmwwGmConsole=hasGM?'authorized':'read-only';
    document.body.dataset.gmwwGmTab=activeTab;
  }
  render();
  return {
    setState(next){frame=next;if(selectedId&&!publicGMRows(frame).some(p=>p.id===selectedId))selectedId=null;render()},
    setBallot(next){ballot=next;render()},
    setGM(next){hasGM=next===true;render()},
    setSelection(next){selectedId=typeof next==='string'?next:null;render()},
    notify(message){lastNotice=String(message||'').slice(0,200);render()},
    get selectedId(){return selectedId},get authorized(){return hasGM},
    destroy(){container.replaceChildren()}
  };
}
