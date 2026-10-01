(()=>{'use strict';

const STATE_KEY='GMWW_V208_STATE';
const PREF_KEY='GMWW_V208_PREFS';
const OLD_STATE_KEYS=['GMWW_V207_STATE','GMWW_V206_STATE','GMWW_V205_STATE'];
const OLD_PREF_KEYS=['GMWW_V207_PREFS','GMWW_V206_PREFS','GMWW_V205_PREFS'];
const DB_NAME='GMWW_V208_THEME_ASSETS';
const DB_STORE='assets';

const DEFAULT_STATE={
  version:'2.08',
  cards:[{
    id:'role_old_witch',legacyId:'source-18',name:'Phù Thuỷ Già',factionId:'village',
    information:'Phe Dân. Mỗi đêm chọn Đuổi 1 người hoặc Hồi Sinh 1 người, không được làm cả hai. Hồi Sinh chỉ áp dụng cho người chết ở ngày trước hoặc đêm trước theo luật.',
    flags:{useDay:false,useNight:true,nightImmune:false,lifeEnabled:false,lives:1,multiTask:false,passive:false,multiNightActions:false,soloWolfOnly:false,group7Official:false},
    winCondition:'',passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',blockOn:['expelled','blocked']},
    functions:[
      {id:'fn_old_witch_exile',actionId:'action_exile',phase:'night',usageMode:'eachNight',usageCount:1,nightFromEnabled:false,nightFrom:1,nightToEnabled:false,nightTo:1,cooldownNights:0,minTargets:1,maxTargets:1,noSelf:true,allowDead:false,noTarget:false,multiPerson:false,allowConsecutive:false,passive:false,trigger:'',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0},
      {id:'fn_old_witch_revive',actionId:'action_revive',phase:'night',usageMode:'onceGame',usageCount:1,nightFromEnabled:false,nightFrom:1,nightToEnabled:false,nightTo:1,cooldownNights:0,minTargets:1,maxTargets:1,noSelf:true,allowDead:true,noTarget:false,multiPerson:false,allowConsecutive:false,passive:false,trigger:'',pushToPlayerWeb:false,targetPreviousCycleOnly:true,perUserLimit:0}
    ]
  }],
  artifacts:[{
    id:'artifact_mirror',legacyId:'atifat-1789042413093',name:'Tráng Gương',information:'A giữ Vai Trò Gốc và thứ tự thức gốc. Khi đến lượt thức của B, A thức cùng B và có thêm 1 lượt thực hiện Hành Động đã copy của B. Đến lượt gốc của A, A vẫn thực hiện Hành Động gốc bình thường.',
    flags:{useDay:false,useNight:true,nightImmune:false,lifeEnabled:false,lives:1,multiTask:false,passive:false,multiNightActions:false,soloWolfOnly:false,group7Official:false},
    artifact:{ownerSelection:false,persistentOwner:false,revealFollowTargetOnly:false,wakeWithRoleId:'',wakeWithActionId:''},
    winCondition:'',passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',blockOn:[]},
    functions:[{id:'fn_artifact_mirror',actionId:'action_mirror',phase:'night',usageMode:'onceGame',usageCount:1,nightFromEnabled:false,nightFrom:1,nightToEnabled:false,nightTo:1,cooldownNights:0,minTargets:1,maxTargets:1,noSelf:true,allowDead:false,noTarget:false,multiPerson:false,allowConsecutive:true,passive:false,trigger:'',pushToPlayerWeb:false,targetPreviousCycleOnly:false,perUserLimit:0}]
  }],
  actions:{
    role:[
      {id:'action_exile',name:'Đuổi Người',description:'Bà phù thủy già đuổi 1 người ra khỏi làng; các tác động lên người đó không có tác dụng.',effectIds:['effect_exile']},
      {id:'action_revive',name:'Hồi Sinh',description:'Cứu sống một người đã chết.',effectIds:['effect_revive']}
    ],
    artifacts:[{id:'action_mirror',name:'Tráng Gương',description:'Sao chép chức năng của mục tiêu theo rule của ARTIFACTS.',effectIds:['effect_copy_functions']}]
  },
  effects:[
    {id:'effect_exile',name:'Đuổi',primitive:'EXPEL',duration:'nextDay',description:'Đuổi người chơi ra khỏi làng; khóa tác động và chức năng đến hết buổi sáng hôm sau.',webTemplate:{eventType:'EXPEL',emoji:'🚪',title:'BỊ ĐUỔI KHỎI LÀNG',requireAck:true,requireResponse:false}},
    {id:'effect_revive',name:'Hồi Sinh',primitive:'REVIVE',duration:'instant',description:'Hồi sinh người chơi hợp lệ và đưa họ trở lại trạng thái sống.',webTemplate:{eventType:'REVIVE',emoji:'✨',title:'ĐƯỢC HỒI SINH',requireAck:false,requireResponse:false}},
    {id:'effect_copy_functions',name:'Sao chép chức năng',primitive:'COPY_FUNCTIONS',duration:'night',description:'Cho chủ sở hữu thêm chức năng của mục tiêu theo rule ARTIFACTS.',webTemplate:{eventType:'COPY_FUNCTIONS',emoji:'🪞',title:'TRÁNG GƯƠNG',requireAck:false,requireResponse:false}}
  ],
  audio:[
    {id:'audio_role_old_witch',name:'Phù Thuỷ Già',scope:'Lá Bài',targetId:'role_old_witch',fileName:'',status:'Chưa gắn file'},
    {id:'audio_action_exile',name:'Đuổi Người',scope:'Hành Động',targetId:'action_exile',fileName:'duoi_nguoi.mp3',status:'Theo Server Gốc V1.08'},
    {id:'audio_action_revive',name:'Hồi Sinh',scope:'Hành Động',targetId:'action_revive',fileName:'hoi_sinh.mp3',status:'Theo Server Gốc V1.08'}
  ],
  themes:{activeId:'theme-sea',selectedEditorId:'theme-sea',list:[
    {id:'theme-default',name:'Mặc định',builtin:true,locked:true,mappings:{}},
    {id:'theme-sea',name:'Biển',builtin:true,locked:false,mappings:{role_old_witch:{displayUrl:'',thumbUrl:'',bundledSea:true}}}
  ]}
};
const DEFAULT_PREFS={cards:{role_old_witch:{starred:true,starOrder:1,hidden:false}},artifacts:{artifact_mirror:{starred:true,starOrder:1,hidden:false}}};

const $=(s,r=document)=>r.querySelector(s);const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const clone=v=>JSON.parse(JSON.stringify(v));const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=p=>p+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);
const bool=v=>!!v;
function deepMerge(base,raw){if(!raw||typeof raw!=='object')return base;for(const k of Object.keys(raw)){if(raw[k]&&typeof raw[k]==='object'&&!Array.isArray(raw[k])&&base[k]&&typeof base[k]==='object'&&!Array.isArray(base[k]))deepMerge(base[k],raw[k]);else base[k]=raw[k]}return base}
function migrateOld(raw){
  if(!raw)return clone(DEFAULT_STATE);const s=clone(DEFAULT_STATE);
  if(Array.isArray(raw.cards)&&raw.cards.length){
    s.cards=raw.cards.map((c,i)=>{
      const d=clone(DEFAULT_STATE.cards[Math.min(i,DEFAULT_STATE.cards.length-1)]||DEFAULT_STATE.cards[0]);
      d.id=c.id||d.id;d.name=c.name||d.name;d.factionId=c.factionId||d.factionId;d.information=c.information||c.description||d.information;
      if(c.flags)deepMerge(d.flags,c.flags);
      const oldFns=c.functions||c.abilities||[];
      if(oldFns.length)d.functions=oldFns.map((f,j)=>({id:f.id||uid('fn'),actionId:f.actionId||(f.actionIds&&f.actionIds[0])||'',phase:f.phase||'night',usageMode:f.usageMode||f.usage||((f.limitEnabled&&f.perGame===1)?'onceGame':'eachNight'),usageCount:Number(f.usageCount||f.perGame||1),nightFromEnabled:bool(f.nightFromEnabled),nightFrom:Number(f.nightFrom||1),nightToEnabled:bool(f.nightToEnabled),nightTo:Number(f.nightTo||1),cooldownNights:Number(f.cooldownNights||0),minTargets:Number(f.minTargets??f.targetCount??1),maxTargets:Number(f.maxTargets??f.targetCount??1),noSelf:f.noSelf!==undefined?bool(f.noSelf):(f.selfTarget==='no'),allowDead:bool(f.allowDead),noTarget:bool(f.noTarget),multiPerson:bool(f.multiPerson),allowConsecutive:f.allowConsecutive!==undefined?bool(f.allowConsecutive):(f.allowConsecutive==='yes'),passive:bool(f.passive),trigger:f.trigger||'',pushToPlayerWeb:bool(f.pushToPlayerWeb),targetPreviousCycleOnly:bool(f.targetPreviousCycleOnly),perUserLimit:Number(f.perUserLimit||0)}));
      return d;
    });
  }
  if(Array.isArray(raw.artifacts)&&raw.artifacts.length)s.artifacts=raw.artifacts;
  if(raw.actions){if(Array.isArray(raw.actions.role))s.actions.role=raw.actions.role.map(a=>({id:a.id,name:a.name,description:a.description||a.desc||'',effectIds:a.effectIds||[]}));const aa=raw.actions.artifacts||raw.actions.artifact;if(Array.isArray(aa))s.actions.artifacts=aa.map(a=>({id:a.id,name:a.name,description:a.description||a.desc||'',effectIds:a.effectIds||[]}));}
  if(Array.isArray(raw.effects))s.effects=raw.effects.map(e=>({id:e.id,name:e.name,primitive:e.primitive||e.type||'CUSTOM',duration:e.duration||'instant',description:e.description||e.desc||'',webTemplate:e.webTemplate||{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}}));
  if(Array.isArray(raw.audio))s.audio=raw.audio;
  if(raw.themes)s.themes=raw.themes;
  s.version='2.08';return s;
}
function loadState(){
  try{const cur=JSON.parse(localStorage.getItem(STATE_KEY)||'null');if(cur)return deepMerge(clone(DEFAULT_STATE),cur)}catch(_){}
  for(const k of OLD_STATE_KEYS){try{const raw=JSON.parse(localStorage.getItem(k)||'null');if(raw){const s=migrateOld(raw);localStorage.setItem(STATE_KEY,JSON.stringify(s));return s}}catch(_){}}
  return clone(DEFAULT_STATE);
}
function loadPrefs(){
  try{const cur=JSON.parse(localStorage.getItem(PREF_KEY)||'null');if(cur)return deepMerge(clone(DEFAULT_PREFS),cur)}catch(_){}
  for(const k of OLD_PREF_KEYS){try{const raw=JSON.parse(localStorage.getItem(k)||'null');if(raw){const p=clone(DEFAULT_PREFS);if(raw.cards)p.cards=raw.cards;if(raw.artifacts)p.artifacts=raw.artifacts;localStorage.setItem(PREF_KEY,JSON.stringify(p));return p}}catch(_){}}
  return clone(DEFAULT_PREFS);
}
let state=loadState(),prefs=loadPrefs();let currentKind='cards',currentId='role_old_witch',cardFilter='all',artifactFilter='all',actionKind='role',editContext=null,lastTouchMap=new WeakMap(),pendingThemeFiles={display:null,thumb:null},objectUrls=new Map(),defaultThumb='';
function saveState(){state.version='2.08';localStorage.setItem(STATE_KEY,JSON.stringify(state))}function savePrefs(){localStorage.setItem(PREF_KEY,JSON.stringify(prefs))}
function entityList(kind){return kind==='artifacts'?state.artifacts:state.cards}function entityById(kind,id){return entityList(kind).find(x=>x.id===id)||null}
function actionList(kind){return kind==='artifacts'?state.actions.artifacts:state.actions.role}function actionById(id){return [...state.actions.role,...state.actions.artifacts].find(x=>String(x.id)===String(id))||null}function effectById(id){return state.effects.find(x=>String(x.id)===String(id))||null}
function prefFor(kind,id){prefs[kind]=prefs[kind]||{};prefs[kind][id]=prefs[kind][id]||{starred:false,starOrder:null,hidden:false};return prefs[kind][id]}
function factionMeta(id){if(id==='wolf')return{id:'wolf',label:'Phe Sói',icon:'🐾'};if(id==='third')return{id:'third',label:'Phe Ba',icon:'🔥'};return{id:'village',label:'Phe Dân Làng',icon:'🍃'}}
function selectOptions(items,selected){return items.map(([v,l])=>'<option value="'+esc(v)+'" '+(String(v)===String(selected)?'selected':'')+'>'+esc(l)+'</option>').join('')}
function numOptions(min,max,selected){const a=[];for(let i=min;i<=max;i++)a.push([String(i),String(i)]);return selectOptions(a,String(selected))}

function openDb(){return new Promise((resolve,reject)=>{const q=indexedDB.open(DB_NAME,1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(DB_STORE))q.result.createObjectStore(DB_STORE,{keyPath:'key'})};q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})}
async function dbPut(key,blob){const db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put({key,blob,updatedAt:Date.now()});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}
async function dbGet(key){const db=await openDb();const out=await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readonly');const q=tx.objectStore(DB_STORE).get(key);q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>reject(q.error)});db.close();return out}
async function dbDelete(key){const db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).delete(key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}
function blobKey(themeId,kind,id,assetKind){return themeId+'|'+kind+'|'+id+'|'+assetKind}
async function blobUrlFor(themeId,kind,id,assetKind){const key=blobKey(themeId,kind,id,assetKind);if(objectUrls.has(key))return objectUrls.get(key);try{const rec=await dbGet(key);if(rec&&rec.blob){const u=URL.createObjectURL(rec.blob);objectUrls.set(key,u);return u}}catch(_){}return''}
function imageToThumb(src){return new Promise(resolve=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=360;c.height=330;const g=c.getContext('2d');g.fillStyle='#071421';g.fillRect(0,0,360,330);const sw=im.naturalWidth||1024,sh=im.naturalHeight||936,scale=Math.max(360/sw,330/sh),dw=sw*scale,dh=sh*scale;g.drawImage(im,(360-dw)/2,(330-dh)/2,dw,dh);resolve(c.toDataURL('image/webp',.82))};im.onerror=()=>resolve(src);im.src=src})}
async function ensureDefaultThumb(){if(defaultThumb)return defaultThumb;defaultThumb=await imageToThumb(window.GMWW205_DEFAULT_DISPLAY||'');return defaultThumb}
function themeById(id){return state.themes.list.find(x=>x.id===id)||state.themes.list[0]}
async function resolveArtwork(kind,id,assetKind){
  const active=state.themes.activeId||'theme-sea',t=themeById(active),m=(t.mappings&&t.mappings[id])||{};
  if(active!=='theme-default'){
    const local=await blobUrlFor(active,kind,id,assetKind);if(local)return local;
    const url=String(assetKind==='thumb'?m.thumbUrl:m.displayUrl||'').trim();if(url)return url;
    if(id==='role_old_witch'&&kind==='cards'){
      if(assetKind==='thumb'&&window.GMWW208_SEA_THUMB)return window.GMWW208_SEA_THUMB;
      if(assetKind==='display'&&window.GMWW208_SEA_DISPLAY)return window.GMWW208_SEA_DISPLAY;
    }
  }
  if(assetKind==='thumb')return await ensureDefaultThumb();return window.GMWW205_DEFAULT_DISPLAY||'';
}

function renderEntityGrid(kind){
  const grid=$(kind==='cards'?'#cardGrid':'#artifactGrid'),filter=kind==='cards'?cardFilter:artifactFilter;let list=entityList(kind).filter(e=>{const p=prefFor(kind,e.id);if(filter==='star')return p.starred&&!p.hidden;if(filter==='hidden')return p.hidden;return true});
  list.sort((a,b)=>{const pa=prefFor(kind,a.id),pb=prefFor(kind,b.id);if(pa.starred!==pb.starred)return pa.starred?-1:1;return (pa.starOrder||9999)-(pb.starOrder||9999)});
  grid.innerHTML=list.map(e=>{const p=prefFor(kind,e.id),sub=kind==='cards'?(factionMeta(e.factionId).icon+' '+factionMeta(e.factionId).label):'✦ ARTIFACTS';return '<article class="role-tile '+(p.hidden?'hidden-pref':'')+'" data-kind="'+kind+'" data-id="'+esc(e.id)+'"><div class="tile-actions"><button class="star '+(p.starred?'on':'')+'" data-pref="star">'+(p.starred?'★':'☆')+'</button><button class="hide '+(p.hidden?'on':'')+'" data-pref="hide">'+(p.hidden?'◉':'◌')+'</button></div><img data-thumb-kind="'+kind+'" data-thumb-id="'+esc(e.id)+'" alt=""><h3>'+esc(e.name)+'</h3><small>'+esc(sub)+(p.hidden?' • Tạm ẩn':'')+'</small></article>'}).join('')||'<div class="data-box"><b>Chưa có dữ liệu</b></div>';
  list.forEach(async e=>{const im=$('[data-thumb-kind="'+kind+'"][data-thumb-id="'+CSS.escape(e.id)+'"]');if(im)im.src=await resolveArtwork(kind,e.id,'thumb')});
  $$('[data-kind="'+kind+'"][data-id]',grid).forEach(tile=>tile.onclick=e=>{const pref=e.target.closest('[data-pref]');if(pref){e.stopPropagation();togglePref(kind,tile.dataset.id,pref.dataset.pref);return}openEntityEditor(kind,tile.dataset.id)});
}
function togglePref(kind,id,type){const p=prefFor(kind,id);if(type==='star'){if(p.starred){p.starred=false;p.starOrder=null}else{p.hidden=false;p.starred=true;const orders=Object.values(prefs[kind]||{}).filter(x=>x.starred).map(x=>Number(x.starOrder)||0);p.starOrder=Math.max(0,...orders)+1}}else{p.hidden=!p.hidden;if(p.hidden){p.starred=false;p.starOrder=null}}savePrefs();renderEntityGrid(kind)}

function normalizeEntity(e,kind){e.flags=Object.assign({useDay:false,useNight:false,nightImmune:false,lifeEnabled:false,lives:1,multiTask:false,passive:false,multiNightActions:false,soloWolfOnly:false,group7Official:false},e.flags||{});e.functions=Array.isArray(e.functions)?e.functions:[];e.winCondition=e.winCondition||'';e.passiveRule=Object.assign({enabled:false,type:'stake_survive'},e.passiveRule||{});e.groupActionGate=Object.assign({enabled:false,actionId:'',blockOn:[]},e.groupActionGate||{});if(kind==='artifacts')e.artifact=Object.assign({ownerSelection:false,persistentOwner:false,revealFollowTargetOnly:false,wakeWithRoleId:'',wakeWithActionId:''},e.artifact||{});return e}
async function renderEntityFront(e){$('#playerName').textContent=(e.name||'').toUpperCase();$('#playerInformation').textContent=e.information||'';$('#playerDisplay').src=await resolveArtwork(currentKind,e.id,'display')}
function actionOptionsForEntity(e,selected){const kind=currentKind==='artifacts'?'artifacts':'role';return actionList(kind).map(a=>'<option value="'+esc(a.id)+'" '+(String(a.id)===String(selected)?'selected':'')+'>'+esc(a.name)+'</option>').join('')}
function functionHtml(fn,index){
  return '<div class="function-card" data-fn-index="'+index+'"><div class="function-head"><b>Hành Động trên Lá #'+(index+1)+'</b><button data-remove-fn="'+index+'">×</button></div><div class="function-grid">'+
  '<label class="full">Chọn Hành Động<select data-f="actionId">'+actionOptionsForEntity(null,fn.actionId)+'</select></label>'+
  '<label>Phase<select data-f="phase">'+selectOptions([['night','Ban Đêm'],['day','Ban Ngày'],['setup','Đầu Ván / Setup'],['trigger','Trigger']],fn.phase||'night')+'</select></label>'+
  '<label>Giới hạn sử dụng<select data-f="usageMode">'+selectOptions([['unlimited','Không giới hạn'],['eachNight','Mỗi đêm'],['eachDay','Mỗi ngày'],['onceGame','1 lần / ván'],['nGame','N lần / ván'],['nPerNight','N lần / đêm']],fn.usageMode||'unlimited')+'</select></label>'+
  '<label>Số lần N<select data-f="usageCount">'+numOptions(1,10,fn.usageCount||1)+'</select></label>'+
  '<label>Cooldown (đêm)<select data-f="cooldownNights">'+numOptions(0,10,fn.cooldownNights||0)+'</select></label>'+
  '<label>Mục tiêu tối thiểu<select data-f="minTargets">'+numOptions(0,8,fn.minTargets??1)+'</select></label>'+
  '<label>Mục tiêu tối đa<select data-f="maxTargets">'+numOptions(0,8,fn.maxTargets??1)+'</select></label>'+
  '<label>Từ đêm<select data-f="nightFrom">'+numOptions(1,20,fn.nightFrom||1)+'</select></label>'+
  '<label>Đến đêm<select data-f="nightTo">'+numOptions(1,20,fn.nightTo||1)+'</select></label>'+
  '<label>Trigger<select data-f="trigger">'+selectOptions([['','Không'],['stake_execution','Bị Treo Cổ'],['SOURCE_DEATH','Nguồn chết'],['morning','Buổi sáng']],fn.trigger||'')+'</select></label>'+
  '<label>Giới hạn mỗi người<select data-f="perUserLimit">'+numOptions(0,5,fn.perUserLimit||0)+'</select></label></div>'+
  '<div class="function-checks">'+
    checkHtml('nightFromEnabled','Áp dụng Từ đêm',fn.nightFromEnabled)+checkHtml('nightToEnabled','Áp dụng Đến đêm',fn.nightToEnabled)+
    checkHtml('noSelf','Không được chọn bản thân',fn.noSelf)+checkHtml('allowDead','Cho phép chọn người đã chết',fn.allowDead)+
    checkHtml('noTarget','Không cần chọn mục tiêu',fn.noTarget)+checkHtml('multiPerson','Cho phép nhiều mục tiêu',fn.multiPerson)+
    checkHtml('allowConsecutive','Cho phép chọn cùng mục tiêu liên tiếp',fn.allowConsecutive)+checkHtml('passive','Hành Động thụ động',fn.passive)+
    checkHtml('targetPreviousCycleOnly','Chỉ mục tiêu chu kỳ trước',fn.targetPreviousCycleOnly)+checkHtml('pushToPlayerWeb','Đẩy xuống Player Web',fn.pushToPlayerWeb)+
  '</div></div>';
}
function checkHtml(key,label,checked){return '<label class="check"><input type="checkbox" data-b="'+key+'" '+(checked?'checked':'')+'><span>'+esc(label)+'</span></label>'}
function renderEntityBack(e){
  normalizeEntity(e,currentKind);$('#entitySettingsTitle').textContent=currentKind==='cards'?'Cài đặt Lá Bài':'Cài đặt ARTIFACTS';$('#entityName').value=e.name||'';$('#entityInformation').value=e.information||'';
  $('#factionBlock').classList.toggle('hidden',currentKind!=='cards');$$('#factionSeg button').forEach(b=>b.classList.toggle('active',b.dataset.faction===e.factionId));
  const f=e.flags;const map={flagUseDay:'useDay',flagUseNight:'useNight',flagNightImmune:'nightImmune',flagLifeEnabled:'lifeEnabled',flagMultiTask:'multiTask',flagPassive:'passive',flagMultiNightActions:'multiNightActions',flagSoloWolfOnly:'soloWolfOnly',flagGroup7Official:'group7Official'};for(const [id,k] of Object.entries(map))$('#'+id).checked=!!f[k];$('#flagLives').innerHTML=numOptions(1,10,f.lives||1);$('#winCondition').value=e.winCondition||'';
  $('#artifactSpecific').classList.toggle('hidden',currentKind!=='artifacts');if(currentKind==='artifacts'){const a=e.artifact;$('#artifactOwnerSelection').checked=!!a.ownerSelection;$('#artifactPersistentOwner').checked=!!a.persistentOwner;$('#artifactRevealFollow').checked=!!a.revealFollowTargetOnly;$('#artifactWakeRole').innerHTML='<option value="">Không</option><option value="source-2" '+(a.wakeWithRoleId==='source-2'?'selected':'')+'>Tiên Tri</option>';$('#artifactWakeAction').innerHTML='<option value="">Không</option>'+state.actions.role.map(x=>'<option value="'+esc(x.id)+'" '+(String(a.wakeWithActionId)===String(x.id)?'selected':'')+'>'+esc(x.name)+'</option>').join('')}
  $('#functionList').innerHTML=e.functions.map(functionHtml).join('');bindFunctionControls(e);
  $('#passiveRuleEnabled').checked=!!e.passiveRule.enabled;$('#passiveRuleType').value=e.passiveRule.type||'stake_survive';$('#groupGateEnabled').checked=!!e.groupActionGate.enabled;$('#groupGateAction').innerHTML='<option value="">Chọn Hành Động</option>'+actionList(currentKind==='artifacts'?'artifacts':'role').map(a=>'<option value="'+esc(a.id)+'" '+(String(a.id)===String(e.groupActionGate.actionId)?'selected':'')+'>'+esc(a.name)+'</option>').join('');$('#gateExpelled').checked=(e.groupActionGate.blockOn||[]).includes('expelled');$('#gateBlocked').checked=(e.groupActionGate.blockOn||[]).includes('blocked');
}
function bindFunctionControls(e){$$('#functionList .function-card').forEach(row=>{const idx=Number(row.dataset.fnIndex),fn=e.functions[idx];$$('select[data-f]',row).forEach(s=>s.onchange=()=>{const k=s.dataset.f;fn[k]=['usageCount','cooldownNights','minTargets','maxTargets','nightFrom','nightTo','perUserLimit'].includes(k)?Number(s.value):s.value;saveState()});$$('input[data-b]',row).forEach(c=>c.onchange=()=>{fn[c.dataset.b]=c.checked;saveState()})});$$('[data-remove-fn]').forEach(b=>b.onclick=()=>{e.functions.splice(Number(b.dataset.removeFn),1);saveState();renderEntityBack(e)})}
function openEntityEditor(kind,id){currentKind=kind;currentId=id;const e=entityById(kind,id);if(!e)return;$('#libraryHome').classList.add('hidden');$('#entityEditor').classList.remove('hidden');setFace('front');renderEntityBack(e);renderEntityFront(e);$('#library').scrollTop=0}
function closeEntityEditor(){$('#entityEditor').classList.add('hidden');$('#libraryHome').classList.remove('hidden');renderEntityGrid(currentKind);$('#library').scrollTop=0}
function setFace(face){$$('.face-switch button').forEach(b=>b.classList.toggle('active',b.dataset.face===face));$$('.face').forEach(f=>f.classList.toggle('active',f.id===(face==='front'?'entityFront':'entityBack')))}

function renderActions(){const q=($('#actionSearch').value||'').toLowerCase().trim(),list=actionList(actionKind).filter(a=>!q||String(a.name).toLowerCase().includes(q)||String(a.id).toLowerCase().includes(q));$('#actionGrid').innerHTML=list.map(a=>'<article class="data-box" data-action-id="'+esc(a.id)+'"><div><b>'+esc(a.name)+'</b><code>'+esc(a.id)+'</code></div><small>'+esc((a.effectIds||[]).map(id=>effectById(id)?.name||id).join(', ')||'Chưa liên kết Hiệu Ứng')+'</small></article>').join('')+'<article class="data-box" id="addActionBox"><b>＋ Thêm Hành Động</b><small>Tạo Hành Động gốc mới</small></article>';$$('[data-action-id]').forEach(el=>bindDouble(el,()=>openActionEditor(el.dataset.actionId)));$('#addActionBox').onclick=createAction}
function renderEffects(){const q=($('#effectSearch').value||'').toLowerCase().trim(),list=state.effects.filter(e=>!q||String(e.name).toLowerCase().includes(q)||String(e.id).toLowerCase().includes(q));$('#effectGrid').innerHTML=list.map(e=>'<article class="data-box" data-effect-id="'+esc(e.id)+'"><div><b>'+esc(e.name)+'</b><code>'+esc(e.id)+'</code></div><small>'+esc(e.primitive)+' • '+esc(e.duration)+'</small></article>').join('')+'<article class="data-box" id="addEffectBox"><b>＋ Thêm Hiệu Ứng</b><small>Tạo Hiệu Ứng mới</small></article>';$$('[data-effect-id]').forEach(el=>bindDouble(el,()=>openEffectEditor(el.dataset.effectId)));$('#addEffectBox').onclick=createEffect}
function bindDouble(el,cb){el.addEventListener('dblclick',cb);el.addEventListener('touchend',()=>{const now=Date.now(),prev=lastTouchMap.get(el)||0;if(now-prev<420){lastTouchMap.set(el,0);cb()}else lastTouchMap.set(el,now)},{passive:true})}
function showSheet(title,html,ctx){editContext=ctx;$('#sheetTitle').textContent=title;$('#sheetBody').innerHTML=html;$('#editSheet').classList.remove('hidden')}function closeSheet(){$('#editSheet').classList.add('hidden');editContext=null}
function openActionEditor(id){const a=actionById(id);if(!a)return;showSheet('Hành Động gốc • '+a.name,'<div class="form-grid"><label class="full">ID<input id="editActionId" value="'+esc(a.id)+'" readonly></label><label class="full">Tên<input id="editActionName" value="'+esc(a.name)+'"></label><label class="full">Mô tả<textarea id="editActionDescription">'+esc(a.description||'')+'</textarea></label><label class="full">Hiệu Ứng liên kết<select id="editActionEffect"><option value="">Không</option>'+state.effects.map(e=>'<option value="'+esc(e.id)+'" '+((a.effectIds||[]).includes(e.id)?'selected':'')+'>'+esc(e.name)+'</option>').join('')+'</select></label></div><p class="hint">Không đặt số lần dùng, mục tiêu, tự chọn hay Đẩy Web ở đây. Các rule đó thuộc “Cài đặt Hành Động trên Lá”.</p>',{type:'action',id})}
function openEffectEditor(id){const e=effectById(id);if(!e)return;const w=e.webTemplate||{};showSheet('Hiệu Ứng • '+e.name,'<div class="form-grid"><label class="full">ID<input id="editEffectId" value="'+esc(e.id)+'" readonly></label><label class="full">Tên<input id="editEffectName" value="'+esc(e.name)+'"></label><label>Primitive<select id="editPrimitive">'+selectOptions([['EXPEL','EXPEL'],['REVIVE','REVIVE'],['KILL','KILL'],['PROTECT','PROTECT'],['BLOCK','BLOCK'],['TRANSFER_EFFECT','TRANSFER_EFFECT'],['REVEAL_FACTION','REVEAL_FACTION'],['REVEAL_ROLE','REVEAL_ROLE'],['COPY_FUNCTIONS','COPY_FUNCTIONS'],['CUSTOM','CUSTOM']],e.primitive)+'</select></label><label>Thời lượng<select id="editDuration">'+selectOptions([['instant','Tức thời'],['night','Đêm đó'],['nextDay','Đến hết sáng hôm sau'],['untilRemoved','Đến khi gỡ']],e.duration)+'</select></label><label class="full">Mô tả Engine<textarea id="editEffectDescription">'+esc(e.description||'')+'</textarea></label><label>Event type<input id="webEventType" value="'+esc(w.eventType||'')+'"></label><label>Emoji<input id="webEmoji" value="'+esc(w.emoji||'')+'"></label><label class="full">Tiêu đề Player Web<input id="webTitle" value="'+esc(w.title||'')+'"></label></div><div class="check-grid" style="margin-top:8px"><label class="check"><input type="checkbox" id="webRequireAck" '+(w.requireAck?'checked':'')+'><span>Yêu cầu xác nhận</span></label><label class="check"><input type="checkbox" id="webRequireResponse" '+(w.requireResponse?'checked':'')+'><span>Yêu cầu phản hồi</span></label></div><p class="hint">Hiệu Ứng chỉ định mẫu nội dung. Có gửi xuống Player Web hay không được quyết định ở Hành Động trên từng Lá.</p>',{type:'effect',id})}
function createAction(){const a={id:uid(actionKind==='role'?'action':'artifact_action'),name:'Hành Động Mới',description:'',effectIds:[]};actionList(actionKind).push(a);saveState();renderActions();openActionEditor(a.id)}
function createEffect(){const e={id:uid('effect'),name:'Hiệu Ứng Mới',primitive:'CUSTOM',duration:'instant',description:'',webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}};state.effects.push(e);saveState();renderEffects();openEffectEditor(e.id)}
function saveSheet(){if(!editContext)return;if(editContext.type==='action'){const a=actionById(editContext.id);a.name=($('#editActionName').value||'').trim()||a.name;a.description=$('#editActionDescription').value||'';a.effectIds=$('#editActionEffect').value?[$('#editActionEffect').value]:[];saveState();renderActions()}else if(editContext.type==='effect'){const e=effectById(editContext.id);e.name=($('#editEffectName').value||'').trim()||e.name;e.primitive=$('#editPrimitive').value;e.duration=$('#editDuration').value;e.description=$('#editEffectDescription').value||'';e.webTemplate={eventType:$('#webEventType').value||'',emoji:$('#webEmoji').value||'',title:$('#webTitle').value||'',requireAck:$('#webRequireAck').checked,requireResponse:$('#webRequireResponse').checked};saveState();renderEffects();renderActions()}closeSheet()}

function renderAudio(){$('#audioGrid').innerHTML=state.audio.map(a=>'<article class="data-box"><div><b>'+esc(a.name)+'</b><code>'+esc(a.id)+'</code></div><small>'+esc(a.scope)+' • '+esc(a.fileName||a.status||'Chưa gắn')+'</small></article>').join('')}
async function renderThemeEditor(){const id=state.themes.selectedEditorId||state.themes.activeId||'theme-sea',t=themeById(id),m=(t.mappings&&t.mappings.role_old_witch)||{};$$('#themeSeg button').forEach(b=>b.classList.toggle('active',b.dataset.theme===id));$('#themeDisplayUrl').value=m.displayUrl||'';$('#themeThumbUrl').value=m.thumbUrl||'';const editable=id!=='theme-default';for(const el of [$('#themeDisplayUrl'),$('#themeThumbUrl'),$('#themeDisplayFile'),$('#themeThumbFile'),$('#themeSave'),$('#themeFallback')])el.disabled=!editable;$('#themePreview').src=await resolveArtwork('cards','role_old_witch','thumb');$('#themeStatus').textContent=id==='theme-default'?'Artwork Mặc định':'Artwork Biển từ Server Gốc V1.08; có thể override bằng link/file.'}
async function saveTheme(){const id=state.themes.selectedEditorId||'theme-sea';if(id==='theme-default')return;const t=themeById(id);t.mappings=t.mappings||{};t.mappings.role_old_witch=t.mappings.role_old_witch||{};t.mappings.role_old_witch.displayUrl=($('#themeDisplayUrl').value||'').trim();t.mappings.role_old_witch.thumbUrl=($('#themeThumbUrl').value||'').trim();if(pendingThemeFiles.display)await dbPut(blobKey(id,'cards','role_old_witch','display'),pendingThemeFiles.display);if(pendingThemeFiles.thumb)await dbPut(blobKey(id,'cards','role_old_witch','thumb'),pendingThemeFiles.thumb);pendingThemeFiles={display:null,thumb:null};saveState();await renderThemeEditor();renderEntityGrid('cards');if(currentId==='role_old_witch')renderEntityFront(entityById('cards','role_old_witch'))}
async function fallbackTheme(){const id=state.themes.selectedEditorId||'theme-sea';if(id==='theme-default')return;const t=themeById(id);t.mappings.role_old_witch={displayUrl:'',thumbUrl:'',bundledSea:true};await dbDelete(blobKey(id,'cards','role_old_witch','display'));await dbDelete(blobKey(id,'cards','role_old_witch','thumb'));saveState();await renderThemeEditor();renderEntityGrid('cards');if(currentId==='role_old_witch')renderEntityFront(entityById('cards','role_old_witch'))}

function bindCore(){
  $$('.nav').forEach(n=>n.onclick=()=>{$$('.page').forEach(p=>p.classList.toggle('active',p.id===n.dataset.page));$$('.nav').forEach(x=>x.classList.toggle('active',x===n));const p=$('#'+n.dataset.page);if(p)p.scrollTop=0});
  $$('.libtab').forEach(b=>b.onclick=()=>{$$('.libtab').forEach(x=>x.classList.toggle('active',x===b));$$('.libpane').forEach(p=>p.classList.toggle('active',p.id==='lib-'+b.dataset.lib));$('#library').scrollTop=0;if(b.dataset.lib==='themes')renderThemeEditor()});
  $$('[data-filter-kind]').forEach(row=>$$('.filter',row).forEach(b=>b.onclick=()=>{$$('.filter',row).forEach(x=>x.classList.toggle('active',x===b));if(row.dataset.filterKind==='cards')cardFilter=b.dataset.filter;else artifactFilter=b.dataset.filter;renderEntityGrid(row.dataset.filterKind)}));
  $('#closeEntityEditor').onclick=closeEntityEditor;$$('.face-switch button').forEach(b=>b.onclick=()=>setFace(b.dataset.face));
  $('#entityName').oninput=()=>{const e=entityById(currentKind,currentId);e.name=$('#entityName').value;saveState();renderEntityFront(e)};$('#entityInformation').oninput=()=>{const e=entityById(currentKind,currentId);e.information=$('#entityInformation').value;saveState();renderEntityFront(e)};
  $$('#factionSeg button').forEach(b=>b.onclick=()=>{const e=entityById(currentKind,currentId);if(!e||currentKind!=='cards')return;e.factionId=b.dataset.faction;saveState();renderEntityBack(e)});
  const flagMap={flagUseDay:'useDay',flagUseNight:'useNight',flagNightImmune:'nightImmune',flagLifeEnabled:'lifeEnabled',flagMultiTask:'multiTask',flagPassive:'passive',flagMultiNightActions:'multiNightActions',flagSoloWolfOnly:'soloWolfOnly',flagGroup7Official:'group7Official'};for(const [id,k] of Object.entries(flagMap))$('#'+id).onchange=()=>{const e=entityById(currentKind,currentId);e.flags[k]=$('#'+id).checked;saveState()};$('#flagLives').onchange=()=>{const e=entityById(currentKind,currentId);e.flags.lives=Number($('#flagLives').value);saveState()};$('#winCondition').oninput=()=>{const e=entityById(currentKind,currentId);e.winCondition=$('#winCondition').value;saveState()};
  for(const [id,k] of [['artifactOwnerSelection','ownerSelection'],['artifactPersistentOwner','persistentOwner'],['artifactRevealFollow','revealFollowTargetOnly']])$('#'+id).onchange=()=>{const e=entityById(currentKind,currentId);if(e&&e.artifact){e.artifact[k]=$('#'+id).checked;saveState()}};$('#artifactWakeRole').onchange=()=>{const e=entityById(currentKind,currentId);if(e&&e.artifact){e.artifact.wakeWithRoleId=$('#artifactWakeRole').value;saveState()}};$('#artifactWakeAction').onchange=()=>{const e=entityById(currentKind,currentId);if(e&&e.artifact){e.artifact.wakeWithActionId=$('#artifactWakeAction').value;saveState()}};
  $('#addFunction').onclick=()=>{const e=entityById(currentKind,currentId),list=actionList(currentKind==='artifacts'?'artifacts':'role'),a=list[0];e.functions.push({id:uid('fn'),actionId:a?.id||'',phase:'night',usageMode:'unlimited',usageCount:1,nightFromEnabled:false,nightFrom:1,nightToEnabled:false,nightTo:1,cooldownNights:0,minTargets:1,maxTargets:1,noSelf:false,allowDead:false,noTarget:false,multiPerson:false,allowConsecutive:true,passive:false,trigger:'',pushToPlayerWeb:false,targetPreviousCycleOnly:false,perUserLimit:0});saveState();renderEntityBack(e)};
  $('#passiveRuleEnabled').onchange=()=>{const e=entityById(currentKind,currentId);e.passiveRule.enabled=$('#passiveRuleEnabled').checked;saveState()};$('#passiveRuleType').onchange=()=>{const e=entityById(currentKind,currentId);e.passiveRule.type=$('#passiveRuleType').value;saveState()};$('#groupGateEnabled').onchange=()=>{const e=entityById(currentKind,currentId);e.groupActionGate.enabled=$('#groupGateEnabled').checked;saveState()};$('#groupGateAction').onchange=()=>{const e=entityById(currentKind,currentId);e.groupActionGate.actionId=$('#groupGateAction').value;saveState()};for(const id of ['gateExpelled','gateBlocked'])$('#'+id).onchange=()=>{const e=entityById(currentKind,currentId),arr=[];if($('#gateExpelled').checked)arr.push('expelled');if($('#gateBlocked').checked)arr.push('blocked');e.groupActionGate.blockOn=arr;saveState()};
  $$('#actionKindSeg button').forEach(b=>b.onclick=()=>{$$('#actionKindSeg button').forEach(x=>x.classList.toggle('active',x===b));actionKind=b.dataset.actionKind;renderActions()});$('#actionSearch').oninput=renderActions;$('#effectSearch').oninput=renderEffects;
  $('#sheetClose').onclick=closeSheet;$('#sheetCancel').onclick=closeSheet;$('#sheetSave').onclick=saveSheet;$('#editSheet').onclick=e=>{if(e.target===$('#editSheet'))closeSheet()};
  $$('#themeSeg button').forEach(b=>b.onclick=async()=>{state.themes.selectedEditorId=b.dataset.theme;state.themes.activeId=b.dataset.theme;saveState();await renderThemeEditor();renderEntityGrid('cards');if(currentKind==='cards'&&currentId)renderEntityFront(entityById(currentKind,currentId))});$('#themeDisplayFile').onchange=e=>pendingThemeFiles.display=e.target.files?.[0]||null;$('#themeThumbFile').onchange=e=>pendingThemeFiles.thumb=e.target.files?.[0]||null;$('#themeSave').onclick=saveTheme;$('#themeFallback').onclick=fallbackTheme;
}
async function boot(){await ensureDefaultThumb();bindCore();renderEntityGrid('cards');renderEntityGrid('artifacts');renderActions();renderEffects();renderAudio();await renderThemeEditor()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();