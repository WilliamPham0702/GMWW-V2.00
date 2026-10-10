/* GMWW AI Support: global floating icon, independent of the existing game data. */
(()=>{'use strict';
  const BASE='https://gmww-v2-00.williampham0702.workers.dev';
  const POS_KEY='GMWW_AI_FLOAT_POSITION_V1';
  const ICON_SIZE=54;
  const state={open:false,drag:false,pointerId:null,startX:0,startY:0,startLeft:0,startTop:0,
    moved:false,accessToken:'',busy:false,configured:null,history:[],position:null};
  const $=id=>document.getElementById(id);
  const svg='<svg width="30" height="30" viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M13 10 20 6l7 4 5 9-5 9-7 4-7-4-5-9 5-9Z" stroke="#E3FAFF" stroke-width="2.4"/><path d="M14 13c0 7 6 13 13 11M26 13c-8 1-12 6-12 14M10 19l8-4 11 4-8 8-10-5M18 9l2 10-8 8" stroke="#5DE3D7" stroke-width="2" stroke-linecap="round"/></svg>';
  function el(tag,cls,text){
    const node=document.createElement(tag);if(cls)node.className=cls;
    if(text!==undefined)node.textContent=text;return node;
  }
  const host=el('div','gmww-ai-host');host.id='gmwwAiHost';
  const bubble=el('button','gmww-ai-bubble');bubble.type='button';bubble.id='gmwwAiBubble';
  bubble.setAttribute('aria-label','Mở GMWW AI Support');bubble.setAttribute('aria-expanded','false');
  bubble.innerHTML=svg+'<span class="gmww-ai-bubble-indicator" aria-hidden="true"></span>';
  const backdrop=el('div','gmww-ai-backdrop');backdrop.hidden=true;
  const panel=el('section','gmww-ai-panel');panel.id='gmwwAiPanel';panel.hidden=true;
  panel.setAttribute('role','dialog');panel.setAttribute('aria-label','GMWW AI Support');
  panel.innerHTML='<header class="gmww-ai-header"><span class="gmww-ai-title-icon" aria-hidden="true">✧</span><div><strong>GMWW AI Support</strong><small>Trò chuyện &amp; hỗ trợ kỹ thuật</small></div><button type="button" class="gmww-ai-minimize" aria-label="Thu nhỏ cửa sổ hỗ trợ">−</button></header>'+
    '<div class="gmww-ai-info" id="gmwwAiInfo" role="status">Đang kiểm tra trạng thái kết nối AI…</div>'+
    '<div class="gmww-ai-auth" id="gmwwAiAuth"><label for="gmwwAiAccess">Mã truy cập AI Support</label><div class="gmww-ai-auth-row"><input id="gmwwAiAccess" type="password" autocomplete="off" autocapitalize="off" placeholder="Nhập mã bí mật đã cấu hình" maxlength="300"><button id="gmwwAiApply" type="button">Kết nối</button></div><small>Không phải OpenAI API key. Mã chỉ giữ trong bộ nhớ phiên sử dụng, không lưu vào game.</small></div>'+
    '<div class="gmww-ai-actions"><button type="button" id="gmwwAiDiagnose">⌕ Báo lỗi tự động</button><a href="https://github.com/WilliamPham0702/GMWW-V2.00/actions" target="_blank" rel="noopener noreferrer">↗ GitHub CI</a></div>'+
    '<div id="gmwwAiMessages" class="gmww-ai-messages" aria-live="polite" aria-label="Nội dung hội thoại"></div>'+
    '<form id="gmwwAiForm" class="gmww-ai-form"><label class="gmww-ai-sr" for="gmwwAiInput">Tin nhắn cho GMWW AI Support</label><textarea id="gmwwAiInput" maxlength="1200" rows="2" placeholder="Nhập câu hỏi hoặc mô tả yêu cầu…"></textarea><button id="gmwwAiSend" type="submit" aria-label="Gửi tin nhắn">➤</button></form>'+
    '<small class="gmww-ai-footer">AI chỉ đọc &amp; phân tích. Mọi thay đổi GitHub/Production phải được bạn phê duyệt.</small>';
  host.append(bubble,backdrop,panel);
  document.body.appendChild(host);
  const msg=$('gmwwAiMessages'),info=$('gmwwAiInfo'),form=$('gmwwAiForm'),input=$('gmwwAiInput');
  function viewport(){
    return{w:Math.max(300,window.innerWidth||360),h:Math.max(360,window.innerHeight||600)};
  }
  function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
  function bounds(){
    const {w,h}=viewport();return{minX:8,maxX:Math.max(8,w-ICON_SIZE-8),
      minY:Math.min(70,h-ICON_SIZE-20),maxY:Math.max(70,h-ICON_SIZE-90)};
  }
  function applyPosition(left,top,save=false){
    const b=bounds();const x=clamp(left,b.minX,b.maxX),y=clamp(top,b.minY,Math.max(b.minY,b.maxY));
    bubble.style.left=x+'px';bubble.style.top=y+'px';
    state.position={x,y};
    if(save){try{const {w,h}=viewport();localStorage.setItem(POS_KEY,JSON.stringify({right:x>w/2,y:y/h}))}catch{}}
  }
  function initialPosition(){
    try{
      const p=JSON.parse(localStorage.getItem(POS_KEY)||'null');
      if(p&&typeof p.right==='boolean'&&Number.isFinite(Number(p.y))){
        const b=bounds();applyPosition(p.right?b.maxX:b.minX,Number(p.y)*viewport().h);return;
      }
    }catch{}
    const b=bounds();applyPosition(b.maxX,Math.min(b.maxY,viewport().h*.57));
  }
  function toggle(open){
    state.open=!!open;panel.hidden=!open;backdrop.hidden=!open;
    bubble.setAttribute('aria-expanded',String(!!open));
    if(open){void refreshConfig();msg.scrollTop=msg.scrollHeight}
  }
  bubble.addEventListener('pointerdown',event=>{
    if(event.button!==0||state.open)return;
    state.pointerId=event.pointerId;state.startX=event.clientX;state.startY=event.clientY;
    state.startLeft=state.position?.x||0;state.startTop=state.position?.y||0;
    state.moved=false;state.drag=true;
    try{bubble.setPointerCapture(event.pointerId)}catch{}
  });
  bubble.addEventListener('pointermove',event=>{
    if(!state.drag||state.pointerId!==event.pointerId)return;
    const dx=event.clientX-state.startX,dy=event.clientY-state.startY;
    if(Math.hypot(dx,dy)>7)state.moved=true;
    if(state.moved)applyPosition(state.startLeft+dx,state.startTop+dy);
  });
  function release(event){
    if(!state.drag||event.pointerId!==state.pointerId)return;
    state.drag=false;state.pointerId=null;
    if(state.moved){
      const b=bounds(),{w}=viewport();
      applyPosition((state.position?.x||0)>w/2?b.maxX:b.minX,state.position?.y||b.maxY,true);
      // Suppress the synthetic click after a drag; clicks only open support.
      bubble.dataset.ignoreClickUntil=String(Date.now()+350);
    }
  }
  bubble.addEventListener('pointerup',release);bubble.addEventListener('pointercancel',release);
  bubble.addEventListener('click',()=>{
    if(Date.now()<Number(bubble.dataset.ignoreClickUntil||0))return;
    toggle(!state.open);
  });
  panel.querySelector('.gmww-ai-minimize').addEventListener('click',()=>toggle(false));
  backdrop.addEventListener('click',()=>toggle(false));
  window.addEventListener('resize',()=>{if(state.position)applyPosition(state.position.x,state.position.y)});
  function append(role,text){
    const row=el('div','gmww-ai-message gmww-ai-message-'+role,text);msg.appendChild(row);
    msg.scrollTop=msg.scrollHeight;return row;
  }
  append('assistant','Xin chào! Bạn có thể hỏi bất cứ điều gì về GMWW. Nhấn “Báo lỗi tự động” để gửi kèm kết quả kiểm tra Server, Runtime và GitHub CI.');
  function notice(text,type='info'){info.textContent=text;info.dataset.kind=type;}
  async function refreshConfig(){
    try{
      const c=await fetch(BASE+'/api/gm/ai-support/config',{cache:'no-store'});
      const d=await c.json();state.configured=c.ok&&d.configured===true;
      if(!state.configured)notice('Chưa kết nối AI: cần cấu hình OpenAI API key và mã truy cập bí mật trên Cloudflare.','warn');
      else if(!state.accessToken)notice('AI đã sẵn sàng trên Server. Nhập mã truy cập để bắt đầu.','info');
      else notice('Kết nối AI đã cấu hình. Có thể chat và báo lỗi.','ok');
    }catch{notice('Chưa đọc được trạng thái AI Support từ Server.','warn')}
  }
  $('gmwwAiApply').addEventListener('click',()=>{
    const value=$('gmwwAiAccess').value.trim();
    if(value.length<12){notice('Mã truy cập phải đủ 12 ký tự trở lên.','warn');return}
    state.accessToken=value;
    $('gmwwAiAccess').value='';
    $('gmwwAiAuth').hidden=true;
    notice('Mã đã lưu tạm trong phiên. Hãy gửi tin nhắn để xác nhận kết nối.','ok');
    input.focus();
  });
  function safeCode(raw){return String(raw||'').replace(/[^a-zA-Z0-9_.:-]/g,'').slice(0,80);}
  async function probe(path){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
    const started=Date.now();
    try{
      const res=await fetch(BASE+path,{method:'GET',cache:'no-store',signal:controller.signal});
      const d=await res.json().catch(()=>({}));
      return {ok:res.ok&&d?.ok===true,status:res.status,latencyMs:Date.now()-started,code:safeCode(d?.error)};
    }catch{return {ok:false,status:0,latencyMs:Date.now()-started,code:'FETCH_FAILED'}}
    finally{clearTimeout(timer)}
  }
  async function diagnostic(){
    const paths={
      server:'/api/health',player:'/api/web-sync',update:'/api/update/manifest',
      characters:'/api/game-characters',settings:'/api/ui-settings'
    };
    const list=await Promise.all(Object.entries(paths).map(async ([key,path])=>[key,await probe(path)]));
    return {
      ipaVersion:safeCode($('updateShellVersion')?.textContent||''),
      runtimeVersion:safeCode($('updateRuntimeVersion')?.textContent||''),
      serverVersion:safeCode($('updateServerVersion')?.textContent||''),
      releaseState:safeCode($('updateStatus')?.textContent||''),
      releaseCode:list.find(x=>x[0]==='update')?.[1]?.code||'',
      errorCount:0,checks:Object.fromEntries(list)
    };
  }
  async function send(message,withDiagnostics=false){
    const text=String(message||'').trim();if(!text||state.busy)return;
    if(!state.accessToken){$('gmwwAiAuth').hidden=false;notice('Nhập mã truy cập AI Support trước khi gửi.','warn');return;}
    if(state.configured===false){notice('AI Support chưa được cấu hình trên Cloudflare.','warn');return;}
    state.busy=true;$('gmwwAiSend').disabled=true;$('gmwwAiDiagnose').disabled=true;
    append('user',text);input.value='';
    const waiting=append('assistant','Đang kiểm tra và trả lời…');
    try{
      const body={message:text,history:state.history.slice(-8),withDiagnostics};
      if(withDiagnostics){notice('Đang kiểm tra trạng thái Server, Player Web và Runtime…');body.diagnostics=await diagnostic();}
      const res=await fetch(BASE+'/api/gm/ai-support/chat',{
        method:'POST',headers:{'authorization':'Bearer '+state.accessToken,'content-type':'application/json'},
        cache:'no-store',body:JSON.stringify(body)
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||data?.ok!==true){
        const code=safeCode(data?.error||('HTTP_'+res.status));
        waiting.textContent='Chưa thể nhận phản hồi: '+code+'.';
        if(res.status===401){state.accessToken='';$('gmwwAiAuth').hidden=false;notice('Mã truy cập không đúng hoặc đã đổi. Vui lòng nhập lại.','warn')}
        else notice('Có lỗi kết nối AI. Dữ liệu game không bị ảnh hưởng.','warn');
        return;
      }
      const answer=String(data.answer||'').slice(0,7000);
      waiting.textContent=answer||'AI chưa trả về nội dung.';
      state.history.push({role:'user',content:text},{role:'assistant',content:answer});
      state.history=state.history.slice(-8);
      notice(withDiagnostics?'Đã đính kèm chẩn đoán an toàn cho AI.':'Đã nhận phản hồi từ AI.','ok');
    }catch{
      waiting.textContent='Không thể kết nối AI Support. Vui lòng kiểm tra mạng và thử lại.';
      notice('Kết nối AI thất bại. Trận đấu vẫn hoạt động bình thường.','warn');
    }finally{state.busy=false;$('gmwwAiSend').disabled=false;$('gmwwAiDiagnose').disabled=false;}
  }
  form.addEventListener('submit',event=>{event.preventDefault();void send(input.value,false)});
  input.addEventListener('keydown',event=>{
    if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();if(!state.busy)void send(input.value,false)}
  });
  $('gmwwAiDiagnose').addEventListener('click',()=>void send(
    'Hãy kiểm tra tình trạng GMWW hiện tại, đặc biệt Runtime OTA, Player Web và GitHub CI. Phân loại lỗi, đề xuất hướng xử lý và nêu những bước cần phê duyệt trước khi sửa hoặc deploy.',true));
  initialPosition();
})();
