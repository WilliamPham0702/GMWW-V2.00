(()=>{'use strict';

const STATE_KEY='GMWW_V205_STATE';
const PREF_KEY='GMWW_V205_PREFS';
const DB_NAME='GMWW_V205_THEME_ASSETS';
const DB_STORE='assets';

const DEFAULT_STATE={
  version:'2.05',
  cards:[{
    id:'role_old_witch',
    name:'Phù Thuỷ Già',
    factionId:'village',
    description:'Mỗi đêm bạn có thể Đuổi 1 người ra khỏi làng. Tất cả các tác động lên người đó đều không có tác dụng.\n\nHoặc bạn có thể Hồi Sinh 1 người bị chết từ ngày hoặc đêm hôm trước.\n\nMỗi đêm chỉ được chọn sử dụng 1 trong 2 chức năng: Đuổi hoặc Hồi Sinh.',
    audioId:'audio_role_old_witch',
    automatic:'none',
    abilities:[
      {id:'ability_old_witch_exile',actionId:'action_exile',phase:'night',usage:'eachNight',usageCount:1,targetCount:1,selfTarget:'no',targetPool:'aliveOther',effectTiming:'immediate',mutexGroup:'nightChoice',allowConsecutive:'yes'},
      {id:'ability_old_witch_revive',actionId:'action_revive',phase:'night',usage:'onceGame',usageCount:1,targetCount:1,selfTarget:'no',targetPool:'deadPreviousCycle',effectTiming:'immediate',mutexGroup:'nightChoice',allowConsecutive:'yes'}
    ],
    mutexMode:'one-per-phase',
    mutexScope:'night'
  }],
  artifacts:[],
  actions:{
    role:[
      {id:'action_exile',name:'Đuổi',effectIds:['effect_exile'],audioId:'audio_action_exile'},
      {id:'action_revive',name:'Hồi Sinh',effectIds:['effect_revive'],audioId:'audio_action_revive'}
    ],
    artifact:[]
  },
  effects:[
    {id:'effect_exile',name:'Đuổi',primitive:'EXPEL',duration:'untilNextMorning'},
    {id:'effect_revive',name:'Hồi Sinh',primitive:'REVIVE',duration:'instant'}
  ],
  audio:[
    {id:'audio_role_old_witch',name:'Phù Thuỷ Già',scope:'card',fileName:'',status:'Chưa gắn file'},
    {id:'audio_action_exile',name:'Đuổi',scope:'action',fileName:'duoi_nguoi.mp3',status:'Theo mapping Server Gốc'},
    {id:'audio_action_revive',name:'Hồi Sinh',scope:'action',fileName:'hoi_sinh.mp3',status:'Theo mapping Server Gốc'}
  ],
  themes:{
    activeId:'theme-sea',
    selectedEditorId:'theme-sea',
    list:[
      {id:'theme-default',name:'Mặc định',builtin:true,locked:true,mappings:{}},
      {id:'theme-sea',name:'Biển',builtin:true,locked:false,mappings:{role_old_witch:{displayUrl:'',thumbUrl:''}}}
    ]
  }
};

const DEFAULT_PREFS={cards:{role_old_witch:{starred:true,starOrder:1,hidden:false}}};

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const clone=v=>JSON.parse(JSON.stringify(v));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=p=>p+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);

function loadState(){
  try{
    const raw=JSON.parse(localStorage.getItem(STATE_KEY)||'null');
    if(!raw)return clone(DEFAULT_STATE);
    return mergeState(raw);
  }catch(_){return clone(DEFAULT_STATE)}
}
function mergeState(raw){
  const s=clone(DEFAULT_STATE);
  if(Array.isArray(raw.cards))s.cards=raw.cards;
  if(Array.isArray(raw.artifacts))s.artifacts=raw.artifacts;
  if(raw.actions&&Array.isArray(raw.actions.role)&&Array.isArray(raw.actions.artifact))s.actions=raw.actions;
  if(Array.isArray(raw.effects))s.effects=raw.effects;
  if(Array.isArray(raw.audio))s.audio=raw.audio;
  if(raw.themes&&Array.isArray(raw.themes.list))s.themes=raw.themes;
  return s;
}
function loadPrefs(){
  try{
    const raw=JSON.parse(localStorage.getItem(PREF_KEY)||'null');
    return raw&&raw.cards?raw:clone(DEFAULT_PREFS);
  }catch(_){return clone(DEFAULT_PREFS)}
}
let state=loadState();
let prefs=loadPrefs();
let cardFilter='all';
let actionKind='role';
let currentCardId='role_old_witch';
let editContext=null;
let lastTouchMap=new WeakMap();
let defaultThumb='';
let objectUrls=new Map();
let pendingThemeFiles={display:null,thumb:null};

function saveState(){localStorage.setItem(STATE_KEY,JSON.stringify(state))}
function savePrefs(){localStorage.setItem(PREF_KEY,JSON.stringify(prefs))}
function cardById(id){return state.cards.find(x=>x.id===id)||null}
function actionById(id){return [...state.actions.role,...state.actions.artifact].find(x=>x.id===id)||null}
function effectById(id){return state.effects.find(x=>x.id===id)||null}
function audioById(id){return state.audio.find(x=>x.id===id)||null}
function themeById(id){return state.themes.list.find(x=>x.id===id)||state.themes.list[0]}
function prefFor(id){prefs.cards[id]=prefs.cards[id]||{starred:false,starOrder:null,hidden:false};return prefs.cards[id]}

function factionMeta(id){
  if(id==='wolf')return{label:'Phe Sói',icon:'🐾',cls:'wolf'};
  if(id==='third')return{label:'Phe Ba',icon:'🔥',cls:'third'};
  return{label:'Phe Dân Làng',icon:'🍃',cls:'village'};
}
function phaseLabel(v){return({night:'Ban đêm',day:'Ban ngày',both:'Cả ngày và đêm'})[v]||v}
function usageLabel(v,n){
  if(v==='onceGame')return'1 lần / suốt ván';
  if(v==='nGame')return String(n||1)+' lần / ván';
  if(v==='continuous')return'Dùng liên tục';
  if(v==='eachDay')return'Mỗi ngày';
  return'Mỗi đêm';
}
function targetPoolLabel(v){
  return({aliveOther:'Người đang sống',alive:'Người đang sống',dead:'Người đã chết',deadPreviousCycle:'Người chết ngày/đêm hôm trước',any:'Bất kỳ người chơi',wolf:'Phe Sói'})[v]||v;
}
function durationLabel(v){
  return({instant:'Tức thời',night:'Đêm đó',untilNextMorning:'Đến hết sáng hôm sau',untilRemoved:'Đến khi được gỡ'})[v]||v;
}

function openDb(){
  return new Promise((resolve,reject)=>{
    const q=indexedDB.open(DB_NAME,1);
    q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(DB_STORE))q.result.createObjectStore(DB_STORE,{keyPath:'key'})};
    q.onsuccess=()=>resolve(q.result);
    q.onerror=()=>reject(q.error);
  });
}
async function dbPut(key,blob){
  const db=await openDb();
  await new Promise((resolve,reject)=>{
    const tx=db.transaction(DB_STORE,'readwrite');
    tx.objectStore(DB_STORE).put({key,blob,updatedAt:Date.now()});
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
  });
  db.close();
}
async function dbGet(key){
  const db=await openDb();
  const out=await new Promise((resolve,reject)=>{
    const tx=db.transaction(DB_STORE,'readonly');
    const q=tx.objectStore(DB_STORE).get(key);
    q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>reject(q.error);
  });
  db.close();return out;
}
async function dbDelete(key){
  const db=await openDb();
  await new Promise((resolve,reject)=>{
    const tx=db.transaction(DB_STORE,'readwrite');
    tx.objectStore(DB_STORE).delete(key);
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
  });
  db.close();
}
function blobKey(themeId,cardId,kind){return themeId+'|'+cardId+'|'+kind}

async function blobUrlFor(themeId,cardId,kind){
  const key=blobKey(themeId,cardId,kind);
  if(objectUrls.has(key))return objectUrls.get(key);
  try{
    const rec=await dbGet(key);
    if(rec&&rec.blob){
      const u=URL.createObjectURL(rec.blob);objectUrls.set(key,u);return u;
    }
  }catch(_){}
  return'';
}

function imageToThumb(src){
  return new Promise(resolve=>{
    const im=new Image();
    im.onload=()=>{
      const c=document.createElement('canvas');c.width=360;c.height=330;
      const g=c.getContext('2d');g.fillStyle='#071421';g.fillRect(0,0,360,330);
      const sw=im.naturalWidth||1024,sh=im.naturalHeight||936;
      const scale=Math.max(360/sw,330/sh),dw=sw*scale,dh=sh*scale,dx=(360-dw)/2,dy=(330-dh)/2;
      g.drawImage(im,dx,dy,dw,dh);
      resolve(c.toDataURL('image/webp',.8));
    };
    im.onerror=()=>resolve(src);im.src=src;
  });
}
async function ensureDefaultThumb(){
  if(defaultThumb)return defaultThumb;
  defaultThumb=await imageToThumb(window.GMWW205_DEFAULT_DISPLAY||'');
  return defaultThumb;
}
async function resolveArtwork(cardId,kind){
  const active=state.themes.activeId||'theme-sea';
  const t=themeById(active);
  if(active!=='theme-default'){
    const blobUrl=await blobUrlFor(active,cardId,kind);
    if(blobUrl)return blobUrl;
    const m=t?.mappings?.[cardId]||{};
    const u=String(kind==='thumb'?m.thumbUrl:m.displayUrl||'').trim();
    if(u)return u;
    if(kind==='thumb'){
      const displayBlob=await blobUrlFor(active,cardId,'display');
      if(displayBlob)return await imageToThumb(displayBlob);
      if(String(m.displayUrl||'').trim())return await imageToThumb(m.displayUrl.trim());
    }
  }
  if(kind==='thumb')return await ensureDefaultThumb();
  return window.GMWW205_DEFAULT_DISPLAY||'';
}
async function hasSeaOverride(cardId){
  const t=themeById('theme-sea'),m=t?.mappings?.[cardId]||{};
  if(String(m.displayUrl||'').trim()||String(m.thumbUrl||'').trim())return true;
  return !!(await dbGet(blobKey('theme-sea',cardId,'display'))||await dbGet(blobKey('theme-sea',cardId,'thumb')));
}

function renderCardGrid(){
  const grid=$('#cardGrid');if(!grid)return;
  const cards=state.cards.filter(c=>{
    const p=prefFor(c.id);
    if(cardFilter==='star')return p.starred&&!p.hidden;
    if(cardFilter==='hidden')return p.hidden;
    return true;
  }).sort((a,b)=>{
    const pa=prefFor(a.id),pb=prefFor(b.id);
    if(pa.starred!==pb.starred)return pa.starred?-1:1;
    return (pa.starOrder||9999)-(pb.starOrder||9999);
  });
  grid.innerHTML=cards.map(c=>{
    const p=prefFor(c.id),f=factionMeta(c.factionId);
    return '<article class="role-tile '+(p.hidden?'hidden-pref':'')+'" data-card-id="'+esc(c.id)+'">'+
      '<div class="tile-actions"><button class="star '+(p.starred?'on':'')+'" data-pref="star">'+(p.starred?'★':'☆')+'</button><button class="hide '+(p.hidden?'on':'')+'" data-pref="hide">'+(p.hidden?'◉':'◌')+'</button></div>'+
      '<img data-thumb-for="'+esc(c.id)+'" alt=""><h3>'+esc(c.name)+'</h3><small>'+f.icon+' '+esc(f.label)+(p.hidden?' • Tạm ẩn':'')+'</small></article>';
  }).join('')||'<div class="empty-card"><b>Không có Lá Bài phù hợp</b></div>';
  cards.forEach(async c=>{const im=$('[data-thumb-for="'+CSS.escape(c.id)+'"]');if(im)im.src=await resolveArtwork(c.id,'thumb')});
  $$('.role-tile').forEach(tile=>{
    tile.addEventListener('click',e=>{
      const id=tile.dataset.cardId;
      const pref=e.target.closest('[data-pref]');
      if(pref){
        e.stopPropagation();
        if(pref.dataset.pref==='star')toggleStar(id);else toggleHidden(id);
        return;
      }
      openCardEditor(id);
    });
  });
}
function toggleStar(id){
  const p=prefFor(id);
  if(p.starred){p.starred=false;p.starOrder=null}
  else{
    p.hidden=false;p.starred=true;
    const orders=Object.values(prefs.cards).filter(x=>x.starred).map(x=>Number(x.starOrder)||0);
    p.starOrder=Math.max(0,...orders)+1;
  }
  savePrefs();renderCardGrid();
}
function toggleHidden(id){
  const p=prefFor(id);p.hidden=!p.hidden;
  if(p.hidden){p.starred=false;p.starOrder=null}
  savePrefs();renderCardGrid();
}

function audioOptions(selected,scope){
  const rows=state.audio.filter(a=>!scope||a.scope===scope);
  return '<option value="">Không dùng</option>'+rows.map(a=>'<option value="'+esc(a.id)+'" '+(a.id===selected?'selected':'')+'>'+esc(a.name)+'</option>').join('');
}
function actionOptions(kind,selected){
  return (state.actions[kind]||[]).map(a=>'<option value="'+esc(a.id)+'" '+(a.id===selected?'selected':'')+'>'+esc(a.name)+'</option>').join('');
}
function selectOptions(items,selected){
  return items.map(x=>'<option value="'+esc(x[0])+'" '+(x[0]===selected?'selected':'')+'>'+esc(x[1])+'</option>').join('');
}
function abilityHtml(ab,index){
  return '<div class="ability" data-ability-index="'+index+'">'+
    '<div class="ability-head"><b>Chức năng '+(index+1)+'</b><button data-remove-ability="'+index+'">×</button></div>'+
    '<div class="ability-grid">'+
      '<label class="full">Hành Động<select data-a="actionId">'+actionOptions('role',ab.actionId)+'</select></label>'+
      '<label>Thời điểm dùng<select data-a="phase">'+selectOptions([['night','Ban đêm'],['day','Ban ngày'],['both','Cả ngày và đêm']],ab.phase)+'</select></label>'+
      '<label>Giới hạn dùng<select data-a="usage">'+selectOptions([['eachNight','Mỗi đêm'],['eachDay','Mỗi ngày'],['onceGame','1 lần / ván'],['nGame','N lần / ván'],['continuous','Dùng liên tục']],ab.usage)+'</select></label>'+
      '<label>Số lần N<select data-a="usageCount">'+selectOptions(Array.from({length:10},(_,i)=>[String(i+1),String(i+1)]),String(ab.usageCount||1))+'</select></label>'+
      '<label>Số mục tiêu<select data-a="targetCount">'+selectOptions(Array.from({length:6},(_,i)=>[String(i),String(i)]),String(ab.targetCount||1))+'</select></label>'+
      '<label>Được chọn mình<select data-a="selfTarget">'+selectOptions([['no','Không'],['yes','Có']],ab.selfTarget)+'</select></label>'+
      '<label>Đối tượng<select data-a="targetPool">'+selectOptions([['aliveOther','Người đang sống'],['dead','Người đã chết'],['deadPreviousCycle','Chết ngày/đêm hôm trước'],['any','Bất kỳ'],['wolf','Phe Sói']],ab.targetPool)+'</select></label>'+
      '<label>Hiệu lực xảy ra<select data-a="effectTiming">'+selectOptions([['immediate','Ngay lập tức'],['nextMorning','Sáng hôm sau'],['nextNight','Đêm hôm sau'],['after2','Sau 2 phase']],ab.effectTiming)+'</select></label>'+
      '<label>Nhóm độc quyền<select data-a="mutexGroup">'+selectOptions([['none','Không'],['nightChoice','Nhóm A'],['groupB','Nhóm B']],ab.mutexGroup||'none')+'</select></label>'+
      '<label>Lặp mục tiêu<select data-a="allowConsecutive">'+selectOptions([['yes','Cho phép'],['no','Không liên tiếp']],ab.allowConsecutive||'yes')+'</select></label>'+
    '</div></div>';
}
function renderCardBack(card){
  $('#cardName').value=card.name||'';
  $('#cardDescription').value=card.description||'';
  $('#cardAudio').innerHTML=audioOptions(card.audioId,'card');
  $('#cardAuto').value=card.automatic||'none';
  $$('#factionSeg button').forEach(b=>b.classList.toggle('active',b.dataset.faction===card.factionId));
  $('#abilityList').innerHTML=(card.abilities||[]).map(abilityHtml).join('');
  $('#mutexMode').value=card.mutexMode||'none';
  $('#mutexScope').value=card.mutexScope||'night';
  bindAbilityControls(card);
}
function bindAbilityControls(card){
  $$('#abilityList .ability').forEach(row=>{
    const idx=Number(row.dataset.abilityIndex),ab=card.abilities[idx];
    $$('select[data-a]',row).forEach(sel=>{
      sel.addEventListener('change',()=>{
        const key=sel.dataset.a;
        ab[key]=(key==='usageCount'||key==='targetCount')?Number(sel.value):sel.value;
        saveState();renderCardFront(card);
      });
    });
  });
  $$('[data-remove-ability]').forEach(b=>b.addEventListener('click',()=>{
    const idx=Number(b.dataset.removeAbility);
    card.abilities.splice(idx,1);saveState();renderCardBack(card);renderCardFront(card);
  }));
}
async function renderCardFront(card){
  $('#playerName').textContent=(card.name||'').toUpperCase();
  const f=factionMeta(card.factionId);
  $('#playerFaction').innerHTML=(f.id==='wolf'?'<span class="red-paw">🐾</span>':f.icon)+' '+esc(f.label);
  $('#playerDesc').textContent=card.description||'';
  const list=(card.abilities||[]).map(ab=>{
    const a=actionById(ab.actionId);
    return '<div class="player-fn"><b>'+esc(a?.name||'Chức năng')+'</b><small>'+esc(usageLabel(ab.usage,ab.usageCount))+'</small></div>';
  }).join('');
  $('#playerFunctions').innerHTML=list;
  $('#playerDisplay').src=await resolveArtwork(card.id,'display');
}
function openCardEditor(id){
  currentCardId=id;const card=cardById(id);if(!card)return;
  $('#libraryHome').classList.add('hidden');$('#cardEditor').classList.remove('hidden');
  setFace('front');renderCardBack(card);renderCardFront(card);$('#library').scrollTop=0;
}
function closeCardEditor(){
  $('#cardEditor').classList.add('hidden');$('#libraryHome').classList.remove('hidden');renderCardGrid();$('#library').scrollTop=0;
}
function setFace(face){
  $$('.face-switch button').forEach(b=>b.classList.toggle('active',b.dataset.face===face));
  $$('.face').forEach(f=>f.classList.toggle('active',f.id===(face==='front'?'cardFront':'cardBack')));
}

function renderActions(){
  const q=($('#actionSearch').value||'').trim().toLowerCase();
  const list=(state.actions[actionKind]||[]).filter(a=>!q||a.name.toLowerCase().includes(q)||a.id.toLowerCase().includes(q));
  const grid=$('#actionGrid');
  grid.innerHTML=list.map(a=>{
    const fx=(a.effectIds||[]).map(id=>effectById(id)?.name||id).join(', ')||'Chưa có Effect';
    return '<article class="data-box" data-action-id="'+esc(a.id)+'"><div><b>'+esc(a.name)+'</b><code>'+esc(a.id)+'</code></div><small>'+esc(fx)+'</small></article>';
  }).join('')+'<article class="data-box add-box" id="addActionBox"><div><b>＋ Thêm Hành Động</b></div><small>Tạo ID tự động</small></article>';
  $$('[data-action-id]').forEach(el=>bindDouble(el,()=>openActionEditor(el.dataset.actionId)));
  $('#addActionBox').onclick=()=>createAction();
}
function renderEffects(){
  const q=($('#effectSearch').value||'').trim().toLowerCase();
  const list=state.effects.filter(e=>!q||e.name.toLowerCase().includes(q)||e.id.toLowerCase().includes(q));
  const grid=$('#effectGrid');
  grid.innerHTML=list.map(e=>'<article class="data-box" data-effect-id="'+esc(e.id)+'"><div><b>'+esc(e.name)+'</b><code>'+esc(e.id)+'</code></div><small>'+esc(e.primitive)+' • '+esc(durationLabel(e.duration))+'</small></article>').join('')+
    '<article class="data-box add-box" id="addEffectBox"><div><b>＋ Thêm Hiệu Ứng</b></div><small>Tạo ID tự động</small></article>';
  $$('[data-effect-id]').forEach(el=>bindDouble(el,()=>openEffectEditor(el.dataset.effectId)));
  $('#addEffectBox').onclick=()=>createEffect();
}
function bindDouble(el,cb){
  el.addEventListener('dblclick',cb);
  el.addEventListener('touchend',()=>{
    const now=Date.now(),prev=lastTouchMap.get(el)||0;
    if(now-prev<420){lastTouchMap.set(el,0);cb()}else lastTouchMap.set(el,now);
  },{passive:true});
}

function showSheet(title,html,ctx){
  editContext=ctx;$('#sheetTitle').textContent=title;$('#sheetBody').innerHTML=html;$('#editSheet').classList.remove('hidden');
}
function closeSheet(){$('#editSheet').classList.add('hidden');editContext=null}
function effectLinkRows(ids){
  const all=state.effects;
  return (ids.length?ids:['']).map((id,i)=>'<div class="form-grid effect-link" data-effect-index="'+i+'"><label class="full">Hiệu Ứng<select data-effect-link>'+all.map(e=>'<option value="'+esc(e.id)+'" '+(e.id===id?'selected':'')+'>'+esc(e.name)+'</option>').join('')+'</select></label></div>').join('');
}
function openActionEditor(id){
  const a=actionById(id);if(!a)return;
  showSheet('Hành Động • '+a.name,
    '<div class="form-grid">'+
      '<label class="full">ID<input id="editActionId" value="'+esc(a.id)+'" readonly></label>'+
      '<label class="full">Tên<input id="editActionName" value="'+esc(a.name)+'"></label>'+
      '<label class="full">Audio<select id="editActionAudio">'+audioOptions(a.audioId,'action')+'</select></label>'+
    '</div>'+
    '<div class="settings-title" style="margin-top:10px"><h3>Hiệu Ứng liên kết</h3><button class="mini primary" id="addEffectLink">＋ Thêm</button></div>'+
    '<div id="effectLinkList">'+effectLinkRows(a.effectIds||[])+'</div>',
    {type:'action',id}
  );
  $('#addEffectLink').onclick=()=>{
    const list=$('#effectLinkList'),i=$$('.effect-link',list).length;
    const d=document.createElement('div');d.innerHTML=effectLinkRows(['']);list.append(...d.children);
  };
}
function openEffectEditor(id){
  const e=effectById(id);if(!e)return;
  showSheet('Hiệu Ứng • '+e.name,
    '<div class="form-grid">'+
      '<label class="full">ID<input id="editEffectId" value="'+esc(e.id)+'" readonly></label>'+
      '<label class="full">Tên<input id="editEffectName" value="'+esc(e.name)+'"></label>'+
      '<label>Engine Primitive<select id="editPrimitive">'+selectOptions([['EXPEL','EXPEL'],['REVIVE','REVIVE'],['KILL','KILL'],['PROTECT','PROTECT'],['BLOCK','BLOCK'],['TRANSFER_EFFECT','TRANSFER_EFFECT'],['REVEAL_FACTION','REVEAL_FACTION'],['REVEAL_ROLE','REVEAL_ROLE']],e.primitive)+'</select></label>'+
      '<label>Thời lượng<select id="editDuration">'+selectOptions([['instant','Tức thời'],['night','Đêm đó'],['untilNextMorning','Đến hết sáng hôm sau'],['untilRemoved','Đến khi được gỡ']],e.duration)+'</select></label>'+
    '</div>',
    {type:'effect',id}
  );
}
function createAction(){
  const a={id:uid(actionKind==='role'?'action':'artifact_action'),name:'Hành Động Mới',effectIds:[],audioId:''};
  state.actions[actionKind].push(a);saveState();renderActions();openActionEditor(a.id);
}
function createEffect(){
  const e={id:uid('effect'),name:'Hiệu Ứng Mới',primitive:'KILL',duration:'instant'};
  state.effects.push(e);saveState();renderEffects();openEffectEditor(e.id);
}
function saveSheet(){
  if(!editContext)return;
  if(editContext.type==='action'){
    const a=actionById(editContext.id);if(!a)return;
    a.name=($('#editActionName').value||'').trim()||a.name;
    a.audioId=$('#editActionAudio').value||'';
    a.effectIds=$$('[data-effect-link]').map(x=>x.value).filter(Boolean);
    saveState();renderActions();const card=cardById(currentCardId);if(card){renderCardBack(card);renderCardFront(card)}
  }else if(editContext.type==='effect'){
    const e=effectById(editContext.id);if(!e)return;
    e.name=($('#editEffectName').value||'').trim()||e.name;
    e.primitive=$('#editPrimitive').value;e.duration=$('#editDuration').value;
    saveState();renderEffects();renderActions();
  }
  closeSheet();
}

function renderAudio(){
  $('#audioGrid').innerHTML=state.audio.map(a=>'<article class="data-box"><div><b>'+esc(a.name)+'</b><code>'+esc(a.id)+'</code></div><small>'+esc(a.scope==='card'?'Audio Lá Bài':'Audio Hành Động')+' • '+esc(a.fileName||a.status)+'</small></article>').join('');
}

async function renderThemeEditor(){
  const editorId=state.themes.selectedEditorId||state.themes.activeId||'theme-sea';
  const t=themeById(editorId),card=cardById('role_old_witch'),m=t.mappings?.[card.id]||{};
  $$('#themeSeg button').forEach(b=>b.classList.toggle('active',b.dataset.theme===editorId));
  $('#themeDisplayUrl').value=m.displayUrl||'';$('#themeThumbUrl').value=m.thumbUrl||'';
  const editable=editorId!=='theme-default';
  $('#themeDisplayUrl').disabled=!editable;$('#themeThumbUrl').disabled=!editable;$('#themeDisplayFile').disabled=!editable;$('#themeThumbFile').disabled=!editable;$('#themeSave').disabled=!editable;$('#themeFallback').disabled=!editable;
  $('#themePreview').src=await resolveArtwork(card.id,'thumb');
  if(editorId==='theme-default')$('#themeStatus').textContent='Artwork gốc Server Gốc';
  else $('#themeStatus').textContent=(await hasSeaOverride(card.id))?'Đã có Artwork Biển':'Chưa có Artwork Biển • đang fallback Mặc định';
}
async function saveTheme(){
  const id=state.themes.selectedEditorId||'theme-sea';if(id==='theme-default')return;
  const t=themeById(id),cardId='role_old_witch';t.mappings=t.mappings||{};t.mappings[cardId]=t.mappings[cardId]||{};
  t.mappings[cardId].displayUrl=($('#themeDisplayUrl').value||'').trim();
  t.mappings[cardId].thumbUrl=($('#themeThumbUrl').value||'').trim();
  if(pendingThemeFiles.display)await dbPut(blobKey(id,cardId,'display'),pendingThemeFiles.display);
  if(pendingThemeFiles.thumb)await dbPut(blobKey(id,cardId,'thumb'),pendingThemeFiles.thumb);
  pendingThemeFiles={display:null,thumb:null};saveState();
  await renderThemeEditor();renderCardGrid();const c=cardById(currentCardId);if(c)renderCardFront(c);
}
async function fallbackTheme(){
  const id=state.themes.selectedEditorId||'theme-sea';if(id==='theme-default')return;
  const t=themeById(id),cardId='role_old_witch';t.mappings[cardId]={displayUrl:'',thumbUrl:''};
  await dbDelete(blobKey(id,cardId,'display'));await dbDelete(blobKey(id,cardId,'thumb'));
  for(const k of [blobKey(id,cardId,'display'),blobKey(id,cardId,'thumb')]){const u=objectUrls.get(k);if(u)URL.revokeObjectURL(u);objectUrls.delete(k)}
  saveState();await renderThemeEditor();renderCardGrid();const c=cardById(currentCardId);if(c)renderCardFront(c);
}

function bindCore(){
  $$('.nav').forEach(n=>n.addEventListener('click',()=>{
    $$('.page').forEach(p=>p.classList.toggle('active',p.id===n.dataset.page));
    $$('.nav').forEach(x=>x.classList.toggle('active',x===n));
    const p=$('#'+n.dataset.page);if(p)p.scrollTop=0;
  }));
  $$('.libtab').forEach(b=>b.addEventListener('click',()=>{
    $$('.libtab').forEach(x=>x.classList.toggle('active',x===b));
    $$('.libpane').forEach(p=>p.classList.toggle('active',p.id==='lib-'+b.dataset.lib));
    $('#library').scrollTop=0;
    if(b.dataset.lib==='themes')renderThemeEditor();
  }));
  $$('.filter').forEach(b=>b.addEventListener('click',()=>{$$('.filter').forEach(x=>x.classList.toggle('active',x===b));cardFilter=b.dataset.cardFilter;renderCardGrid()}));
  $('#closeCardEditor').onclick=closeCardEditor;
  $$('.face-switch button').forEach(b=>b.onclick=()=>setFace(b.dataset.face));
  $$('#factionSeg button').forEach(b=>b.onclick=()=>{const c=cardById(currentCardId);if(!c)return;c.factionId=b.dataset.faction;saveState();renderCardBack(c);renderCardFront(c)});
  $('#cardName').addEventListener('input',()=>{const c=cardById(currentCardId);c.name=$('#cardName').value;saveState();renderCardFront(c)});
  $('#cardDescription').addEventListener('input',()=>{const c=cardById(currentCardId);c.description=$('#cardDescription').value;saveState();renderCardFront(c)});
  $('#cardAudio').addEventListener('change',()=>{const c=cardById(currentCardId);c.audioId=$('#cardAudio').value;saveState()});
  $('#cardAuto').addEventListener('change',()=>{const c=cardById(currentCardId);c.automatic=$('#cardAuto').value;saveState()});
  $('#mutexMode').addEventListener('change',()=>{const c=cardById(currentCardId);c.mutexMode=$('#mutexMode').value;saveState()});
  $('#mutexScope').addEventListener('change',()=>{const c=cardById(currentCardId);c.mutexScope=$('#mutexScope').value;saveState()});
  $('#addAbility').onclick=()=>{const c=cardById(currentCardId);const first=state.actions.role[0];c.abilities.push({id:uid('ability'),actionId:first?.id||'',phase:'night',usage:'eachNight',usageCount:1,targetCount:1,selfTarget:'no',targetPool:'aliveOther',effectTiming:'immediate',mutexGroup:'none',allowConsecutive:'yes'});saveState();renderCardBack(c);renderCardFront(c)};
  $$('#actionKindSeg button').forEach(b=>b.onclick=()=>{$$('#actionKindSeg button').forEach(x=>x.classList.toggle('active',x===b));actionKind=b.dataset.actionKind;renderActions()});
  $('#actionSearch').addEventListener('input',renderActions);$('#effectSearch').addEventListener('input',renderEffects);
  $('#sheetClose').onclick=closeSheet;$('#sheetCancel').onclick=closeSheet;$('#sheetSave').onclick=saveSheet;
  $('#editSheet').addEventListener('click',e=>{if(e.target===$('#editSheet'))closeSheet()});
  $$('#themeSeg button').forEach(b=>b.onclick=async()=>{state.themes.selectedEditorId=b.dataset.theme;state.themes.activeId=b.dataset.theme;saveState();await renderThemeEditor();renderCardGrid();const c=cardById(currentCardId);if(c)renderCardFront(c)});
  $('#themeDisplayFile').addEventListener('change',e=>{pendingThemeFiles.display=e.target.files?.[0]||null});
  $('#themeThumbFile').addEventListener('change',e=>{pendingThemeFiles.thumb=e.target.files?.[0]||null});
  $('#themeSave').onclick=saveTheme;$('#themeFallback').onclick=fallbackTheme;
}

async function boot(){
  await ensureDefaultThumb();
  bindCore();renderCardGrid();renderActions();renderEffects();renderAudio();await renderThemeEditor();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();

})();