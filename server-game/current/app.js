(()=>{'use strict';

const VERSION='2.20';
const STATE_KEY='GMWW_V220_STATE';
const PREF_KEY='GMWW_V220_PREFS';
const OLD_STATE_KEYS=['GMWW_V219_STATE','GMWW_V218_STATE','GMWW_V217_STATE','GMWW_V216_STATE','GMWW_V215_STATE','GMWW_V214_STATE','GMWW_V213_STATE','GMWW_V212_STATE','GMWW_V211_STATE','GMWW_V210_STATE','GMWW_V209_STATE','GMWW_V208_STATE','GMWW_V207_STATE','GMWW_V206_STATE','GMWW_V205_STATE'];
const OLD_PREF_KEYS=['GMWW_V219_PREFS','GMWW_V218_PREFS','GMWW_V217_PREFS','GMWW_V216_PREFS','GMWW_V215_PREFS','GMWW_V214_PREFS','GMWW_V213_PREFS','GMWW_V212_PREFS','GMWW_V211_PREFS','GMWW_V210_PREFS','GMWW_V209_PREFS','GMWW_V208_PREFS','GMWW_V207_PREFS','GMWW_V206_PREFS','GMWW_V205_PREFS'];
const DB_NAME='GMWW_V208_THEME_ASSETS';
const DB_STORE='assets';

const THEME_UI_GROUPS=[
  {id:'background',title:'🌌 Hình nền',slots:[
    ['bg.home','Nền Trang Chủ'],['bg.deck','Nền Bộ Bài'],['bg.play','Nền Chơi'],['bg.library','Nền Thư Viện'],['bg.settings','Nền Cài Đặt']
  ]},
  {id:'banner',title:'🌄 Banner',slots:[
    ['banner.home','Banner Trang Chủ'],['banner.deck','Banner Bộ Bài'],['banner.play','Banner Chơi'],['banner.library','Banner Thư Viện'],['banner.settings','Banner Cài Đặt'],['banner.dawn','Làng Ơi! Dậy Đi']
  ]},
  {id:'large',title:'🐺 Icon / Hình lớn',slots:[
    ['ui.brandAvatar','Avatar Logo Trên Cùng'],['ui.homeMiniWolf','Avatar Trang Chủ'],['ui.homeStartWolf','Hình Nút Bắt Đầu'],['ui.homeRecentWolf','Hình Ván Gần Đây']
  ]},
  {id:'button',title:'◈ Nút / Điều hướng',slots:[
    ['ui.exploreDeck','Nút Khám Phá • Bộ Bài'],['ui.exploreMembers','Nút Khám Phá • Thành Viên'],['ui.exploreActions','Nút Khám Phá • Hành Động'],['ui.exploreFactions','Nút Khám Phá • Phe Phái'],['ui.exploreLibrary','Nút Khám Phá • Thư Viện'],['ui.exploreSettings','Nút Khám Phá • Cài Đặt'],['ui.bottomNavArt','Hình Thanh Điều Hướng']
  ]},
  {id:'library',title:'🗂 Giao diện Thư Viện',slots:[
    ['ui.libraryHeader','Đầu trang Thư Viện'],['ui.libraryTabs','Nền Tabs Thư Viện'],['ui.cardTile','Nền ô Lá Bài'],['ui.artifactTile','Nền ô ARTIFACTS'],['ui.actionTile','Nền ô Hành Động'],['ui.effectTile','Nền ô Hiệu Ứng'],['ui.themeTile','Nền ô Chủ Đề'],['ui.audioTile','Nền ô Âm Thanh']
  ]},
  {id:'game',title:'🎮 Giao diện Server Game',slots:[
    ['ui.memberPanel','Khung Thành Viên'],['ui.startPanel','Khung Bắt Đầu'],['ui.gamePanel','Khung Điều Khiển Ván'],['ui.nightPanel','Khung Ban Đêm'],['ui.morningPanel','Khung Buổi Sáng'],['ui.summaryPanel','Khung Tổng Kết'],['ui.waitingRoom','Khung Phòng Chờ']
  ]}
];

const DEFAULT_STATE={
  version:VERSION,
  cards:[{
    id:'role_old_witch',legacyId:'source-18',name:'Phù Thuỷ Già',factionId:'village',
    information:'Phe Dân. Mỗi đêm chọn Đuổi 1 người hoặc Hồi Sinh 1 người, không được làm cả hai. Không được Đuổi cùng một người trong 2 đêm liên tiếp. Hồi Sinh chỉ được dùng 1 lần trong ván và chỉ áp dụng cho người chết ở ngày trước hoặc đêm trước.',
    lives:1,
    flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},
    winCondition:'',
    passiveRule:{enabled:false,type:'stake_survive'},
    groupActionGate:{enabled:false,actionId:'',blockOn:['expelled','blocked']},
    functions:[
      {id:'fn_old_witch_exile',actionId:'action_exile',description:'Mỗi đêm Đuổi 1 người ra khỏi làng. Không được Đuổi cùng một người trong 2 đêm liên tiếp. Mỗi đêm chỉ chọn Đuổi hoặc Hồi Sinh, không thực hiện cả hai.',phase:'night',usageMode:'eachNight',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:false,passive:false,activation:'',pushToPlayerWeb:true,targetPreviousCycleOnly:false,perUserLimit:0},
      {id:'fn_old_witch_revive',actionId:'action_revive',description:'Hồi Sinh 1 người đã chết ở ngày trước hoặc đêm trước. Chỉ được dùng 1 lần trong ván. Mỗi đêm chỉ chọn Đuổi hoặc Hồi Sinh, không thực hiện cả hai.',phase:'night',usageMode:'onceGame',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:true,allowDead:true,noTarget:false,allowConsecutive:false,passive:false,activation:'',pushToPlayerWeb:true,targetPreviousCycleOnly:true,perUserLimit:0}
    ]
  }],
  artifacts:[{
    id:'artifact_mirror',legacyId:'atifat-1789042413093',name:'Tráng Gương',
    information:'A giữ Vai Trò Gốc và thứ tự thức gốc. Khi đến lượt thức của B, A thức cùng B và có thêm 1 lượt thực hiện Hành Động đã copy của B.',
    flags:{useDay:false,useNight:true,nightImmune:false,allowMultipleActions:false,passive:false,soloWolfOnly:false},
    artifact:{ownerSelection:false,persistentOwner:false,revealFollowTargetOnly:false,wakeWithRoleId:'',wakeWithActionId:''},
    winCondition:'',passiveRule:{enabled:false,type:'stake_survive'},groupActionGate:{enabled:false,actionId:'',blockOn:[]},
    functions:[{id:'fn_artifact_mirror',actionId:'action_mirror',phase:'night',usageMode:'onceGame',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:true,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:false,targetPreviousCycleOnly:false,perUserLimit:0}]
  }],
  actions:{
    role:[
      {id:'action_exile',legacyId:'1',name:'Đuổi Người',description:'Bà phù thủy già đuổi 1 người ra khỏi làng; các tác động lên người đó không có tác dụng.',legacyAudioFile:'duoi_nguoi.mp3',effectIds:['effect_exile']},
      {id:'action_revive',legacyId:'2',name:'Hồi Sinh',description:'Cứu sống một người đã chết.',legacyAudioFile:'hoi_sinh.mp3',effectIds:['effect_revive']}
    ],
    artifacts:[{id:'action_mirror',name:'Tráng Gương',description:'Sao chép chức năng của mục tiêu theo rule của ARTIFACTS.',effectIds:['effect_copy_functions']}]
  },
  effects:[
    {id:'effect_exile',name:'Đuổi',primitive:'EXPEL',duration:'nextDay',description:'Đuổi người chơi ra khỏi làng; khóa tác động và chức năng đến hết buổi sáng hôm sau.',webTemplate:{eventType:'EXPEL',emoji:'🚪',title:'BỊ ĐUỔI KHỎI LÀNG',requireAck:true,requireResponse:false}},
    {id:'effect_revive',name:'Hồi Sinh',primitive:'REVIVE',duration:'instant',description:'Hồi sinh người chơi hợp lệ và đưa họ trở lại trạng thái sống.',webTemplate:{eventType:'REVIVE',emoji:'✨',title:'ĐƯỢC HỒI SINH',requireAck:false,requireResponse:false}},
    {id:'effect_copy_functions',name:'Sao chép chức năng',primitive:'COPY_FUNCTIONS',duration:'night',description:'Cho chủ sở hữu thêm chức năng của mục tiêu theo rule ARTIFACTS.',webTemplate:{eventType:'COPY_FUNCTIONS',emoji:'🪞',title:'TRÁNG GƯƠNG',requireAck:false,requireResponse:false}}
  ],
  audio:{
    cards:[
      {id:'audio_role_old_witch',name:'Phù Thuỷ Già',targetId:'role_old_witch',sourceKey:'ROLE:source-18',fileName:'Phù Thuỷ Già.mp3',verifiedBinary:true},
      {id:'audio_group_wolves',name:'Bầy Sói',targetGroup:'wolves',sourceKey:'GROUP:WOLVES',fileName:'gmww-wolf-pack.m4a',verifiedBinary:true}
    ],
    artifacts:[{id:'audio_artifact_mirror',name:'Tráng Gương',targetId:'artifact_mirror',fileName:'',verifiedBinary:false}],
    actions:[
      {id:'audio_action_exile',name:'Đuổi Người',targetId:'action_exile',sourceKey:'ACTION:1',fileName:'duoi_nguoi.mp3',verifiedBinary:false},
      {id:'audio_action_revive',name:'Hồi Sinh',targetId:'action_revive',sourceKey:'ACTION:2',fileName:'hoi_sinh.mp3',verifiedBinary:false},
      {id:'audio_action_mirror',name:'Tráng Gương',targetId:'action_mirror',fileName:'',verifiedBinary:false}
    ],
    system:[
      {id:'audio_system_confirm',name:'Xác nhận',sourceKey:'SYSTEM:CONFIRM_TARGET',fileName:'gmww-confirm.m4a',verifiedBinary:true},
      {id:'audio_system_countdown',name:'Đếm ngược',sourceKey:'SYSTEM:DAY_COUNTDOWN_30',fileName:'gmww-countdown-30.m4a',verifiedBinary:true}
    ]
  },
  themes:{
    activeId:'theme-sea',selectedEditorId:'theme-sea',
    list:[
      {id:'theme-default',name:'Mặc định',builtin:true,locked:true,ui:{},mappings:{}},
      {id:'theme-sea',name:'Biển',builtin:true,locked:false,ui:{},mappings:{role_old_witch:{displayUrl:'',thumbUrl:'',bundledSea:true}}}
    ]
  }
};
const DEFAULT_PREFS={cards:{role_old_witch:{starred:true,starOrder:21,hidden:false}},artifacts:{artifact_mirror:{starred:true,starOrder:1,hidden:false}}};

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const clone=v=>JSON.parse(JSON.stringify(v));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function formatInformation(v){return String(v??'').replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean).map(x=>x?x.charAt(0).toLocaleUpperCase('vi-VN')+x.slice(1):x).join('\n')}
const uid=p=>p+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7);
function deepMerge(base,raw){if(!raw||typeof raw!=='object')return base;for(const k of Object.keys(raw)){if(raw[k]&&typeof raw[k]==='object'&&!Array.isArray(raw[k])&&base[k]&&typeof base[k]==='object'&&!Array.isArray(base[k]))deepMerge(base[k],raw[k]);else base[k]=raw[k]}return base}
function normFaction(v){if(v==='wolf'||v==='Sói')return'wolf';if(v==='third'||v==='Phe Ba')return'third';return'village'}
function normalizeFunction(f={}){
  const legacyTo=(f.nightToEnabled===false)?null:(f.nightTo??null);
  const target=Number(f.targetCount??f.maxTargets??f.minTargets??1);
  return{
    id:f.id||uid('fn'),actionId:f.actionId||(f.actionIds&&f.actionIds[0])||'',phase:f.phase||'night',
    usageMode:f.usageMode||f.usage||((f.limitEnabled&&Number(f.perGame)===1)?'onceGame':(f.limitEnabled?'nGame':'unlimited')),
    usageCount:Number(f.usageCount||f.perGame||1),
    fromNight:Number(f.fromNight??(f.nightFromEnabled?f.nightFrom:1)??1),
    toNight:f.toNight!==undefined?f.toNight:legacyTo,
    cooldownNights:Number(f.cooldownNights||0),targetCount:Number.isFinite(target)?Math.max(0,target):1,
    noSelf:f.noSelf!==undefined?!!f.noSelf:(f.selfTarget==='no'),allowDead:!!f.allowDead,noTarget:!!f.noTarget,
    allowConsecutive:f.allowConsecutive!==undefined?!!f.allowConsecutive:(f.allowConsecutive==='yes'),
    passive:!!f.passive,activation:f.activation||f.trigger||'',pushToPlayerWeb:!!f.pushToPlayerWeb,
    targetPreviousCycleOnly:!!f.targetPreviousCycleOnly,perUserLimit:Number(f.perUserLimit||0),
    description:f.description||f.desc||'',
    systemRequired:!!f.systemRequired,usesPackBite:!!f.usesPackBite,requiresNoOtherLivingWolf:!!f.requiresNoOtherLivingWolf,
    actorMayBeDead:!!f.actorMayBeDead,allowFriendlyFaction:!!f.allowFriendlyFaction,replacesWolfBite:!!f.replacesWolfBite,
    effectIds:Array.isArray(f.effectIds)?f.effectIds.slice():[]
  };
}
function normalizeEntity(e,kind){
  const x=clone(e||{});
  x.id=x.id||uid(kind==='cards'?'role':'artifact');x.name=x.name||'Chưa đặt tên';x.information=x.information||x.description||x.desc||'';
  if(kind==='cards')x.factionId=normFaction(x.factionId||x.faction);
  const oldFlags=x.flags||x.systemFlags||x.setup?.systemFlags||{};
  x.lives=Math.max(1,Number(x.lives??oldFlags.lives??1)||1);
  x.flags={
    useDay:!!(oldFlags.useDay??x.useDay),useNight:!!(oldFlags.useNight??x.useNight),
    nightImmune:!!(oldFlags.nightImmune??x.nightImmune),
    allowMultipleActions:!!(oldFlags.allowMultipleActions||oldFlags.multiTask||oldFlags.multiNightActions||x.multiTask||x.multiNightActions),
    passive:!!(oldFlags.passive??x.passive),soloWolfOnly:!!(oldFlags.soloWolfOnly??x.soloWolfOnly)
  };
  x.winCondition=x.winCondition||'';
  x.passiveRule=Object.assign({enabled:false,type:'stake_survive',firstTime:'',nextTime:'',onDeath:false,skipIfTargetAlreadyDead:false},x.passiveRule||{},x.passiveRules||{});
  x.groupActionGate=Object.assign({enabled:false,actionId:'',scope:'self',blockOn:[]},x.groupActionGate||{},Array.isArray(x.groupActionGates)&&x.groupActionGates[0]||{});
  x.specialRules=Object.assign({systemRequired:false,usesPackBite:false,requiresNoOtherLivingWolf:false,actorMayBeDead:false,allowFriendlyFaction:false,replacesWolfBite:false},x.specialRules||{});
  x.limits=x.limits||x.setup?.limits||'';
  x.conditions=x.conditions||x.setup?.conditions||'';
  x.attributes=x.attributes||x.setup?.attributes||'';
  const fs=x.functions||x.abilities||[];
  x.functions=fs.map(normalizeFunction);
  if(kind==='artifacts')x.artifact=Object.assign({ownerSelection:false,persistentOwner:false,revealFollowTargetOnly:false,wakeWithRoleId:'',wakeWithActionId:''},x.artifact||{});
  return x;
}
function migrateOld(raw){
  const s=clone(DEFAULT_STATE);if(!raw)return s;
  if(Array.isArray(raw.cards)&&raw.cards.length)s.cards=raw.cards.map(x=>normalizeEntity(x,'cards'));
  if(Array.isArray(raw.artifacts)&&raw.artifacts.length)s.artifacts=raw.artifacts.map(x=>normalizeEntity(x,'artifacts'));
  else if(Array.isArray(raw.atifats)&&raw.atifats.length)s.artifacts=raw.atifats.map(x=>normalizeEntity(x,'artifacts'));
  if(raw.actions){if(Array.isArray(raw.actions.role))s.actions.role=raw.actions.role.map(a=>({id:a.id,name:a.name,description:a.description||a.desc||'',effectIds:a.effectIds||[]}));const aa=raw.actions.artifacts||raw.actions.artifact;if(Array.isArray(aa))s.actions.artifacts=aa.map(a=>({id:a.id,name:a.name,description:a.description||a.desc||'',effectIds:a.effectIds||[]}))}
  if(Array.isArray(raw.effects))s.effects=raw.effects.map(e=>({id:e.id,name:e.name,primitive:e.primitive||e.type||'CUSTOM',duration:e.duration||'instant',description:e.description||e.desc||'',webTemplate:e.webTemplate||e.webInteraction||{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}}));
  if(raw.audio){
    if(Array.isArray(raw.audio)){for(const a of raw.audio){const scope=String(a.scope||'').toLowerCase();const k=scope.includes('artifact')?'artifacts':scope.includes('action')?'actions':scope.includes('system')?'system':'cards';s.audio[k].push(a)}}
    else if(typeof raw.audio==='object')s.audio=deepMerge(s.audio,raw.audio);
  }
  if(raw.themes)s.themes=deepMerge(s.themes,raw.themes);
  s.version=VERSION;return s;
}
function applyV210Rules(s){
  const witch=(s.cards||[]).find(x=>x.id==='role_old_witch'||x.legacyId==='source-18');
  if(witch){
    const oldInfo='Phe Dân. Mỗi đêm chọn Đuổi 1 người hoặc Hồi Sinh 1 người, không được làm cả hai. Hồi Sinh chỉ áp dụng cho người chết ở ngày trước hoặc đêm trước theo luật.';
    if(!witch.information||witch.information===oldInfo)witch.information=DEFAULT_STATE.cards[0].information;
    const exile=(witch.functions||[]).find(f=>f.id==='fn_old_witch_exile'||f.actionId==='action_exile'||String(f.actionId)==='1');
    if(exile){if(!String(exile.description||'').trim())exile.description=DEFAULT_STATE.cards[0].functions[0].description;exile.phase='night';exile.usageMode='eachNight';exile.usageCount=1;exile.targetCount=1;exile.noSelf=true;exile.allowDead=false;exile.allowConsecutive=false;exile.pushToPlayerWeb=true}
    const revive=(witch.functions||[]).find(f=>f.id==='fn_old_witch_revive'||f.actionId==='action_revive'||String(f.actionId)==='2');
    if(revive){if(!String(revive.description||'').trim())revive.description=DEFAULT_STATE.cards[0].functions[1].description;revive.phase='night';revive.usageMode='onceGame';revive.usageCount=1;revive.targetCount=1;revive.noSelf=true;revive.allowDead=true;revive.allowConsecutive=false;revive.pushToPlayerWeb=true;revive.targetPreviousCycleOnly=true}
  }
  const cardAudio=(s.audio&&s.audio.cards)||[];
  const witchAudio=cardAudio.filter(a=>a.targetId==='role_old_witch'||a.sourceKey==='ROLE:source-18'||a.name==='Phù Thuỷ Già');
  const keepCard=witchAudio[0]||{};
  Object.assign(keepCard,{id:'audio_role_old_witch',name:'Phù Thuỷ Già',targetId:'role_old_witch',sourceKey:'ROLE:source-18',fileName:'Phù Thuỷ Già.mp3',verifiedBinary:true});
  s.audio.cards=[keepCard,...cardAudio.filter(a=>!witchAudio.includes(a))];

  const actionAudio=(s.audio&&s.audio.actions)||[];
  const canonicalActions=[
    {id:'audio_action_exile',name:'Đuổi Người',targetId:'action_exile',sourceKey:'ACTION:1',fileName:'duoi_nguoi.mp3',verifiedBinary:false},
    {id:'audio_action_revive',name:'Hồi Sinh',targetId:'action_revive',sourceKey:'ACTION:2',fileName:'hoi_sinh.mp3',verifiedBinary:false}
  ];
  const otherActions=actionAudio.filter(a=>!canonicalActions.some(c=>a.id===c.id||a.targetId===c.targetId||a.sourceKey===c.sourceKey||a.name===c.name));
  s.audio.actions=[...canonicalActions,...otherActions];

  const currentCards=s.audio.cards||[];
  const wolfCandidates=currentCards.filter(a=>a.id==='audio_group_wolves'||a.sourceKey==='GROUP:WOLVES'||a.name==='Bầy Sói'||a.name==='Sói thức dậy');
  const wolfKeep=wolfCandidates[0]||{};
  Object.assign(wolfKeep,{id:'audio_group_wolves',name:'Bầy Sói',targetGroup:'wolves',sourceKey:'GROUP:WOLVES',fileName:'gmww-wolf-pack.m4a',verifiedBinary:true});
  s.audio.cards=[...s.audio.cards.filter(a=>!wolfCandidates.includes(a)),wolfKeep];

  const systemAudio=(s.audio&&s.audio.system)||[];
  const canonicalSystem=[
    {id:'audio_system_confirm',name:'Xác nhận',sourceKey:'SYSTEM:CONFIRM_TARGET',fileName:'gmww-confirm.m4a',verifiedBinary:true},
    {id:'audio_system_countdown',name:'Đếm ngược',sourceKey:'SYSTEM:DAY_COUNTDOWN_30',fileName:'gmww-countdown-30.m4a',verifiedBinary:true}
  ];
  const systemAliases=new Set(['audio_system_wolf','Sói thức dậy']);
  const otherSystem=systemAudio.filter(a=>!canonicalSystem.some(c=>a.id===c.id||a.sourceKey===c.sourceKey||a.name===c.name)&&!systemAliases.has(a.id)&&!systemAliases.has(a.name));
  s.audio.system=[...canonicalSystem,...otherSystem];

  const exileAction=(s.actions?.role||[]).find(a=>a.id==='action_exile'||String(a.legacyId)==='1');
  if(exileAction)Object.assign(exileAction,{legacyId:'1',name:'Đuổi Người',description:'Bà phù thủy già đuổi 1 người ra khỏi làng; các tác động lên người đó không có tác dụng.',legacyAudioFile:'duoi_nguoi.mp3'});
  const reviveAction=(s.actions?.role||[]).find(a=>a.id==='action_revive'||String(a.legacyId)==='2');
  if(reviveAction)Object.assign(reviveAction,{legacyId:'2',name:'Hồi Sinh',description:'Cứu sống một người đã chết.',legacyAudioFile:'hoi_sinh.mp3'});
  return s;
}
function loadState(){
  try{const cur=JSON.parse(localStorage.getItem(STATE_KEY)||'null');if(cur){const s=deepMerge(clone(DEFAULT_STATE),cur);s.cards=s.cards.map(x=>normalizeEntity(x,'cards'));s.artifacts=s.artifacts.map(x=>normalizeEntity(x,'artifacts'));return applyV210Rules(s)}}catch(_){}
  for(const k of OLD_STATE_KEYS){try{const raw=JSON.parse(localStorage.getItem(k)||'null');if(raw){const s=applyV210Rules(migrateOld(raw));localStorage.setItem(STATE_KEY,JSON.stringify(s));return s}}catch(_){}}
  return clone(DEFAULT_STATE);
}
function loadPrefs(){
  try{const cur=JSON.parse(localStorage.getItem(PREF_KEY)||'null');if(cur)return deepMerge(clone(DEFAULT_PREFS),cur)}catch(_){}
  for(const k of OLD_PREF_KEYS){try{const raw=JSON.parse(localStorage.getItem(k)||'null');if(raw){const p=clone(DEFAULT_PREFS);if(raw.cards)p.cards=raw.cards;if(raw.artifacts)p.artifacts=raw.artifacts;localStorage.setItem(PREF_KEY,JSON.stringify(p));return p}}catch(_){}}
  return clone(DEFAULT_PREFS);
}

let state=loadState(),prefs=loadPrefs();
let currentKind='cards',currentId='role_old_witch',editDraft=null,cardFilter='all',artifactFilter='all',actionKind='role',audioKind='cards',editContext=null,lastTouchMap=new WeakMap(),defaultThumb='',objectUrls=new Map();

function saveState(){state.version=VERSION;localStorage.setItem(STATE_KEY,JSON.stringify(state))}
function savePrefs(){localStorage.setItem(PREF_KEY,JSON.stringify(prefs))}
function entityList(kind){return kind==='artifacts'?state.artifacts:state.cards}
function entityById(kind,id){return entityList(kind).find(x=>x.id===id)||null}
function actionList(kind){return kind==='artifacts'?state.actions.artifacts:state.actions.role}
function actionById(id){return [...state.actions.role,...state.actions.artifacts].find(x=>String(x.id)===String(id))||null}
function effectById(id){return state.effects.find(x=>String(x.id)===String(id))||null}
function prefFor(kind,id){prefs[kind]=prefs[kind]||{};prefs[kind][id]=prefs[kind][id]||{starred:false,starOrder:null,hidden:false};return prefs[kind][id]}
function factionMeta(id){if(id==='wolf')return{id:'wolf',label:'Phe Sói',icon:'🐾'};if(id==='third')return{id:'third',label:'Phe Ba',icon:'🔥'};return{id:'village',label:'Phe Dân Làng',icon:'🍃'}}
function selectOptions(items,selected){return items.map(([v,l])=>'<option value="'+esc(v)+'" '+(String(v)===String(selected)?'selected':'')+'>'+esc(l)+'</option>').join('')}
function numOptions(min,max,selected){const a=[];for(let i=min;i<=max;i++)a.push([String(i),String(i)]);return selectOptions(a,String(selected))}
function themeById(id){return state.themes.list.find(x=>x.id===id)||state.themes.list[0]}

function openDb(){return new Promise((resolve,reject)=>{const q=indexedDB.open(DB_NAME,1);q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains(DB_STORE))q.result.createObjectStore(DB_STORE,{keyPath:'key'})};q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)})}
async function dbPut(key,blob){const db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put({key,blob,updatedAt:Date.now()});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}
async function dbGet(key){const db=await openDb();const out=await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readonly');const q=tx.objectStore(DB_STORE).get(key);q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>reject(q.error)});db.close();return out}
async function dbDelete(key){const db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).delete(key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}
function cardBlobKey(themeId,kind,id,assetKind){return themeId+'|'+kind+'|'+id+'|'+assetKind}
function uiBlobKey(themeId,slotId){return themeId+'|ui|'+slotId}
async function blobUrlFor(key){if(objectUrls.has(key))return objectUrls.get(key);try{const rec=await dbGet(key);if(rec&&rec.blob){const u=URL.createObjectURL(rec.blob);objectUrls.set(key,u);return u}}catch(_){}return''}
function imageToThumb(src){return new Promise(resolve=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=360;c.height=330;const g=c.getContext('2d');g.fillStyle='#071421';g.fillRect(0,0,360,330);const sw=im.naturalWidth||1024,sh=im.naturalHeight||936,scale=Math.max(360/sw,330/sh),dw=sw*scale,dh=sh*scale;g.drawImage(im,(360-dw)/2,(330-dh)/2,dw,dh);resolve(c.toDataURL('image/webp',.82))};im.onerror=()=>resolve(src);im.src=src})}
async function ensureDefaultThumb(){if(defaultThumb)return defaultThumb;defaultThumb=await imageToThumb(window.GMWW205_DEFAULT_DISPLAY||'');return defaultThumb}
async function resolveArtwork(kind,id,assetKind){
  const active=state.themes.activeId||'theme-sea',t=themeById(active),m=(t.mappings&&t.mappings[id])||{};
  if(active!=='theme-default'){
    const local=await blobUrlFor(cardBlobKey(active,kind,id,assetKind));if(local)return local;
    const url=String(assetKind==='thumb'?m.thumbUrl:m.displayUrl||'').trim();if(url)return url;
    if(id==='role_old_witch'&&kind==='cards'){if(assetKind==='thumb'&&window.GMWW208_SEA_THUMB)return window.GMWW208_SEA_THUMB;if(assetKind==='display'&&window.GMWW208_SEA_DISPLAY)return window.GMWW208_SEA_DISPLAY}
  }
  if(assetKind==='thumb')return await ensureDefaultThumb();return window.GMWW205_DEFAULT_DISPLAY||'';
}
async function resolveUiSlot(themeId,slotId){const local=await blobUrlFor(uiBlobKey(themeId,slotId));if(local)return local;const t=themeById(themeId),u=String(t.ui?.[slotId]?.url||'').trim();return u}
async function applyActiveThemeUi(){
  const id=state.themes.activeId||'theme-sea';
  const map={'bg.home':'#home','bg.play':'#start','bg.library':'#library','bg.settings':'#settings'};
  for(const [slot,sel] of Object.entries(map)){const el=$(sel);if(!el)continue;const src=await resolveUiSlot(id,slot);if(src){el.style.backgroundImage='linear-gradient(rgba(3,12,21,.50),rgba(3,12,21,.70)),url("'+src.replace(/"/g,'\"')+'")';el.style.backgroundSize='cover';el.style.backgroundPosition='center'}else{el.style.backgroundImage=''}}
}

function renderEntityGrid(kind){
  const grid=$(kind==='cards'?'#cardGrid':'#artifactGrid'),filter=kind==='cards'?cardFilter:artifactFilter;
  let list=entityList(kind).filter(e=>{const p=prefFor(kind,e.id);if(filter==='star')return p.starred&&!p.hidden;if(filter==='hidden')return p.hidden;return true});
  list.sort((a,b)=>{const pa=prefFor(kind,a.id),pb=prefFor(kind,b.id);if(pa.starred!==pb.starred)return pa.starred?-1:1;return(pa.starOrder||9999)-(pb.starOrder||9999)});
  grid.innerHTML=list.map(e=>{const p=prefFor(kind,e.id),sub=kind==='cards'?(factionMeta(e.factionId).icon+' '+factionMeta(e.factionId).label):'✦ ARTIFACTS';return '<article class="role-tile '+(p.hidden?'hidden-pref':'')+'" data-kind="'+kind+'" data-id="'+esc(e.id)+'"><div class="tile-actions"><button class="hide '+(p.hidden?'on':'')+'" data-pref="hide">'+(p.hidden?'◉':'◌')+'</button><button class="star '+(p.starred?'on':'')+'" data-pref="star">'+(p.starred?'★':'☆')+'</button></div><img data-thumb-kind="'+kind+'" data-thumb-id="'+esc(e.id)+'" alt=""><h3>'+esc(e.name)+'</h3><small>'+esc(sub)+(p.hidden?' • Tạm ẩn':'')+'</small></article>'}).join('');
  list.forEach(async e=>{const im=$('[data-thumb-kind="'+kind+'"][data-thumb-id="'+CSS.escape(e.id)+'"]');if(im)im.src=await resolveArtwork(kind,e.id,'thumb')});
  $$('[data-kind="'+kind+'"][data-id]',grid).forEach(tile=>tile.onclick=ev=>{const pref=ev.target.closest('[data-pref]');if(pref){ev.stopPropagation();togglePref(kind,tile.dataset.id,pref.dataset.pref);return}openEntityEditor(kind,tile.dataset.id)});
}
function togglePref(kind,id,type){const p=prefFor(kind,id);if(type==='star'){if(p.starred){p.starred=false;p.starOrder=null}else{p.hidden=false;p.starred=true;const orders=Object.values(prefs[kind]||{}).filter(x=>x.starred).map(x=>Number(x.starOrder)||0);p.starOrder=Math.max(0,...orders)+1}}else{p.hidden=!p.hidden;if(p.hidden){p.starred=false;p.starOrder=null}}savePrefs();renderEntityGrid(kind)}

async function renderEntityFront(){
  const e=editDraft;if(!e)return;const card=$('#playerCard'),badge=$('#playerFactionBadge');
  card.className='player-card '+(currentKind==='artifacts'?'artifact':(e.factionId||'village'));
  $('#playerName').textContent=(e.name||'').toUpperCase();
  if(currentKind==='cards'){const f=factionMeta(e.factionId);badge.textContent=f.icon+' '+f.label}else badge.textContent='✦ ARTIFACTS';
  $('#playerInformation').textContent=formatInformation(e.information||'');
  $('#playerDisplay').src=await resolveArtwork(currentKind,e.id,'display');
}
function actionOptions(selected){const k=currentKind==='artifacts'?'artifacts':'role';return actionList(k).map(a=>'<option value="'+esc(a.id)+'" '+(String(a.id)===String(selected)?'selected':'')+'>'+esc(a.name)+'</option>').join('')}
function functionHtml(fn,index){
  const to=fn.toNight===null||fn.toNight===''?'end':String(fn.toNight);
  return '<div class="function-card" data-fn-index="'+index+'"><div class="function-head"><b>Hành Động #'+(index+1)+'</b><button data-remove-fn="'+index+'" aria-label="Xoá">×</button></div>'+
    '<div class="function-grid">'+
      '<label class="full">Hành Động<select data-f="actionId">'+actionOptions(fn.actionId)+'</select></label>'+
      '<label class="full">Mô tả riêng trên Lá<textarea class="function-description" data-t="description">'+esc(fn.description||'')+'</textarea></label>'+
      '<label>Phase<select data-f="phase">'+selectOptions([['night','Ban Đêm'],['day','Ban Ngày'],['setup','Đầu Ván / Setup'],['trigger','Theo sự kiện']],fn.phase||'night')+'</select></label>'+
      '<label>Giới hạn sử dụng<select data-f="usageMode">'+selectOptions([['unlimited','Không giới hạn'],['eachNight','Mỗi đêm'],['eachDay','Mỗi ngày'],['onceGame','1 lần / ván'],['nGame','N lần / ván'],['nPerNight','N lần / đêm']],fn.usageMode||'unlimited')+'</select></label>'+
      '<label>Số lần<select data-f="usageCount">'+numOptions(1,10,fn.usageCount||1)+'</select></label>'+
      '<label>Cooldown (đêm)<select data-f="cooldownNights">'+numOptions(0,10,fn.cooldownNights||0)+'</select></label>'+
      '<label>Số mục tiêu<select data-f="targetCount">'+numOptions(0,8,fn.targetCount??1)+'</select></label>'+
      '<label>Giới hạn mỗi người<select data-f="perUserLimit">'+numOptions(0,5,fn.perUserLimit||0)+'</select></label>'+
      '<div class="range-row"><label>Từ đêm<select data-f="fromNight">'+numOptions(1,20,fn.fromNight||1)+'</select></label><label>Đến đêm<select data-f="toNight"><option value="end" '+(to==='end'?'selected':'')+'>Hết ván</option>'+numOptions(1,20,to)+'</select></label></div>'+
      '<label class="full">Kích hoạt khi<select data-f="activation">'+selectOptions([['','Chủ động / Theo lượt'],['stake_execution','Bị Treo Cổ'],['SOURCE_DEATH','Nguồn chết'],['morning','Buổi sáng'],['night_start','Bắt đầu đêm'],['day_start','Bắt đầu ngày']],fn.activation||'')+'</select></label>'+
    '</div>'+
    '<div class="function-checks">'+
      checkHtml('noSelf','Không được chọn bản thân',fn.noSelf)+
      checkHtml('allowDead','Cho phép chọn người đã chết',fn.allowDead)+
      checkHtml('noTarget','Không cần chọn mục tiêu',fn.noTarget)+
      checkHtml('allowConsecutive','Cho phép chọn cùng mục tiêu liên tiếp',fn.allowConsecutive)+
      checkHtml('passive','Hành Động thụ động',fn.passive)+
      checkHtml('targetPreviousCycleOnly','Chỉ mục tiêu chu kỳ trước',fn.targetPreviousCycleOnly)+
      checkHtml('pushToPlayerWeb','Đẩy xuống Player Web',fn.pushToPlayerWeb)+
      checkHtml('systemRequired','Yêu cầu Hệ Thống',fn.systemRequired)+
      checkHtml('usesPackBite','Dùng Sói Cắn chung',fn.usesPackBite)+
      checkHtml('requiresNoOtherLivingWolf','Chỉ khi không còn Sói khác sống',fn.requiresNoOtherLivingWolf)+
      checkHtml('actorMayBeDead','Người thực hiện có thể đã chết',fn.actorMayBeDead)+
      checkHtml('allowFriendlyFaction','Cho phép chọn cùng Phe',fn.allowFriendlyFaction)+
      checkHtml('replacesWolfBite','Thay thế Sói Cắn',fn.replacesWolfBite)+
    '</div></div>';
}
function checkHtml(key,label,checked){return '<label class="check"><input type="checkbox" data-b="'+key+'" '+(checked?'checked':'')+'><span>'+esc(label)+'</span></label>'}
function renderEntityBack(){
  const e=editDraft;if(!e)return;
  $('#entitySettingsTitle').textContent=currentKind==='cards'?'Cài đặt Lá Bài':'Cài đặt ARTIFACTS';
  $('#entityName').value=e.name||'';$('#entityInformation').value=e.information||'';
  $('#factionBlock').classList.toggle('hidden',currentKind!=='cards');$('#livesField').classList.toggle('hidden',currentKind!=='cards');
  if(currentKind==='cards')$$('#factionSeg button').forEach(b=>b.classList.toggle('active',b.dataset.faction===e.factionId));
  $('#entityLives').value=Math.max(1,Number(e.lives||1));
  const f=e.flags||{};$('#flagUseDay').checked=!!f.useDay;$('#flagUseNight').checked=!!f.useNight;$('#flagNightImmune').checked=!!f.nightImmune;$('#flagAllowMultipleActions').checked=!!f.allowMultipleActions;$('#flagPassive').checked=!!f.passive;$('#flagSoloWolfOnly').checked=!!f.soloWolfOnly;$('#winCondition').value=e.winCondition||'';
  $('#passiveRuleEnabled').checked=!!e.passiveRule?.enabled;$('#passiveRuleType').value=e.passiveRule?.type||'stake_survive';
  $('#passiveFirstTime').value=e.passiveRule?.firstTime||'';$('#passiveNextTime').value=e.passiveRule?.nextTime||'';$('#passiveOnDeath').checked=!!e.passiveRule?.onDeath;$('#passiveSkipDead').checked=!!e.passiveRule?.skipIfTargetAlreadyDead;
  $('#groupGateEnabled').checked=!!e.groupActionGate?.enabled;$('#groupGateAction').innerHTML='<option value="">Chọn Hành Động</option>'+actionList(currentKind==='artifacts'?'artifacts':'role').map(a=>'<option value="'+esc(a.id)+'" '+(String(a.id)===String(e.groupActionGate?.actionId)?'selected':'')+'>'+esc(a.name)+'</option>').join('');
  $('#groupGateScope').value=e.groupActionGate?.scope||'self';$('#gateExpelled').checked=(e.groupActionGate?.blockOn||[]).includes('expelled');$('#gateBlocked').checked=(e.groupActionGate?.blockOn||[]).includes('blocked');
  const sr=e.specialRules||{};$('#ruleSystemRequired').checked=!!sr.systemRequired;$('#ruleUsesPackBite').checked=!!sr.usesPackBite;$('#ruleRequiresSoloWolf').checked=!!sr.requiresNoOtherLivingWolf;$('#ruleActorMayBeDead').checked=!!sr.actorMayBeDead;$('#ruleAllowFriendlyFaction').checked=!!sr.allowFriendlyFaction;$('#ruleReplacesWolfBite').checked=!!sr.replacesWolfBite;
  $('#specialLimits').value=typeof e.limits==='string'?e.limits:JSON.stringify(e.limits||'');$('#specialConditions').value=typeof e.conditions==='string'?e.conditions:JSON.stringify(e.conditions||'');$('#specialAttributes').value=typeof e.attributes==='string'?e.attributes:JSON.stringify(e.attributes||'');
  $('#artifactSpecific').classList.toggle('hidden',currentKind!=='artifacts');
  if(currentKind==='artifacts'){const a=e.artifact||{};$('#artifactOwnerSelection').checked=!!a.ownerSelection;$('#artifactPersistentOwner').checked=!!a.persistentOwner;$('#artifactRevealFollow').checked=!!a.revealFollowTargetOnly;$('#artifactWakeRole').innerHTML='<option value="">Không</option><option value="source-2" '+(a.wakeWithRoleId==='source-2'?'selected':'')+'>Tiên Tri</option>';$('#artifactWakeAction').innerHTML='<option value="">Không</option>'+state.actions.role.map(x=>'<option value="'+esc(x.id)+'" '+(String(a.wakeWithActionId)===String(x.id)?'selected':'')+'>'+esc(x.name)+'</option>').join('')}
  $('#functionList').innerHTML=(e.functions||[]).map(functionHtml).join('');bindFunctionControls();
}
function bindFunctionControls(){
  $$('#functionList .function-card').forEach(row=>{const idx=Number(row.dataset.fnIndex),fn=editDraft.functions[idx];
    $$('select[data-f]',row).forEach(s=>s.onchange=()=>{const k=s.dataset.f;if(k==='toNight')fn[k]=s.value==='end'?null:Number(s.value);else if(['usageCount','cooldownNights','targetCount','fromNight','perUserLimit'].includes(k))fn[k]=Number(s.value);else fn[k]=s.value;if(k==='targetCount'&&fn.targetCount>0)fn.noTarget=false;renderEntityFront()});
    $$('textarea[data-t]',row).forEach(t=>t.oninput=()=>{fn[t.dataset.t]=t.value});
    $$('input[data-b]',row).forEach(c=>c.onchange=()=>{const k=c.dataset.b;fn[k]=c.checked;if(k==='noTarget'&&c.checked)fn.targetCount=0;if(k==='noTarget'&&!c.checked&&fn.targetCount===0)fn.targetCount=1;renderEntityBack()});
  });
  $$('[data-remove-fn]').forEach(b=>b.onclick=()=>{editDraft.functions.splice(Number(b.dataset.removeFn),1);renderEntityBack()});
}
function openEntityEditor(kind,id){currentKind=kind;currentId=id;const src=entityById(kind,id);if(!src)return;editDraft=normalizeEntity(src,kind);$('#libraryHome').classList.add('hidden');$('#entityEditor').classList.remove('hidden');setFace('front');renderEntityBack();renderEntityFront();$('#library').scrollTop=0}
function closeEntityEditor(){editDraft=null;$('#entityEditor').classList.add('hidden');$('#libraryHome').classList.remove('hidden');renderEntityGrid(currentKind);$('#library').scrollTop=0}
function saveEntity(){if(!editDraft)return;const list=entityList(currentKind),i=list.findIndex(x=>x.id===currentId);if(i>=0)list[i]=clone(editDraft);saveState();renderEntityGrid(currentKind);closeEntityEditor()}
function deleteEntity(){if(!editDraft)return;if(!confirm('Xoá "'+(editDraft.name||'Lá này')+'"?'))return;const list=entityList(currentKind),i=list.findIndex(x=>x.id===currentId);if(i>=0)list.splice(i,1);if(prefs[currentKind])delete prefs[currentKind][currentId];saveState();savePrefs();closeEntityEditor()}
function setFace(face){$$('.face-switch button').forEach(b=>b.classList.toggle('active',b.dataset.face===face));$$('.face').forEach(f=>f.classList.toggle('active',f.id===(face==='front'?'entityFront':'entityBack')))}
let faceTouchStart=null;
function bindFaceSwipe(){
  const editor=$('#entityEditor');
  editor.addEventListener('touchstart',e=>{if(e.touches.length!==1)return;const t=e.touches[0];faceTouchStart={x:t.clientX,y:t.clientY}},{passive:true});
  editor.addEventListener('touchend',e=>{if(!faceTouchStart||!e.changedTouches.length)return;const t=e.changedTouches[0],dx=t.clientX-faceTouchStart.x,dy=t.clientY-faceTouchStart.y;faceTouchStart=null;if(Math.abs(dx)<55||Math.abs(dx)<=Math.abs(dy)*1.25)return;const front=$('#entityFront').classList.contains('active');if(dx<0&&front)setFace('back');else if(dx>0&&!front)setFace('front')},{passive:true});
}

function renderActions(){const q=($('#actionSearch').value||'').toLowerCase().trim(),list=actionList(actionKind).filter(a=>!q||String(a.name).toLowerCase().includes(q));$('#actionGrid').innerHTML='<button class="compact-entry add-only" id="addActionBox" aria-label="Thêm">＋</button>'+list.map(a=>'<article class="compact-entry" data-action-id="'+esc(a.id)+'"><b>'+esc(a.name)+'</b></article>').join('');$$('[data-action-id]').forEach(el=>bindDouble(el,()=>openActionEditor(el.dataset.actionId)));$('#addActionBox').onclick=createAction}
function renderEffects(){const q=($('#effectSearch').value||'').toLowerCase().trim(),list=state.effects.filter(e=>!q||String(e.name).toLowerCase().includes(q));$('#effectGrid').innerHTML='<button class="compact-entry add-only" id="addEffectBox" aria-label="Thêm">＋</button>'+list.map(e=>'<article class="compact-entry" data-effect-id="'+esc(e.id)+'"><b>'+esc(e.name)+'</b></article>').join('');$$('[data-effect-id]').forEach(el=>bindDouble(el,()=>openEffectEditor(el.dataset.effectId)));$('#addEffectBox').onclick=createEffect}
function bindDouble(el,cb){el.addEventListener('dblclick',cb);el.addEventListener('touchend',()=>{const now=Date.now(),prev=lastTouchMap.get(el)||0;if(now-prev<420){lastTouchMap.set(el,0);cb()}else lastTouchMap.set(el,now)},{passive:true})}
function showSheet(title,html,ctx){editContext=ctx;$('#sheetTitle').textContent=title;$('#sheetBody').innerHTML=html;$('#editSheet').classList.remove('hidden')}
function closeSheet(){$('#editSheet').classList.add('hidden');editContext=null}
function openActionEditor(id){const a=actionById(id);if(!a)return;showSheet('Hành Động • '+a.name,'<div class="form-grid"><label class="full">ID<input id="editActionId" value="'+esc(a.id)+'" readonly></label><label class="full">Tên<input id="editActionName" value="'+esc(a.name)+'"></label><label class="full">Mô tả<textarea id="editActionDescription">'+esc(a.description||'')+'</textarea></label><label class="full">Hiệu Ứng liên kết<select id="editActionEffect"><option value="">Không</option>'+state.effects.map(e=>'<option value="'+esc(e.id)+'" '+((a.effectIds||[]).includes(e.id)?'selected':'')+'>'+esc(e.name)+'</option>').join('')+'</select></label></div>',{type:'action',id})}
function openEffectEditor(id){const e=effectById(id);if(!e)return;const w=e.webTemplate||{};showSheet('Hiệu Ứng • '+e.name,'<div class="form-grid"><label class="full">ID<input id="editEffectId" value="'+esc(e.id)+'" readonly></label><label class="full">Tên<input id="editEffectName" value="'+esc(e.name)+'"></label><label>Primitive<select id="editPrimitive">'+selectOptions([['EXPEL','EXPEL'],['REVIVE','REVIVE'],['KILL','KILL'],['PROTECT','PROTECT'],['BLOCK','BLOCK'],['TRANSFER_EFFECT','TRANSFER_EFFECT'],['REVEAL_FACTION','REVEAL_FACTION'],['REVEAL_ROLE','REVEAL_ROLE'],['COPY_FUNCTIONS','COPY_FUNCTIONS'],['CUSTOM','CUSTOM']],e.primitive)+'</select></label><label>Thời lượng<select id="editDuration">'+selectOptions([['instant','Tức thời'],['night','Đêm đó'],['nextDay','Đến hết sáng hôm sau'],['untilRemoved','Đến khi gỡ']],e.duration)+'</select></label><label class="full">Mô tả Engine<textarea id="editEffectDescription">'+esc(e.description||'')+'</textarea></label><label>Event type<input id="webEventType" value="'+esc(w.eventType||'')+'"></label><label>Emoji<input id="webEmoji" value="'+esc(w.emoji||'')+'"></label><label class="full">Tiêu đề Player Web<input id="webTitle" value="'+esc(w.title||'')+'"></label></div><div class="check-grid" style="margin-top:8px"><label class="check"><input type="checkbox" id="webRequireAck" '+(w.requireAck?'checked':'')+'><span>Yêu cầu xác nhận</span></label><label class="check"><input type="checkbox" id="webRequireResponse" '+(w.requireResponse?'checked':'')+'><span>Yêu cầu phản hồi</span></label></div>',{type:'effect',id})}
function createAction(){const a={id:uid(actionKind==='role'?'action':'artifact_action'),name:'Hành Động Mới',description:'',effectIds:[]};actionList(actionKind).push(a);saveState();renderActions();openActionEditor(a.id)}
function createEffect(){const e={id:uid('effect'),name:'Hiệu Ứng Mới',primitive:'CUSTOM',duration:'instant',description:'',webTemplate:{eventType:'',emoji:'',title:'',requireAck:false,requireResponse:false}};state.effects.push(e);saveState();renderEffects();openEffectEditor(e.id)}
function saveSheet(){if(!editContext)return;if(editContext.type==='action'){const a=actionById(editContext.id);a.name=($('#editActionName').value||'').trim()||a.name;a.description=$('#editActionDescription').value||'';a.effectIds=$('#editActionEffect').value?[$('#editActionEffect').value]:[];saveState();renderActions()}else if(editContext.type==='effect'){const e=effectById(editContext.id);e.name=($('#editEffectName').value||'').trim()||e.name;e.primitive=$('#editPrimitive').value;e.duration=$('#editDuration').value;e.description=$('#editEffectDescription').value||'';e.webTemplate={eventType:$('#webEventType').value||'',emoji:$('#webEmoji').value||'',title:$('#webTitle').value||'',requireAck:$('#webRequireAck').checked,requireResponse:$('#webRequireResponse').checked};saveState();renderEffects()}closeSheet()}

function renderThemeSeg(){const holder=$('#themeSeg');holder.innerHTML=state.themes.list.map(t=>'<button data-theme="'+esc(t.id)+'" class="'+(t.id===state.themes.selectedEditorId?'active':'')+'">'+esc(t.name)+'</button>').join('');$$('[data-theme]',holder).forEach(b=>b.onclick=()=>{state.themes.selectedEditorId=b.dataset.theme;state.themes.activeId=b.dataset.theme;saveState();renderTheme();applyActiveThemeUi();renderEntityGrid('cards');renderEntityGrid('artifacts')})}
async function renderTheme(){
  renderThemeSeg();const themeId=state.themes.selectedEditorId||state.themes.activeId||'theme-sea';
  const sections=$('#themeUiSections');sections.innerHTML='';
  for(const group of THEME_UI_GROUPS){const sec=document.createElement('details');sec.className='theme-section theme-collapsible';sec.innerHTML='<summary class="theme-section-head"><h3>'+esc(group.title)+'</h3></summary><div class="theme-slot-list"></div>';sections.appendChild(sec);const list=$('.theme-slot-list',sec);for(const [slotId,label] of group.slots){const src=await resolveUiSlot(themeId,slotId);const row=document.createElement('div');row.className='theme-slot';row.dataset.slotId=slotId;row.innerHTML='<img class="theme-slot-preview" alt=""><div class="theme-slot-main"><b>'+esc(label)+'</b><input type="url" placeholder="Link ảnh (không bắt buộc)" value="'+esc(themeById(themeId).ui?.[slotId]?.url||'')+'"></div><div class="theme-slot-actions"><button data-upload-slot="'+esc(slotId)+'" title="Tải ảnh">↑</button><button data-clear-slot="'+esc(slotId)+'" title="Mặc định">↺</button></div>';$('.theme-slot-preview',row).src=src||'';list.appendChild(row);$('input',row).onchange=()=>saveUiSlotUrl(themeId,slotId,$('input',row).value);$('[data-upload-slot]',row).onclick=()=>pickUiSlotFile(themeId,slotId);$('[data-clear-slot]',row).onclick=()=>clearUiSlot(themeId,slotId)}}
  await renderThemeEntityRows(themeId,'cards',$('#themeCardRows'));
  await renderThemeEntityRows(themeId,'artifacts',$('#themeArtifactRows'));
}
async function renderThemeEntityRows(themeId,kind,holder){
  if(!holder)return;holder.innerHTML='';
  for(const c of entityList(kind)){
    const src=await resolveArtwork(kind,c.id,'thumb'),m=themeById(themeId).mappings?.[c.id]||{};
    const row=document.createElement('div');row.className='theme-card-row';
    row.innerHTML='<img alt=""><div><b>'+esc(c.name)+'</b><small>Thumbnail / Display riêng</small><div class="form-grid" style="margin-top:6px"><label>Display URL<input data-theme-display-url value="'+esc(m.displayUrl||'')+'"></label><label>Thumbnail URL<input data-theme-thumb-url value="'+esc(m.thumbUrl||'')+'"></label></div></div><div class="theme-slot-actions"><button data-theme-upload="display" title="Display">D</button><button data-theme-upload="thumb" title="Thumbnail">T</button><button data-theme-clear title="Mặc định">↺</button></div>';
    $('img',row).src=src;holder.appendChild(row);
    $('[data-theme-display-url]',row).onchange=()=>saveEntityThemeUrl(themeId,kind,c.id,'display',$('[data-theme-display-url]',row).value);
    $('[data-theme-thumb-url]',row).onchange=()=>saveEntityThemeUrl(themeId,kind,c.id,'thumb',$('[data-theme-thumb-url]',row).value);
    $$('[data-theme-upload]',row).forEach(b=>b.onclick=()=>pickEntityThemeFile(themeId,kind,c.id,b.dataset.themeUpload));
    $('[data-theme-clear]',row).onclick=()=>clearEntityTheme(themeId,kind,c.id);
  }
}
async function saveUiSlotUrl(themeId,slotId,url){const t=themeById(themeId);t.ui=t.ui||{};t.ui[slotId]=t.ui[slotId]||{};t.ui[slotId].url=String(url||'').trim();saveState();await renderTheme();await applyActiveThemeUi()}
function pickFile(cb){const i=document.createElement('input');i.type='file';i.accept='image/*';i.hidden=true;document.body.appendChild(i);i.onchange=()=>{const f=i.files?.[0];i.remove();if(f)cb(f)};i.click()}
function pickUiSlotFile(themeId,slotId){pickFile(async f=>{await dbPut(uiBlobKey(themeId,slotId),f);objectUrls.delete(uiBlobKey(themeId,slotId));await renderTheme();await applyActiveThemeUi()})}
async function clearUiSlot(themeId,slotId){const t=themeById(themeId);if(t.ui)delete t.ui[slotId];await dbDelete(uiBlobKey(themeId,slotId)).catch(()=>{});objectUrls.delete(uiBlobKey(themeId,slotId));saveState();await renderTheme();await applyActiveThemeUi()}
function saveEntityThemeUrl(themeId,kind,entityId,assetKind,url){const t=themeById(themeId);t.mappings=t.mappings||{};t.mappings[entityId]=t.mappings[entityId]||{};t.mappings[entityId][assetKind==='display'?'displayUrl':'thumbUrl']=String(url||'').trim();saveState();renderTheme();renderEntityGrid(kind)}
function pickEntityThemeFile(themeId,kind,entityId,assetKind){pickFile(async f=>{await dbPut(cardBlobKey(themeId,kind,entityId,assetKind),f);objectUrls.delete(cardBlobKey(themeId,kind,entityId,assetKind));await renderTheme();renderEntityGrid(kind)})}
async function clearEntityTheme(themeId,kind,entityId){const t=themeById(themeId);t.mappings=t.mappings||{};t.mappings[entityId]={displayUrl:'',thumbUrl:'',bundledSea:kind==='cards'&&entityId==='role_old_witch'};for(const k of ['display','thumb']){await dbDelete(cardBlobKey(themeId,kind,entityId,k)).catch(()=>{});objectUrls.delete(cardBlobKey(themeId,kind,entityId,k))}saveState();await renderTheme();renderEntityGrid(kind)}
function addTheme(){const name=prompt('Tên Chủ Đề mới');if(!String(name||'').trim())return;const id='theme-'+Date.now().toString(36),src=themeById(state.themes.activeId);state.themes.list.push({id,name:String(name).trim(),builtin:false,locked:false,ui:clone(src.ui||{}),mappings:clone(src.mappings||{})});state.themes.selectedEditorId=id;state.themes.activeId=id;saveState();renderTheme()}

function audioBlobKey(kind,id){return 'audio|'+kind+'|'+id}
function bundledAudioBlob(a){const src=a?.sourceKey&&window.GMWW_V1_AUDIO?.[a.sourceKey];if(!src?.base64)return null;try{const raw=atob(src.base64),u8=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)u8[i]=raw.charCodeAt(i);return new Blob([u8],{type:src.type||'audio/mpeg'})}catch(_){return null}}
async function audioHasFile(a){if(a?.sourceKey&&window.GMWW_V1_AUDIO?.[a.sourceKey]?.base64)return true;if(a?.url)return true;const rec=await dbGet(audioBlobKey(audioKind,a.id)).catch(()=>null);return rec?.blob instanceof Blob}
async function renderAudio(){const list=state.audio[audioKind]||[];const resolved=await Promise.all(list.map(async a=>({a,ok:await audioHasFile(a)})));$('#audioGrid').innerHTML='<button class="audio-add-row" id="addAudioBox" aria-label="Thêm">＋</button>'+resolved.map(({a,ok})=>{const file=String(a.fileName||'').trim(),meta=file?(file+' • '+(ok?'OK':'Rỗng')):(ok?'OK':'Rỗng');return '<article class="audio-row" data-audio-id="'+esc(a.id)+'"><div class="audio-row-main"><b>'+esc(a.name)+'</b><small>'+esc(meta)+'</small></div><div class="audio-row-actions"><button data-audio-play title="Phát">▶</button><button class="replace-audio" data-audio-replace title="Thay thế">Thay thế</button><button class="delete-audio" data-audio-delete title="Xoá">🗑</button></div></article>'}).join('');
  $('#addAudioBox').onclick=()=>{const name=prompt('Tên Âm Thanh');if(!String(name||'').trim())return;list.unshift({id:uid('audio'),name:String(name).trim(),fileName:'',verifiedBinary:false});saveState();renderAudio()};
  $$('[data-audio-id]').forEach(row=>{const a=list.find(x=>String(x.id)===String(row.dataset.audioId));$('[data-audio-play]',row).onclick=()=>playAudioItem(a);$('[data-audio-replace]',row).onclick=()=>replaceAudioItem(a);$('[data-audio-delete]',row).onclick=()=>deleteAudioItem(a)});
}
async function playAudioItem(a){if(!a)return;let src='',localUrl=false;const rec=await dbGet(audioBlobKey(audioKind,a.id)).catch(()=>null);let blob=rec?.blob instanceof Blob?rec.blob:null;if(!blob)blob=bundledAudioBlob(a);if(blob){src=URL.createObjectURL(blob);localUrl=true}else if(a.url)src=a.url;if(!src){alert('Âm Thanh này đang Rỗng.');return}const au=new Audio(src);au.preload='auto';const cleanup=()=>{if(localUrl)URL.revokeObjectURL(src)};au.onended=cleanup;au.onerror=()=>{cleanup();alert('Không thể phát file Âm Thanh.')};try{await au.play()}catch(e){cleanup();alert('Không thể phát file Âm Thanh.')}}
function replaceAudioItem(a){if(!a)return;const i=document.createElement('input');i.type='file';i.accept='audio/*';i.hidden=true;document.body.appendChild(i);i.onchange=async()=>{const f=i.files?.[0];i.remove();if(!f)return;await dbPut(audioBlobKey(audioKind,a.id),f);a.fileName=f.name;a.verifiedBinary=true;delete a.status;saveState();renderAudio()};i.click()}
async function deleteAudioItem(a){if(!a||!confirm('Xoá Âm Thanh "'+(a.name||'')+'"?'))return;const list=state.audio[audioKind]||[],i=list.findIndex(x=>String(x.id)===String(a.id));if(i>=0)list.splice(i,1);await dbDelete(audioBlobKey(audioKind,a.id)).catch(()=>{});saveState();renderAudio()}

function bindCore(){
  $$('.nav').forEach(n=>n.onclick=()=>{$$('.page').forEach(p=>p.classList.toggle('active',p.id===n.dataset.page));$$('.nav').forEach(x=>x.classList.toggle('active',x===n));const p=$('#'+n.dataset.page);if(p)p.scrollTop=0});
  $$('.libtab').forEach(b=>b.onclick=()=>{$$('.libtab').forEach(x=>x.classList.toggle('active',x===b));$$('.libpane').forEach(p=>p.classList.toggle('active',p.id==='lib-'+b.dataset.lib));$('#library').scrollTop=0;if(b.dataset.lib==='themes')renderTheme();if(b.dataset.lib==='audio')renderAudio()});
  $$('[data-filter-kind]').forEach(row=>$$('.filter',row).forEach(b=>b.onclick=()=>{$$('.filter',row).forEach(x=>x.classList.toggle('active',x===b));if(row.dataset.filterKind==='cards')cardFilter=b.dataset.filter;else artifactFilter=b.dataset.filter;renderEntityGrid(row.dataset.filterKind)}));
  const topBack=$('#topBackEntity');if(topBack)topBack.onclick=closeEntityEditor;$('#backEntity').onclick=closeEntityEditor;$('#saveEntity').onclick=saveEntity;$('#deleteEntity').onclick=deleteEntity;
  $$('.face-switch button').forEach(b=>b.onclick=()=>setFace(b.dataset.face));
  $('#entityName').oninput=()=>{if(editDraft){editDraft.name=$('#entityName').value;renderEntityFront()}};
  $('#entityInformation').oninput=()=>{if(editDraft){editDraft.information=$('#entityInformation').value;renderEntityFront()}};
  $('#entityLives').oninput=()=>{if(editDraft)editDraft.lives=Math.max(1,Number($('#entityLives').value||1))};
  $$('#factionSeg button').forEach(b=>b.onclick=()=>{if(!editDraft||currentKind!=='cards')return;editDraft.factionId=b.dataset.faction;renderEntityBack();renderEntityFront()});
  const flagMap={flagUseDay:'useDay',flagUseNight:'useNight',flagNightImmune:'nightImmune',flagAllowMultipleActions:'allowMultipleActions',flagPassive:'passive',flagSoloWolfOnly:'soloWolfOnly'};
  for(const [id,k] of Object.entries(flagMap))$('#'+id).onchange=()=>{if(editDraft)editDraft.flags[k]=$('#'+id).checked};
  $('#winCondition').oninput=()=>{if(editDraft)editDraft.winCondition=$('#winCondition').value};
  $('#passiveRuleEnabled').onchange=()=>{if(editDraft)editDraft.passiveRule.enabled=$('#passiveRuleEnabled').checked};$('#passiveRuleType').onchange=()=>{if(editDraft)editDraft.passiveRule.type=$('#passiveRuleType').value};
  $('#passiveFirstTime').onchange=()=>{if(editDraft)editDraft.passiveRule.firstTime=$('#passiveFirstTime').value};$('#passiveNextTime').onchange=()=>{if(editDraft)editDraft.passiveRule.nextTime=$('#passiveNextTime').value};$('#passiveOnDeath').onchange=()=>{if(editDraft)editDraft.passiveRule.onDeath=$('#passiveOnDeath').checked};$('#passiveSkipDead').onchange=()=>{if(editDraft)editDraft.passiveRule.skipIfTargetAlreadyDead=$('#passiveSkipDead').checked};
  $('#groupGateEnabled').onchange=()=>{if(editDraft)editDraft.groupActionGate.enabled=$('#groupGateEnabled').checked};$('#groupGateAction').onchange=()=>{if(editDraft)editDraft.groupActionGate.actionId=$('#groupGateAction').value};$('#groupGateScope').onchange=()=>{if(editDraft)editDraft.groupActionGate.scope=$('#groupGateScope').value};
  for(const id of ['gateExpelled','gateBlocked'])$('#'+id).onchange=()=>{if(!editDraft)return;const arr=[];if($('#gateExpelled').checked)arr.push('expelled');if($('#gateBlocked').checked)arr.push('blocked');editDraft.groupActionGate.blockOn=arr};
  const specialMap={ruleSystemRequired:'systemRequired',ruleUsesPackBite:'usesPackBite',ruleRequiresSoloWolf:'requiresNoOtherLivingWolf',ruleActorMayBeDead:'actorMayBeDead',ruleAllowFriendlyFaction:'allowFriendlyFaction',ruleReplacesWolfBite:'replacesWolfBite'};for(const [id,k] of Object.entries(specialMap))$('#'+id).onchange=()=>{if(editDraft)editDraft.specialRules[k]=$('#'+id).checked};
  $('#specialLimits').oninput=()=>{if(editDraft)editDraft.limits=$('#specialLimits').value};$('#specialConditions').oninput=()=>{if(editDraft)editDraft.conditions=$('#specialConditions').value};$('#specialAttributes').oninput=()=>{if(editDraft)editDraft.attributes=$('#specialAttributes').value};
  for(const [id,k] of [['artifactOwnerSelection','ownerSelection'],['artifactPersistentOwner','persistentOwner'],['artifactRevealFollow','revealFollowTargetOnly']])$('#'+id).onchange=()=>{if(editDraft?.artifact)editDraft.artifact[k]=$('#'+id).checked};
  $('#artifactWakeRole').onchange=()=>{if(editDraft?.artifact)editDraft.artifact.wakeWithRoleId=$('#artifactWakeRole').value};$('#artifactWakeAction').onchange=()=>{if(editDraft?.artifact)editDraft.artifact.wakeWithActionId=$('#artifactWakeAction').value};
  $('#addFunction').onclick=()=>{if(!editDraft)return;const list=actionList(currentKind==='artifacts'?'artifacts':'role'),a=list[0];editDraft.functions.push({id:uid('fn'),actionId:a?.id||'',phase:'night',usageMode:'unlimited',usageCount:1,fromNight:1,toNight:null,cooldownNights:0,targetCount:1,noSelf:false,allowDead:false,noTarget:false,allowConsecutive:true,passive:false,activation:'',pushToPlayerWeb:false,targetPreviousCycleOnly:false,perUserLimit:0,description:'',systemRequired:false,usesPackBite:false,requiresNoOtherLivingWolf:false,actorMayBeDead:false,allowFriendlyFaction:false,replacesWolfBite:false,effectIds:[]});renderEntityBack()};
  $$('#actionKindSeg button').forEach(b=>b.onclick=()=>{$$('#actionKindSeg button').forEach(x=>x.classList.toggle('active',x===b));actionKind=b.dataset.actionKind;renderActions()});$('#actionSearch').oninput=renderActions;$('#effectSearch').oninput=renderEffects;
  $('#sheetClose').onclick=closeSheet;$('#sheetCancel').onclick=closeSheet;$('#sheetSave').onclick=saveSheet;$('#editSheet').onclick=e=>{if(e.target===$('#editSheet'))closeSheet()};
  $('#addTheme').onclick=addTheme;
  $$('#audioKindSeg button').forEach(b=>b.onclick=()=>{$$('#audioKindSeg button').forEach(x=>x.classList.toggle('active',x===b));audioKind=b.dataset.audioKind;renderAudio()});
}
async function seedBundledV1Audio(){try{const a=window.GMWW_V1_AUDIO?.['ROLE:source-18'];if(!a?.base64)return;const key=audioBlobKey('cards','audio_role_old_witch'),stamp='V1.08|ROLE:source-18|'+a.base64.length;if(localStorage.getItem('GMWW_V1_AUDIO_SEED_SOURCE18')===stamp&&await dbGet(key))return;const raw=atob(a.base64),u8=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)u8[i]=raw.charCodeAt(i);await dbPut(key,new Blob([u8],{type:a.type||'audio/mpeg'}));localStorage.setItem('GMWW_V1_AUDIO_SEED_SOURCE18',stamp)}catch(e){console.warn('V1 audio seed failed',e)}}
async function boot(){await ensureDefaultThumb();bindCore();bindFaceSwipe();renderEntityGrid('cards');renderEntityGrid('artifacts');renderActions();renderEffects();renderAudio();await renderTheme();await applyActiveThemeUi()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();