
(function(){
'use strict';
const KEY='GMWW_V246_PLAY2D';
const ROOT_ID='play2dRoot';
const STEPS=['rooms','members','game','assign','delivery','play'];
const STEP_LABEL={rooms:'Tạo Phòng',members:'Chọn Thành Viên',game:'Chọn Ván',assign:'Phân Vai',delivery:'Phát Vai',play:'Vào Game',waiting:'Phòng Chờ'};
const EARLY_ARTIFACTS=['Tráng Gương','Đá Hoán Đổi','Mắt Tiên Tri','Bùa Hộ Mệnh'];
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=v=>JSON.parse(JSON.stringify(v));
const randomId=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
let root=null,toastTimer=0,roomTap={code:'',at:0},pollTimer=0;
let cache={catalog:{cards:[],artifacts:[],prefs:{}},members:[],rooms:[],avatars:[],roomState:null,membersAt:0,roomsAt:0};
function fresh(){
 return {screen:'rooms',mode:'online',room:null,openCreate:false,selectedRoomCode:'',selectedMembers:[],roleCounts:{},gameName:'Ván Tùy Chỉnh',artifactEnabled:false,artifactLimit:3,multiRole:false,assignments:[],artifactAssignments:[],swapLogin:'',matchId:'',deliveryVersion:0,delivered:false,offlineViewed:{},phase:'night',night:1,playStep:'wolf',earlyIndex:0,roleTurn:0,artifactUsed:0,winnerFaction:'village'};
}
function load(){try{return Object.assign(fresh(),JSON.parse(localStorage.getItem(KEY)||'{}'))}catch(_){return fresh()}}
let st=load();
function save(){try{localStorage.setItem(KEY,JSON.stringify(st))}catch(_){}}
function bridge(){return window.GMWW2DBridge||null}
function toast(msg){let t=$('.p2-toast');if(!t){t=document.createElement('div');t.className='p2-toast';document.body.appendChild(t)}t.textContent=msg;requestAnimationFrame(()=>t.classList.add('show'));clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2300)}
function roomCode(){return String(st.room?.code||st.room?.roomCode||'')}
function roomName(){return String(st.room?.roomName||st.room?.name||'Phòng mới')}
function selectedMemberRows(){const set=new Set(st.selectedMembers);return cache.members.filter(m=>set.has(m.loginId))}
function factionLabel(id){return id==='wolf'?'Phe Sói':id==='third'?'Phe Ba':'Phe Dân Làng'}
function pref(kind,id){return cache.catalog.prefs?.[kind]?.[id]||{}}
function starred(kind){const list=kind==='cards'?cache.catalog.cards:cache.catalog.artifacts;return list.filter(x=>pref(kind,x.id).starred&&!pref(kind,x.id).hidden).sort((a,b)=>(pref(kind,a.id).starOrder||999999)-(pref(kind,b.id).starOrder||999999))}
function currentStepIndex(){const s=st.screen==='waiting'?'play':st.screen;return Math.max(0,STEPS.indexOf(s))}
function phaseTitle(){if(st.screen!=='play')return STEP_LABEL[st.screen]||'Chơi';return st.phase==='day'?'Ngày '+String(st.night).padStart(2,'0'):'Đêm '+String(st.night).padStart(2,'0')}
function roomStatusText(){
 const p=String(cache.roomState?.room?.phase||st.room?.phase||'').toLowerCase();
 if(st.screen==='play'||['running','started','game','playing'].includes(p))return 'Đang Chơi';
 if(st.screen==='delivery'||p==='role_delivery')return 'Phát Vai';
 if(st.screen==='waiting'||p==='ended')return 'Phòng Chờ';
 return 'Đang chờ';
}
async function boot(){
 root=document.getElementById(ROOT_ID);if(!root)return;
 let tries=0;while(!bridge()&&tries<40){await new Promise(r=>setTimeout(r,80));tries++}
 if(!bridge()){root.innerHTML='<div class="play2d-loading">Không khởi tạo được Tab Chơi 2D.</div>';return}
 cache.catalog=bridge().getCatalog();
 render();await refreshRooms(true);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&st.screen==='delivery')refreshRoomState()});
}
function sceneHtml(){
 return '<div class="p2-scene"><div class="p2-orb"></div><div class="p2-palm a">🌴</div><div class="p2-palm b">🌴</div></div>';
}
function hudHtml(){
 const room=roomCode();
 const status=roomStatusText();
 return '<div class="p2-hud">'+
 '<div class="p2-phase"><b>'+esc(phaseTitle())+'</b><small>'+esc(STEP_LABEL[st.screen]||'Quản Trò')+'</small></div>'+
 (room?'<div class="p2-room-pill"><span class="p2-dot '+(status==='Đang Chơi'?'playing':'')+'"></span><b>'+esc(roomName())+'</b><span>'+esc(room)+'</span></div>':'<div class="p2-room-pill"><span class="p2-dot off"></span><b>Chưa có phòng</b></div>')+
 '<button class="p2-icon-btn" data-p2-action="refresh" aria-label="Làm mới">↻</button></div>'+
 '<div class="p2-stepbar">'+STEPS.map((x,i)=>'<span class="p2-step '+(i<=currentStepIndex()?'on':'')+'"></span>').join('')+'</div>';
}
function render(){
 if(!root)return;
 clearInterval(pollTimer);pollTimer=0;
 const tone=st.screen==='play'&&st.phase==='night'?'night':'day';
 root.innerHTML='<div class="play2d '+tone+'">'+sceneHtml()+hudHtml()+'<div class="p2-content">'+renderScreen()+'</div></div>';
 bindEvents();hydrateArt();
 if(st.screen==='rooms'&&Date.now()-cache.roomsAt>8000)refreshRooms();
 if(st.screen==='members'&&Date.now()-cache.membersAt>8000)refreshMembers();
 if(st.screen==='delivery'&&st.mode==='online'){refreshRoomState();pollTimer=setInterval(refreshRoomState,4500)}
 if(st.screen==='play'&&st.mode==='online'){refreshRoomState();pollTimer=setInterval(refreshRoomState,7000)}
}
function renderScreen(){
 if(st.screen==='rooms')return renderRooms();
 if(st.screen==='members')return renderMembers();
 if(st.screen==='game')return renderGame();
 if(st.screen==='assign')return renderAssign();
 if(st.screen==='delivery')return renderDelivery();
 if(st.screen==='play')return renderPlay();
 if(st.screen==='waiting')return renderWaiting();
 return '<div class="p2-empty">Màn hình chưa sẵn sàng.</div>';
}
function title(t,sub){return '<div class="p2-title"><h2>'+esc(t)+'</h2><p>'+esc(sub||'')+'</p></div>'}
function renderRooms(){
 const roomRows=cache.rooms||[];
 let html=title('Chọn Phòng','Chạm một lần để chọn • chạm lần hai để mở');
 html+='<div class="p2-panel"><div class="p2-row between"><div><b>Phòng chơi 2D</b><div class="p2-muted">Không dùng Khóa Phòng • ván đang chạy hiển thị Đang Chơi</div></div><button class="p2-primary" data-p2-action="toggle-create">＋ Tạo Phòng</button></div></div>';
 if(st.openCreate)html+='<div class="p2-panel"><div class="p2-row wrap"><label class="p2-field"><span>Tên phòng</span><input class="p2-input" id="p2RoomName" maxlength="60" value="'+esc(st.roomDraftName||'')+'" placeholder="Ví dụ: Biển Ngọc"></label></div><div class="p2-mode" style="margin-top:9px"><button class="p2-secondary '+(st.mode==='online'?'on':'')+'" data-p2-mode="online">🌐 Online<br><span class="p2-muted">Dùng máy chủ</span></button><button class="p2-secondary '+(st.mode==='offline'?'on':'')+'" data-p2-mode="offline">📱 Offline<br><span class="p2-muted">Quản Trò tại chỗ</span></button></div><div class="p2-footer"><button class="p2-secondary" data-p2-action="toggle-create">Hủy</button><button class="p2-primary" data-p2-action="create-room">Tạo Phòng</button></div></div>';
 html+='<div class="p2-panel"><div class="p2-row between"><b>Phòng hiện có</b><span class="p2-muted">'+roomRows.length+' phòng</span></div><div class="p2-room-list" style="margin-top:9px">';
 if(!roomRows.length)html+='<div class="p2-empty">Chưa có phòng. Tạo một phòng để bắt đầu.</div>';
 for(const r of roomRows){
  const code=String(r.code||r.roomCode||''),phase=String(r.phase||r.status||'waiting').toLowerCase(),playing=['running','playing','started','game'].includes(phase),sel=st.selectedRoomCode===code;
  html+='<button class="p2-room-card '+(sel?'selected':'')+'" data-p2-room="'+esc(code)+'"><div><b>'+esc(r.roomName||r.name||('Phòng '+code))+'</b><small>'+esc(code)+' • '+esc(r.gameName||'Chưa chọn ván')+'</small></div><span class="p2-status '+(playing?'playing':'')+'">'+(playing?'ĐANG CHƠI':'ĐANG CHỜ')+'</span></button>';
 }
 html+='</div></div>';
 return html;
}
function renderMembers(){
 const selected=new Set(st.selectedMembers),onlineOnly=st.mode==='online';
 let rows=cache.members||[];
 let html=title('Chọn Thành Viên',onlineOnly?'Phòng Online chỉ chọn Thành Viên đang Online':'Phòng Offline có thể chọn Thành Viên trong danh sách');
 html+='<div class="p2-panel"><div class="p2-row between"><div><b>'+selected.size+' Thành Viên đã chọn</b><div class="p2-muted">Chỉ hiển thị tên và ô chọn</div></div><button class="p2-secondary" data-p2-action="toggle-add-member">＋ Thêm</button></div>';
 if(st.addMemberOpen)html+=renderInlineMember();
 html+='<div class="p2-member-grid" style="margin-top:10px">';
 for(const m of rows){
  const disabled=onlineOnly&&!m.online,on=selected.has(m.loginId);
  html+='<button class="p2-member '+(on?'on':'')+'" data-p2-member="'+esc(m.loginId)+'" '+(disabled?'disabled':'')+'><span class="p2-check">'+(on?'✓':'')+'</span><span class="p2-member-name"><b>'+esc(m.displayName||m.loginId)+'</b><small>'+(m.online?'Online':'Offline')+'</small></span><span class="p2-online '+(m.online?'':'off')+'"></span></button>';
 }
 if(!rows.length)html+='<div class="p2-empty">Đang tải Thành Viên…</div>';
 html+='</div><div class="p2-footer"><button class="p2-secondary" data-p2-action="back-rooms">‹ Phòng</button><button class="p2-primary" data-p2-action="members-next" '+(!selected.size?'disabled':'')+'>Chọn Ván ›</button></div></div>';
 return html;
}
function renderInlineMember(){
 const opts=(cache.avatars||[]).slice(0,50).map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name||a.id)+'</option>').join('');
 return '<div class="p2-panel" style="margin-top:9px"><div class="p2-row wrap"><label class="p2-field"><span>Member ID</span><input class="p2-input" id="p2NewLogin" maxlength="20" placeholder="minh01"></label><label class="p2-field"><span>Tên hiển thị</span><input class="p2-input" id="p2NewName" maxlength="24" placeholder="Minh"></label></div><div class="p2-row wrap" style="margin-top:7px"><label class="p2-field"><span>Mật khẩu tạm</span><input class="p2-input" id="p2NewPass" type="password" value="0000"></label><label class="p2-field"><span>Avatar</span><select class="p2-select" id="p2NewAvatar">'+opts+'</select></label></div><div class="p2-row" style="margin-top:8px"><button class="p2-primary" data-p2-action="create-member">Tạo & chọn</button></div></div>';
}
function ensureRoleCounts(){
 const n=st.selectedMembers.length;if(!n)return;
 let total=Object.values(st.roleCounts||{}).reduce((a,b)=>a+(Number(b)||0),0);
 if(total)return;
 const favorites=starred('cards'),source=favorites.length?favorites:cache.catalog.cards.filter(c=>!pref('cards',c.id).hidden);
 st.roleCounts={};
 for(let i=0;i<n&&source.length;i++)st.roleCounts[source[i%source.length].id]=(st.roleCounts[source[i%source.length].id]||0)+1;
 save();
}
function renderGame(){
 ensureRoleCounts();
 const cards=[...cache.catalog.cards].filter(c=>!pref('cards',c.id).hidden).sort((a,b)=>(pref('cards',a.id).starred?-1:1)-(pref('cards',b.id).starred?-1:1)||String(a.name).localeCompare(String(b.name),'vi'));
 const total=Object.values(st.roleCounts).reduce((a,b)=>a+(Number(b)||0),0),needed=st.selectedMembers.length;
 let html=title('Chọn Ván','Thiết lập Vai Trò và Artifact cho '+needed+' Thành Viên');
 html+='<div class="p2-panel"><label class="p2-field"><span>Tên ván</span><input class="p2-input" id="p2GameName" value="'+esc(st.gameName)+'"></label><div class="p2-row between" style="margin-top:9px"><b>Vai Trò <span class="'+(total>=needed?'p2-ok':'')+'">'+total+'/'+needed+'</span></b><button class="p2-mini" data-p2-action="auto-fill-roles">Tự cân bằng</button></div><div class="p2-role-grid" style="margin-top:7px">';
 for(const c of cards){
  const count=Number(st.roleCounts[c.id]||0);
  html+='<div class="p2-role-row"><div><b>'+(pref('cards',c.id).starred?'★ ':'')+esc(c.name)+'</b><small>'+esc(factionLabel(c.factionId))+'</small></div><div class="p2-counter"><button data-role-delta="-1" data-role-id="'+esc(c.id)+'">−</button><output>'+count+'</output><button data-role-delta="1" data-role-id="'+esc(c.id)+'">＋</button></div></div>';
 }
 html+='</div></div>';
 html+='<div class="p2-panel"><div class="p2-toggle"><div><b>Artifact</b><div class="p2-muted">Mặc định tắt • dùng ★ Thường Dùng mới nhất</div></div><button class="p2-switch '+(st.artifactEnabled?'on':'')+'" data-p2-action="artifact-toggle" aria-label="Bật tắt Artifact"></button></div>';
 if(st.artifactEnabled)html+='<div class="p2-row between" style="margin-top:10px"><span class="p2-muted">Giới hạn toàn bộ người chơi trong 1 chu kỳ Ngày–Đêm</span><b>3 Artifact</b></div><div class="p2-warning" style="margin-top:7px">Mỗi người tối đa 1 Artifact. Nếu số loại ★ ít hơn số người, hệ thống được phép phát trùng; nếu nhiều hơn, chọn ngẫu nhiên đủ số người.</div>';
 html+='<div class="p2-footer"><button class="p2-secondary" data-p2-action="back-members">‹ Thành Viên</button><button class="p2-primary" data-p2-action="game-next" '+(total<needed?'disabled':'')+'>Phân Vai ›</button></div></div>';
 return html;
}
function expandedRoles(){
 const out=[];for(const c of cache.catalog.cards){for(let i=0;i<Number(st.roleCounts[c.id]||0);i++)out.push(c.id)}return out;
}
function generateAssignments(){
 const members=selectedMemberRows();const roles=shuffle(expandedRoles());if(!members.length||roles.length<members.length)return false;
 st.assignments=members.map((m,i)=>({loginId:m.loginId,displayName:m.displayName||m.loginId,roleIds:[roles[i]]}));
 if(st.multiRole&&roles.length>members.length){for(let i=members.length;i<roles.length;i++)st.assignments[i%members.length].roleIds.push(roles[i])}
 generateArtifacts();st.swapLogin='';save();return true;
}
function generateArtifacts(){
 st.artifactAssignments=[];if(!st.artifactEnabled)return;
 const pool=starred('artifacts');const members=selectedMemberRows();if(!pool.length)return;
 const shuffled=shuffle(pool);
 if(shuffled.length>=members.length){st.artifactAssignments=members.map((m,i)=>({loginId:m.loginId,artifactId:shuffled[i].id}))}
 else{st.artifactAssignments=members.map(m=>({loginId:m.loginId,artifactId:pool[Math.floor(Math.random()*pool.length)].id}))}
}
function roleById(id){return cache.catalog.cards.find(x=>x.id===id)}
function artifactById(id){return cache.catalog.artifacts.find(x=>x.id===id)}
function artifactFor(login){return st.artifactAssignments.find(x=>x.loginId===login)}
function assignmentFor(login){return st.assignments.find(x=>x.loginId===login)}
function renderAssign(){
 if(!st.assignments.length)generateAssignments();
 let html=title('Phân Vai','Ngẫu nhiên, thủ công hoặc kết hợp • chạm hai người để đổi Vai Trò');
 html+='<div class="p2-panel"><div class="p2-row wrap"><button class="p2-chip on" data-p2-action="reroll-all">↻ Phân lại toàn bộ</button><button class="p2-chip" data-p2-action="reroll-artifacts">✦ Phân lại Artifact</button><button class="p2-chip '+(st.multiRole?'on':'')+'" data-p2-action="multi-toggle">Đa Vai Trò '+(st.multiRole?'BẬT':'TẮT')+'</button></div>';
 if(st.swapLogin)html+='<div class="p2-warning" style="margin-top:8px">Đã chọn '+esc(assignmentFor(st.swapLogin)?.displayName||st.swapLogin)+'. Chạm người thứ hai để đổi Vai Trò.</div>';
 html+='<div class="p2-assignment-list" style="margin-top:9px">';
 const roleOptions=cache.catalog.cards.filter(c=>!pref('cards',c.id).hidden);
 const artOptions=starred('artifacts');
 for(const a of st.assignments){
  const primary=a.roleIds[0],af=artifactFor(a.loginId);
  html+='<div class="p2-assignment"><button class="p2-assignment-name p2-secondary" data-p2-swap="'+esc(a.loginId)+'"><b>'+esc(a.displayName)+'</b><small>'+(st.swapLogin===a.loginId?'Đang chọn để đổi':'Chạm để đổi Vai Trò')+'</small></button><div><select class="p2-select" data-p2-role-select="'+esc(a.loginId)+'">'+roleOptions.map(r=>'<option value="'+esc(r.id)+'" '+(r.id===primary?'selected':'')+'>'+esc(r.name)+'</option>').join('')+'</select>';
  if(st.artifactEnabled)html+='<select class="p2-select" style="margin-top:5px" data-p2-art-select="'+esc(a.loginId)+'"><option value="">— Không Artifact —</option>'+artOptions.map(x=>'<option value="'+esc(x.id)+'" '+(af?.artifactId===x.id?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select>';
  html+='</div></div>';
 }
 html+='</div></div>';
 html+='<div class="p2-panel"><b>Xem trước thẻ hai lớp</b><div class="p2-muted">Vai Trò hiển thị trước; Artifact là lớp thứ hai. GM có thể chạm lá dưới để đưa lên trên.</div><div class="p2-row wrap" style="margin-top:8px">';
 for(const a of st.assignments.slice(0,4))html+=cardFanHtml(a.loginId);
 html+='</div><div class="p2-footer"><button class="p2-secondary" data-p2-action="back-game">‹ Chọn Ván</button><button class="p2-primary" data-p2-action="assign-next">Phát Vai ›</button></div></div>';
 return html;
}
function cardFanHtml(login){
 const a=assignmentFor(login),role=roleById(a?.roleIds?.[0]),art=artifactById(artifactFor(login)?.artifactId);
 return '<div class="p2-cardfan" data-p2-fan="'+esc(login)+'">'+
 (role?'<button class="p2-card role front" data-p2-card="role"><img data-p2-art-kind="cards" data-p2-art-id="'+esc(role.id)+'" alt=""><b>'+esc(role.name)+'</b><em>Vai Trò</em></button>':'')+
 (art?'<button class="p2-card artifact" data-p2-card="artifact"><img data-p2-art-kind="artifacts" data-p2-art-id="'+esc(art.id)+'" alt=""><b>'+esc(art.name)+'</b><em>Artifact</em></button>':'')+'</div>';
}
function joinedSet(){
 const rows=cache.roomState?.players||[];return new Set(rows.map(p=>String(p.loginId||'')).filter(Boolean));
}
function deliveryProgress(){
 if(st.mode==='offline')return {ready:st.selectedMembers.every(x=>st.offlineViewed[x]),viewed:new Set(Object.keys(st.offlineViewed).filter(x=>st.offlineViewed[x])),joined:new Set(st.selectedMembers)};
 const joined=joinedSet(),assign=cache.roomState?.assignments||[],viewed=new Set();
 for(const login of st.selectedMembers){const rr=assign.filter(x=>String(x.loginId)===login);if(rr.length&&rr.every(x=>x.viewedAt))viewed.add(login)}
 return {ready:st.delivered&&st.selectedMembers.every(x=>viewed.has(x)),viewed,joined};
}
function renderDelivery(){
 const p=deliveryProgress(),allJoined=st.mode==='offline'||st.selectedMembers.every(x=>p.joined.has(x));
 let html=title('Phát Vai','Chỉ xuất hiện thao tác bắt đầu khi dữ liệu và xác nhận hợp lệ');
 if(st.mode==='online'&&!allJoined)html+='<div class="p2-warning">Một số Thành Viên chưa vào Phòng Online. Họ phải vào đúng phòng trước khi máy chủ có thể phát Vai Trò.</div>';
 html+='<div class="p2-panel"><div class="p2-delivery-grid">';
 for(const m of selectedMemberRows()){
  let state='Chưa gửi',cls='';if(st.delivered)state='Đã gửi';if(p.viewed.has(m.loginId)){state='Đã xem Vai Trò';cls='ok'}else if(st.mode==='online'&&!p.joined.has(m.loginId)){state='Chờ vào phòng';cls='wait'}
  html+='<div class="p2-delivery"><div><strong>'+esc(m.displayName||m.loginId)+'</strong><small>'+esc(roleById(assignmentFor(m.loginId)?.roleIds?.[0])?.name||'Chưa phân')+(artifactFor(m.loginId)?.artifactId?' • '+esc(artifactById(artifactFor(m.loginId).artifactId)?.name||'Artifact'):'')+'</small></div>'+(st.mode==='offline'&&st.delivered&&!p.viewed.has(m.loginId)?'<button class="p2-mini" data-p2-viewed="'+esc(m.loginId)+'">Đã xem</button>':'<span class="p2-delivery-state '+cls+'">'+state+'</span>')+'</div>';
 }
 html+='</div><div class="p2-footer"><button class="p2-secondary" data-p2-action="back-assign">‹ Phân Vai</button>';
 if(!st.delivered)html+='<button class="p2-primary" data-p2-action="publish-roles" '+(!allJoined?'disabled':'')+'>Phát Vai Trò</button>';
 else html+='<button class="p2-primary" data-p2-action="start-game" '+(!p.ready?'disabled':'')+'>Bắt đầu Đêm 1</button>';
 html+='</div></div>';
 return html;
}
function playerPositions(){
 const members=selectedMemberRows(),n=Math.max(1,members.length);return members.map((m,i)=>{const angle=-Math.PI/2+(Math.PI*2*i/n),rx=40,ry=34,x=50+Math.cos(angle)*rx,y=48+Math.sin(angle)*ry;return {m,x,y}});
}
function currentCallout(){
 if(st.phase==='day')return 'Ban ngày • theo dõi thảo luận, bỏ phiếu và các Hiệu Ứng đang có.';
 if(st.night===1&&st.playStep==='wolf')return '🐺 Bầy Sói ơi dậy đi nhìn mặt nhau.';
 if(st.night===1&&st.playStep==='early'){const n=EARLY_ARTIFACTS[st.earlyIndex];return '✦ Gọi sử dụng đầu ván: '+(n||'Artifact')+'. Có thể bỏ qua và giữ quyền dùng ở lượt chính.'}
 if(st.playStep==='summary')return 'Tổng kết Đêm '+st.night+' • chỉ hiển thị danh sách người chết trước khi chuyển sang Ngày.';
 const q=nightQueue(),r=q[st.roleTurn];return r?('🌙 '+r.name+' thức dậy • GM điều khiển, Player Web chỉ thao tác khi chức năng yêu cầu.'):'Hoàn tất các lượt ban đêm.';
}
function nightQueue(){
 const seen=new Set(),out=[];
 for(const a of st.assignments){for(const id of a.roleIds||[]){if(seen.has(id))continue;seen.add(id);const r=roleById(id);if(r?.flags?.useNight||r?.functions?.some(f=>f.phase==='night'))out.push(r)}}
 return out.sort((a,b)=>{const A=Math.min(...(a.functions||[]).map(f=>Number(f.order||999)).concat([999])),B=Math.min(...(b.functions||[]).map(f=>Number(f.order||999)).concat([999]));return A-B||String(a.name).localeCompare(String(b.name),'vi')});
}
function activeDeaths(){
 const effects=cache.roomState?.activeEffects||[];const dead=new Set(effects.filter(x=>x.type==='dead').map(x=>x.loginId));return dead;
}
function renderArena(){
 const dead=activeDeaths();
 let h='<div class="p2-arena"><div class="p2-avatar-ring">';
 for(const o of playerPositions())h+='<div class="p2-avatar '+(dead.has(o.m.loginId)?'dead':'')+'" style="left:'+o.x+'vw;top:'+o.y+'px;transform:translate(-50%,-50%)"><div class="p2-avatar-dot">♟</div><b>'+esc(o.m.displayName||o.m.loginId)+'</b>'+(dead.has(o.m.loginId)?'<i>💀</i>':'')+'</div>';
 h+='</div><div class="p2-callout">'+esc(currentCallout())+'</div></div>';return h;
}
function renderPlay(){
 let html=title(st.phase==='day'?'Ngày '+st.night:'Đêm '+st.night,roomStatusText()+' • '+selectedMemberRows().length+' người chơi');
 html+=renderArena();
 html+='<div class="p2-panel"><div class="p2-row between"><div class="p2-artifact-meter"><b>Artifact</b><span>'+st.artifactUsed+'/3</span><div class="p2-orbs">'+[0,1,2].map(i=>'<span class="p2-use-orb '+(i<st.artifactUsed?'used':'')+'"></span>').join('')+'</div></div><button class="p2-mini" data-p2-action="artifact-use" '+(st.artifactUsed>=3?'disabled':'')+'>＋ Ghi nhận dùng</button></div>';
 if(st.phase==='night'){
  const q=nightQueue();html+='<div class="p2-queue" style="margin-top:9px">';
  if(st.night===1)html+='<div class="p2-queue-row '+(st.playStep==='wolf'?'current':'')+'"><span class="p2-order">0</span><div><b>Bầy Sói nhìn mặt nhau</b><small>Chỉ Đêm 1 • gọi một lần trong cả ván</small></div><span>🐺</span></div>';
  if(st.night===1)EARLY_ARTIFACTS.forEach((n,i)=>{html+='<div class="p2-queue-row '+(st.playStep==='early'&&st.earlyIndex===i?'current':'')+'"><span class="p2-order">'+(i+1)+'</span><div><b>'+esc(n)+'</b><small>Gọi sử dụng đầu ván</small></div><span>✦</span></div>'});
  q.forEach((r,i)=>{html+='<div class="p2-queue-row '+(st.playStep==='normal'&&st.roleTurn===i?'current':'')+'"><span class="p2-order">'+(i+1+(st.night===1?5:0))+'</span><div><b>'+esc(r.name)+'</b><small>'+esc(factionLabel(r.factionId))+'</small></div><span>🌙</span></div>'});
  html+='</div>';
  if(st.playStep==='summary'){const deaths=[...activeDeaths()];html+='<div class="p2-warning" style="margin-top:8px">'+(deaths.length?('Người chết: '+deaths.map(x=>selectedMemberRows().find(m=>m.loginId===x)?.displayName||x).join(', ')):'Không ghi nhận người chết trong dữ liệu máy chủ.')+'</div>'}
 }else{
  const deaths=[...activeDeaths()];html+='<div style="margin-top:8px"><b>Danh sách người chết</b><div class="p2-muted">'+(deaths.length?deaths.map(x=>selectedMemberRows().find(m=>m.loginId===x)?.displayName||x).join(' • '):'Chưa có')+'</div></div>';
 }
 html+='<div class="p2-footer"><button class="p2-secondary" title="Quay về" data-p2-action="play-back">‹</button><button class="p2-danger" title="Kết thúc ván" data-p2-action="end-game">🏁</button>';
 if(st.phase==='night')html+='<button class="p2-primary" data-p2-action="advance-night">'+(st.playStep==='summary'?'Chuyển sang Ngày':'Tiếp tục ›')+'</button>';
 else html+='<button class="p2-primary" data-p2-action="next-night">Đêm tiếp theo ›</button>';
 html+='</div></div>';
 return html;
}
function renderWaiting(){
 let html=title('Phòng Chờ','Ván đã kết thúc • giữ nguyên phòng và danh sách tham dự');
 html+='<div class="p2-panel"><div class="p2-row between"><div><b>'+esc(roomName())+'</b><div class="p2-muted">'+esc(roomCode()||'Offline')+' • '+esc(st.mode.toUpperCase())+'</div></div><span class="p2-status">SẴN SÀNG</span></div><div class="p2-delivery-grid" style="margin-top:9px">';
 for(const m of selectedMemberRows())html+='<div class="p2-delivery"><strong>'+esc(m.displayName||m.loginId)+'</strong><span class="p2-delivery-state ok">Sẵn sàng</span></div>';
 html+='</div><div class="p2-footer"><button class="p2-secondary" data-p2-action="rooms-home">Danh sách phòng</button><button class="p2-primary" data-p2-action="new-match">Chuẩn bị ván mới</button></div></div>';
 return html;
}
async function hydrateArt(){
 const b=bridge();if(!b)return;
 const imgs=[...root.querySelectorAll('[data-p2-art-kind][data-p2-art-id]')];
 for(const im of imgs){try{im.src=await b.artwork(im.dataset.p2ArtKind,im.dataset.p2ArtId,'thumb')}catch(_){}}
}
async function refreshRooms(force=false){
 if(!bridge()||(!force&&Date.now()-cache.roomsAt<2500))return;
 try{cache.rooms=await bridge().listRooms();cache.roomsAt=Date.now();if(st.screen==='rooms')render()}catch(e){toast('Không tải được danh sách phòng: '+e.message)}
}
async function refreshMembers(force=false){
 if(!bridge()||(!force&&Date.now()-cache.membersAt<2500))return;
 try{cache.members=await bridge().listMembers();cache.membersAt=Date.now();if(st.screen==='members'||st.screen==='assign'||st.screen==='delivery'||st.screen==='play'||st.screen==='waiting')render()}catch(e){toast('Không tải được Thành Viên: '+e.message)}
}
async function refreshAvatars(){try{cache.avatars=await bridge().listAvatars();if(st.screen==='members')render()}catch(_){}}
async function refreshRoomState(){
 if(st.mode!=='online'||!roomCode())return;
 try{cache.roomState=await bridge().roomState(roomCode());const room=cache.roomState?.room;if(room)st.room=Object.assign({},st.room||{},room);save();if(st.screen==='delivery'||st.screen==='play')render()}catch(e){console.warn('2D room sync',e)}
}
async function createRoom(){
 const name=$('#p2RoomName')?.value.trim()||'Phòng Biển';st.roomDraftName=name;
 try{
  if(st.mode==='online'){
   const d=await bridge().createRoom({roomName:name,gameConfig:{id:'play2d-draft',name:'Chưa chọn ván',playerCount:0,roles:[],artifacts:[]}});
   st.room={code:d.roomCode,roomCode:d.roomCode,roomName:d.roomName||name,phase:'lobby',status:'waiting'};
  }else st.room={code:'OFF-'+Math.random().toString(36).slice(2,7).toUpperCase(),roomName:name,phase:'lobby',status:'waiting',offline:true};
  st.openCreate=false;st.selectedMembers=[];st.screen='members';st.roleCounts={};st.assignments=[];st.artifactAssignments=[];st.delivered=false;save();await refreshMembers(true);if(!cache.avatars.length)refreshAvatars();render()
 }catch(e){toast('Không tạo được phòng: '+e.message)}
}
async function openRoom(code){
 const r=cache.rooms.find(x=>String(x.code||x.roomCode)===code);if(!r)return;
 st.mode='online';st.room=clone(r);st.selectedRoomCode=code;st.openCreate=false;
 try{cache.roomState=await bridge().roomState(code);const phase=String(cache.roomState?.room?.phase||r.phase||'lobby').toLowerCase();st.room=Object.assign({},st.room,cache.roomState.room||{});
  if(['running','started','game','playing'].includes(phase))st.screen='play';else if(phase==='role_delivery')st.screen='delivery';else if(phase==='ended')st.screen='waiting';else st.screen='members';
  const players=cache.roomState?.players||[];if(players.length)st.selectedMembers=players.map(p=>p.loginId).filter(Boolean);
  save();await refreshMembers(true);render();
 }catch(e){toast('Không mở được phòng: '+e.message)}
}
function autoFillRoles(){
 const n=st.selectedMembers.length,source=starred('cards').length?starred('cards'):cache.catalog.cards.filter(c=>!pref('cards',c.id).hidden);st.roleCounts={};
 for(let i=0;i<n&&source.length;i++)st.roleCounts[source[i%source.length].id]=(st.roleCounts[source[i%source.length].id]||0)+1;save();render();
}
function validateDistinctNames(nextLogin){
 const rows=cache.members.filter(m=>st.selectedMembers.includes(m.loginId)||m.loginId===nextLogin),seen=new Set();
 for(const m of rows){const k=norm(m.displayName||m.loginId);if(seen.has(k))return false;seen.add(k)}return true;
}
async function publishRoles(){
 if(st.mode==='offline'){st.delivered=true;st.deliveryVersion++;st.offlineViewed={};save();render();return}
 try{
  await refreshRoomState();const joined=joinedSet();if(!st.selectedMembers.every(x=>joined.has(x))){toast('Còn Thành Viên chưa vào phòng.');return}
  const latest=starred('artifacts'),latestIds=new Set(latest.map(x=>x.id));
  if(st.artifactEnabled&&latest.length){
   for(const m of selectedMemberRows()){let row=artifactFor(m.loginId);if(!row){row={loginId:m.loginId,artifactId:latest[Math.floor(Math.random()*latest.length)].id};st.artifactAssignments.push(row)}else if(!latestIds.has(row.artifactId))row.artifactId=latest[Math.floor(Math.random()*latest.length)].id}
  }
  st.matchId=st.matchId||('match-'+randomId());st.deliveryVersion++;
  const roles=Object.entries(st.roleCounts).filter(([,n])=>Number(n)>0).map(([id,count],i)=>{const r=roleById(id);return {roleId:id,roleName:r?.name||id,faction:factionLabel(r?.factionId),description:r?.information||'',count:Number(count),order:i}});
  await bridge().roomAction(roomCode(),'config',{matchId:st.matchId,matchRevision:1,gameConfig:{id:'gmww-play2d',name:st.gameName,playerCount:st.selectedMembers.length,roles,artifacts:st.artifactEnabled?st.artifactAssignments.map((x,i)=>({artifactId:x.artifactId,order:i})):[]}});
  const uniqueRoleIds=[...new Set(st.assignments.flatMap(x=>x.roleIds||[]))];
  await bridge().roomAction(roomCode(),'role-assets',{roles:uniqueRoleIds.map(id=>{const r=roleById(id);return {roleId:id,name:r?.name||id,faction:factionLabel(r?.factionId),information:r?.information||'',objective:r?.winCondition||'',limits:r?.limits||'',actions:(r?.functions||[]).map(fn=>({id:fn.actionId,name:fn.description||fn.actionId,description:fn.description||'',limits:fn.usageMode||null}))}})});
  const rows=[];for(const a of st.assignments){for(const id of a.roleIds||[]){const r=roleById(id);rows.push({loginId:a.loginId,roleId:id,roleName:r?.name||id,faction:factionLabel(r?.factionId),description:r?.information||'',roleCard:{name:r?.name||id,faction:factionLabel(r?.factionId),information:r?.information||'',objective:r?.winCondition||'',limits:r?.limits||'',actions:(r?.functions||[]).map(fn=>({id:fn.actionId,name:fn.description||fn.actionId,description:fn.description||''}))}})}}
  await bridge().roomAction(roomCode(),'assignments',{assignments:rows,multiAssign:st.multiRole,matchId:st.matchId,matchRevision:1,deliveryVersion:st.deliveryVersion});
  st.delivered=true;save();await refreshRoomState();render();toast('Đã phát Vai Trò.');
 }catch(e){toast('Phát Vai thất bại: '+e.message)}
}
async function startGame(){
 const p=deliveryProgress();if(!p.ready){toast('Chưa đủ xác nhận xem Vai Trò.');return}
 try{if(st.mode==='online')await bridge().roomAction(roomCode(),'start',{matchId:st.matchId,matchRevision:1,deliveryVersion:st.deliveryVersion});
  st.screen='play';st.phase='night';st.night=1;st.playStep='wolf';st.earlyIndex=0;st.roleTurn=0;st.artifactUsed=0;st.room=Object.assign({},st.room,{phase:'running',status:'running'});save();
  if(st.mode==='online')await bridge().roomAction(roomCode(),'cycle',{phase:'night',night:1,cycleKey:'night-1'}).catch(()=>{});
  render();
 }catch(e){toast('Không bắt đầu được ván: '+e.message)}
}
function nextRelevantEarly(from){
 for(let i=from;i<EARLY_ARTIFACTS.length;i++){const wanted=norm(EARLY_ARTIFACTS[i]);if(st.artifactAssignments.some(x=>norm(artifactById(x.artifactId)?.name)===wanted))return i}
 return -1;
}
async function advanceNight(){
 if(st.playStep==='wolf'){const i=nextRelevantEarly(0);if(i>=0){st.playStep='early';st.earlyIndex=i}else{st.playStep='normal';st.roleTurn=0}}
 else if(st.playStep==='early'){const i=nextRelevantEarly(st.earlyIndex+1);if(i>=0)st.earlyIndex=i;else{st.playStep='normal';st.roleTurn=0}}
 else if(st.playStep==='normal'){const q=nightQueue();if(st.roleTurn<q.length-1)st.roleTurn++;else st.playStep='summary'}
 else if(st.playStep==='summary'){st.phase='day';if(st.mode==='online')await bridge().roomAction(roomCode(),'cycle',{phase:'day',night:st.night,cycleKey:'day-'+st.night}).catch(()=>{})}
 save();render();
}
async function nextNight(){
 st.night++;st.phase='night';st.playStep='normal';st.roleTurn=0;st.artifactUsed=0;save();
 if(st.mode==='online')await bridge().roomAction(roomCode(),'cycle',{phase:'night',night:st.night,cycleKey:'night-'+st.night}).catch(()=>{});
 render();
}
async function endGame(){
 if(!confirm('Kết thúc ván và đưa tất cả người chơi về Phòng Chờ?'))return;
 try{
  if(st.mode==='online'){
   const r=await bridge().roomAction(roomCode(),'end',{matchId:st.matchId,matchRevision:1,winnerFaction:st.winnerFaction,winnerLabel:factionLabel(st.winnerFaction)});
   await bridge().roomAction(roomCode(),'reset',{postGame:true,preserveParticipants:true,transactionId:'postgame-'+randomId(),expectedResetVersion:Number(r?.room?.resetVersion||0)}).catch(async()=>bridge().roomAction(roomCode(),'reset',{postGame:true,preserveParticipants:true,transactionId:'postgame-'+randomId()}));
  }
  st.screen='waiting';st.phase='day';st.room=Object.assign({},st.room,{phase:'lobby',status:'waiting'});st.delivered=false;st.offlineViewed={};save();render();
 }catch(e){toast('Không kết thúc được ván: '+e.message)}
}
function bindEvents(){
 root.onclick=async e=>{
  const mode=e.target.closest('[data-p2-mode]');if(mode){st.mode=mode.dataset.p2Mode;save();render();return}
  const room=e.target.closest('[data-p2-room]');if(room){const code=room.dataset.p2Room,now=Date.now();if(roomTap.code===code&&now-roomTap.at<900){roomTap={code:'',at:0};await openRoom(code)}else{roomTap={code,at:now};st.selectedRoomCode=code;save();render()}return}
  const member=e.target.closest('[data-p2-member]');if(member){const login=member.dataset.p2Member,idx=st.selectedMembers.indexOf(login);if(idx>=0)st.selectedMembers.splice(idx,1);else{if(!validateDistinctNames(login)){toast('Không thể chọn hai Thành Viên trùng tên.');return}st.selectedMembers.push(login)}save();render();return}
  const d=e.target.closest('[data-role-delta]');if(d){const id=d.dataset.roleId,delta=Number(d.dataset.roleDelta);st.roleCounts[id]=Math.max(0,Number(st.roleCounts[id]||0)+delta);save();render();return}
  const swap=e.target.closest('[data-p2-swap]');if(swap){const login=swap.dataset.p2Swap;if(!st.swapLogin)st.swapLogin=login;else if(st.swapLogin===login)st.swapLogin='';else{const a=assignmentFor(st.swapLogin),b=assignmentFor(login);if(a&&b)[a.roleIds,b.roleIds]=[b.roleIds,a.roleIds];st.swapLogin=''}save();render();return}
  const card=e.target.closest('[data-p2-card]');if(card){const fan=card.closest('.p2-cardfan');fan?.querySelectorAll('.p2-card').forEach(x=>x.classList.remove('front'));card.classList.add('front');return}
  const viewed=e.target.closest('[data-p2-viewed]');if(viewed){st.offlineViewed[viewed.dataset.p2Viewed]=true;save();render();return}
  const act=e.target.closest('[data-p2-action]')?.dataset.p2Action;if(!act)return;
  if(act==='refresh'){if(st.screen==='rooms')await refreshRooms(true);else if(st.screen==='members')await refreshMembers(true);else await refreshRoomState();return}
  if(act==='toggle-create'){st.openCreate=!st.openCreate;save();render();return}
  if(act==='create-room'){await createRoom();return}
  if(act==='back-rooms'){st.screen='rooms';save();render();return}
  if(act==='toggle-add-member'){st.addMemberOpen=!st.addMemberOpen;if(st.addMemberOpen&&!cache.avatars.length)refreshAvatars();save();render();return}
  if(act==='create-member'){await createInlineMember();return}
  if(act==='members-next'){st.screen='game';st.roleCounts={};save();render();return}
  if(act==='auto-fill-roles'){autoFillRoles();return}
  if(act==='artifact-toggle'){st.artifactEnabled=!st.artifactEnabled;if(!st.artifactEnabled)st.artifactAssignments=[];save();render();return}
  if(act==='back-members'){st.screen='members';save();render();return}
  if(act==='game-next'){st.gameName=$('#p2GameName')?.value.trim()||st.gameName;if(!generateAssignments()){toast('Số Vai Trò chưa đủ.');return}st.screen='assign';save();render();return}
  if(act==='reroll-all'){generateAssignments();render();return}
  if(act==='reroll-artifacts'){generateArtifacts();save();render();return}
  if(act==='multi-toggle'){st.multiRole=!st.multiRole;generateAssignments();save();render();return}
  if(act==='back-game'){st.screen='game';save();render();return}
  if(act==='assign-next'){st.screen='delivery';st.delivered=false;st.offlineViewed={};save();render();return}
  if(act==='back-assign'){st.screen='assign';save();render();return}
  if(act==='publish-roles'){await publishRoles();return}
  if(act==='start-game'){await startGame();return}
  if(act==='artifact-use'){if(st.artifactUsed<3){st.artifactUsed++;save();render()}return}
  if(act==='advance-night'){await advanceNight();return}
  if(act==='next-night'){await nextNight();return}
  if(act==='end-game'){await endGame();return}
  if(act==='play-back'){st.screen='delivery';save();render();return}
  if(act==='rooms-home'){st.screen='rooms';save();render();return}
  if(act==='new-match'){st.screen='game';st.roleCounts={};st.assignments=[];st.artifactAssignments=[];st.matchId='';st.delivered=false;save();render();return}
 };
 root.onchange=e=>{
  const rs=e.target.closest('[data-p2-role-select]');if(rs){const a=assignmentFor(rs.dataset.p2RoleSelect);if(a)a.roleIds[0]=rs.value;save();render();return}
  const as=e.target.closest('[data-p2-art-select]');if(as){let a=artifactFor(as.dataset.p2ArtSelect);if(!a){a={loginId:as.dataset.p2ArtSelect,artifactId:as.value};st.artifactAssignments.push(a)}else a.artifactId=as.value;save();render();return}
 };
 root.oninput=e=>{if(e.target.id==='p2RoomName')st.roomDraftName=e.target.value;if(e.target.id==='p2GameName')st.gameName=e.target.value;save()};
}
async function createInlineMember(){
 const login=$('#p2NewLogin')?.value.trim()||'',name=$('#p2NewName')?.value.trim()||'',password=$('#p2NewPass')?.value||'',avatarId=$('#p2NewAvatar')?.value||cache.avatars[0]?.id||'';
 if(login.length<4||name.length<2||password.length<4||!avatarId){toast('Nhập đủ Member ID, tên, mật khẩu và Avatar.');return}
 if(cache.members.some(m=>norm(m.displayName)===norm(name))){toast('Tên Thành Viên đã tồn tại.');return}
 try{await bridge().createMember({loginId:login,displayName:name,password,avatarId});await refreshMembers(true);if(!st.selectedMembers.includes(login))st.selectedMembers.push(login);st.addMemberOpen=false;save();render();toast('Đã tạo và chọn Thành Viên.')}catch(e){toast('Không tạo được Thành Viên: '+e.message)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
