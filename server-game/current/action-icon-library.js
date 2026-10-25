/* GMWW SEA icon library — V1. Draft feature: visual catalog only, no gameplay mutation. */
(()=>{
'use strict';
const KEY='GMWW_ACTION_ICON_LIBRARY_V5';
const SHAPES={
eye:'<path d="M15 48q33-40 66 0-33 40-66 0Z"/><circle cx="48" cy="48" r="11"/><circle cx="51" cy="44" r="3" fill="#fff6c7" stroke="none"/>',
triple:'<path d="M17 35q15-17 30 0-15 17-30 0Zm34 0q15-17 30 0-15 17-30 0ZM33 64q15-17 30 0-15 17-30 0Z"/><circle cx="32" cy="35" r="3"/><circle cx="66" cy="35" r="3"/><circle cx="48" cy="64" r="3"/>',
scale:'<path d="M48 17v57m-20 0h40M27 31h42M32 31l-13 28h26L32 31Zm32 0L51 59h26L64 31Z"/><circle cx="48" cy="23" r="5"/>',
bite:'<path d="M19 26l12 15 17-7 17 7 12-15-6 37-23 14-23-14-6-37Z"/><path d="M30 48l6 8 6-8 6 8 6-8 6 8 6-8" stroke="#f8db96"/>',
shield:'<path d="M48 14 76 25v21q-3 24-28 35-25-11-28-35V25l28-11Z"/><path d="M48 28v38M31 47h34" stroke="#ffe6a7"/>',
heal:'<path d="M34 20h28v13l8 10v30H26V43l8-10V20Z"/><path d="M48 42v24M36 54h24" stroke="#a5ffca"/>',
poison:'<path d="M37 18h22v11l10 13-5 31H32l-5-31 10-13V18Z"/><path d="M38 55q10-14 20 0m-18 6 16-15m-16 0 16 15" stroke="#ffb6ee"/>',
ice:'<path d="M48 15v66M20 31l56 34M20 65l56-34M48 15l-8 8m8-8 8 8M48 81l-8-8m8 8 8-8M20 31l13-1m-13 1 5 11m51-11-13-1m13 1-5 11" stroke="#c9f6ff"/>',
mark:'<circle cx="48" cy="48" r="28"/><circle cx="48" cy="48" r="15"/><path d="M48 11v17m0 40v17M11 48h17m40 0h17" stroke="#ffe2a2"/>',
exile:'<path d="M20 78V27l28-12 28 12v51M36 78V41h24v37M48 43v27"/><path d="M30 48l-16 0m0 0 8-8m-8 8 8 8" stroke="#f5d49d"/>',
revive:'<path d="M48 79q-28-15-28-35 0-17 17-17 8 0 11 9 4-9 12-9 17 0 17 17 0 20-29 35Z"/><path d="M48 19v20m-10-10h20" stroke="#ffe3a0"/>',
shift:'<path d="M29 48h38M29 48l12-12M29 48l12 12M67 48 55 36M67 48 55 60"/><path d="M48 18 62 28 48 38 34 28Z" stroke="#ffe1a4"/>',
visit:'<path d="M18 45 48 20l30 25v34H18V45Zm21 34V53h18v26"/><circle cx="63" cy="47" r="4"/>',
hunt:'<path d="M25 70 68 26M18 78l14-5-9-9-5 14ZM57 18q15 0 21 15M19 41q0-23 27-23" stroke="#ffe9a5"/>',
clone:'<path d="M16 71q3-19 18-23-12-8-10-21 2-11 13-11 12 0 13 13 0 10-9 19 12 7 13 23H16Z"/><path d="M53 66q0-12 11-18-9-8-6-18 3-8 11-8 13 0 13 13 0 7-7 12 12 6 12 19" stroke="#f6e2a4"/>',
swap:'<rect x="18" y="26" width="29" height="43" rx="4"/><rect x="50" y="26" width="29" height="43" rx="4"/><path d="M31 17h34l-8-7M65 17l-8 7M65 78H31l8-7m-8 7 8 7" stroke="#ffe1a4"/>',
sword:'<path d="M48 13l9 22-9 33-9-33 9-22Zm-23 55h46M48 68v15" stroke="#ffe1a4"/>',
draw:'<path d="M20 25l25-8 15 48-25 8-15-48Zm30 9 24-3 5 40-20 1" stroke="#ffe1a4"/><path d="M36 44l5-11 5 11-10 0Z"/>',
spark:'<path d="M48 11 57 38l28 10-28 10-9 27-9-27-28-10 28-10 9-27Z"/><circle cx="48" cy="48" r="7"/>'
};
const DEFAULT=[
["soi-xet","01_soi_xet","Soi xét / Đọc chức năng","character","action_seer,action_aura_read"],
["soi-dac-biet","02_soi_dac_biet","Soi vai trò / Tìm tiên tri","character","action_destroyer_scry,action_find_seer,action_wolf_seer,action_rotten_seer"],
["soi-nhom","03_soi_nhom","Soi nhóm","multi","action_scan_three,action_fox_scan,action_bear_scan"],
["so-sanh-phe","04_so_sanh_phe","So sánh phe","multi","action_compare_faction"],
["soi-can","05_soi_can","Sói cắn","character","action_wolf_bite"],
["bao-ve","06_bao_ve","Bảo vệ","character","action_protect"],
["cuu","07_cuu","Cứu","character","action_witch_save"],
["ha-doc","08_ha_doc","Hạ độc","character","action_witch_kill"],
["dong-bang","09_dong_bang","Đóng băng","character","action_snow_wolf_freeze"],
["danh-dau","10_danh_dau","Đánh dấu","character","action_assassin_mark,action_hunter_mark"],
["dich-trai","11_dich_trai","Dịch vết cắn trái","direction","action_transfer_bite"],
["dich-phai","12_dich_phai","Dịch vết cắn phải","direction","action_transfer_bite"],
["hoi-sinh","13_hoi_sinh","Hồi sinh","character","action_revive"],
["duoi","14_duoi_khoi_lang","Đuổi khỏi làng","character","action_exile"],
["san-giet","15_san_giet","Săn / Giết / Đâm","character","action_hunt,action_destroyer_kill,action_stab"],
["tham-nha","16_tham_nha","Thăm nhà","character","action_visit_house"],
["nhan-ban","17_nhan_ban","Nhân bản","character","action_clone_target"],
["doi-vai","18_doi_vai_tro","Đổi vai trò / Rút bài","card","action_thief_change_role,action_drunk_draw"],
["hiep-si","19_hiep_si","Hiệp sĩ chọn chết","character","action_knight_last_strike"],
["phong-an","20_phong_an","Phong ấn","character",""],
["cam-vote","21_cam_vote","Cấm bỏ phiếu","character",""],
["cam-de-cu","22_cam_de_cu","Cấm đề cử","character",""],
["nguyen-rua","23_nguyen_rua","Nguyền rủa","character",""],
["ban-phuoc","24_ban_phuoc","Ban phước","character",""],
["cuop-artifact","25_cuop_artifact","Cướp Artifact","character",""],
["phan-don","26_phan_don","Phản đòn","character",""],
["tang-hinh","27_tang_hinh","Tàng hình","character",""],
["dat-bay","28_bay","Đặt bẫy","character",""],
["thanh-tay","29_thanh_tay","Thanh tẩy","character",""],
["ghep-doi", "30_ghep_doi", "Ghép Đôi", "multi", "action-cupid-pair,artifact_action_link"],
["rung-chuong", "31_rung_chuong", "Rung Chuông", "none", "18"],
["hi-mat", "32_hi_mat", "Hí Mắt", "none", "action-peek"],
["giao", "33_giao", "Giáo", "character", "25"],
["ba-anh-em", "34_ba_anh_em", "Nhận Biết / Về Bầy", "character", "action-three-brothers-recognize,action-lone-wolf-join,action-cult-add"],
["bao-thu", "35_bao_thu", "Báo Thù", "character", "action-avenger-target"],
["mang-benh", "36_mang_benh", "Mang Bệnh", "character", "action-disease-self"],
["loan-tin", "37_loan_tin", "Loan Tin / Thông Điệp", "character", "action-news-role,action-ghost-message"],
["phan-quyet-kep", "38_phan_quyet_kep", "Phán Quyết Kép", "none", "action-judge-double,artifact_action_force_vote"],
["cam-noi", "39_cam_noi", "Cấm Nói", "character", "artifact_action_silence"],
["phieu-con-qua","40_phieu_con_qua","Phiếu Con Quạ","character","action-g7-crow-votes"],
["can-chuyen-hoa","41_can_chuyen_hoa","Cắn Chuyển Hóa","character","action-demon-wolf-convert"],
["chon-hinh-tuong","42_chon_hinh_tuong","Chọn Hình Tượng","character","action-wild-child-idol"],
["xem-artifact","43_xem_artifact","Xem Artifact","character","artifact_action_view"],
["doi-artifact","44_doi_artifact","Đổi Artifact","character","artifact_action_exchange"],
["cong-khai-vai","45_cong_khai_vai","Công Khai Vai Trò","none","artifact_action_reveal_role"],
["sao-chep-chuc-nang","46_sao_chep_chuc_nang","Sao Chép Chức Năng","character","artifact_action_copy_function"],
["huy-artifact","47_huy_artifact","Hủy Artifact","character","artifact_action_destroy"],
["buoc-quay-mat","48_buoc_quay_mat","Buộc Quay Mặt","character","artifact_action_turn_away"],
["sang-tao-artifact","49_sang_tao_artifact","Sáng Tạo Artifact","none","artifact_action_custom"]
].map(([id,file,name,target,actions])=>({id,name,assetId:file+'.png',shape:'spark',target,actions:actions?actions.split(','):[],image:''}));
const KNOWN_REAL_ACTIONS={
  "san-giet": [
    "action-g7-prince-stab",
    "action-cult-kill"
  ],
  "soi-xet": [
    "action-digan-scry",
    "action-rotten-seer-check",
    "artifact_action_check_villager",
    "artifact_action_check_awake",
    "artifact_action_check_third_faction"
  ],
  "soi-nhom": [
    "action-vampire-check",
    "artifact_action_judge_two_wolves"
  ],
  "so-sanh-phe": [],
  "soi-dac-biet": [],
  "soi-can": [
    "action-fire-wolf-bite",
    "action-wolf-brother-bite"
  ],
  "danh-dau": [
    "action-grudge-designate"
  ],
  "duoi": [
    "action-black-woman-leave"
  ],
  "thanh-tay": [
    "action-mad-doctor-cure"
  ],
  "doi-vai": [
    "action-maid-inherit",
    "artifact_action_swap_role"
  ],
  "cuop-artifact": [
    "artifact_action_reclaim",
    "artifact_action_steal"
  ],
  "phong-an": [
    "artifact_action_disable_function",
    "artifact_action_negate",
    "artifact_action_lock_function",
    "artifact_action_limit_wolf_targets"
  ],
  "nhan-ban": [],
  "ban-phuoc": [
    "artifact_action_activate_two"
  ],
  "phieu-con-qua": [
    "action-g7-crow-votes"
  ],
  "can-chuyen-hoa": [
    "action-demon-wolf-convert"
  ],
  "chon-hinh-tuong": [
    "action-wild-child-idol"
  ],
  "xem-artifact": [
    "artifact_action_view"
  ],
  "doi-artifact": [
    "artifact_action_exchange"
  ],
  "cong-khai-vai": [
    "artifact_action_reveal_role"
  ],
  "sao-chep-chuc-nang": [
    "artifact_action_copy_function"
  ],
  "huy-artifact": [
    "artifact_action_destroy"
  ],
  "buoc-quay-mat": [
    "artifact_action_turn_away"
  ],
  "sang-tao-artifact": [
    "artifact_action_custom"
  ],
  "hiep-si": [
    "action-knight-stab"
  ]
};
const REASSIGNED_REAL_ACTIONS={
  "action-g7-crow-votes": "phieu-con-qua",
  "action-demon-wolf-convert": "can-chuyen-hoa",
  "action-wild-child-idol": "chon-hinh-tuong",
  "artifact_action_view": "xem-artifact",
  "artifact_action_exchange": "doi-artifact",
  "artifact_action_reveal_role": "cong-khai-vai",
  "artifact_action_copy_function": "sao-chep-chuc-nang",
  "artifact_action_destroy": "huy-artifact",
  "artifact_action_turn_away": "buoc-quay-mat",
  "artifact_action_custom": "sang-tao-artifact",
  "action-knight-stab": "hiep-si",
  "artifact_action_check_third_faction": "soi-xet"
};
const clone=x=>JSON.parse(JSON.stringify(x));
const cleanActions=s=>[...new Set(String(s||'').split(/[,\n;]/).map(x=>x.trim()).filter(x=>/^[A-Za-z0-9][A-Za-z0-9_:-]{0,100}$/.test(x)))].slice(0,100);
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function approvedMappings(rows){
 const next=clone(rows);
 // Move ONLY user-supplied verified action IDs from their old generic icons to
 // the appropriate dedicated art; keep all other user-created entries untouched.
 for(const icon of next)icon.actions=(icon.actions||[]).filter(id=>!Object.hasOwn(REASSIGNED_REAL_ACTIONS,id)||REASSIGNED_REAL_ACTIONS[id]===icon.id);
 const mapped=new Set(next.flatMap(x=>x.actions||[]));
 for(const [iconId,ids] of Object.entries(KNOWN_REAL_ACTIONS)){
  const icon=next.find(x=>x.id===iconId);if(!icon)continue;
  for(const id of ids)if(!mapped.has(id)){icon.actions.push(id);mapped.add(id)}
 }
 return next;
}
function load(){
 const known=new Map(DEFAULT.map(x=>[x.id,x.assetId]));
 const parse=(arr)=>arr.filter(x=>x&&/^[a-z0-9-]{1,80}$/.test(x.id)).map(x=>({
  id:x.id,name:String(x.name||'').slice(0,100),shape:SHAPES[x.shape]?x.shape:'spark',
  target:['character','multi','card','direction','none'].includes(x.target)?x.target:'character',
  actions:cleanActions((Array.isArray(x.actions)?x.actions:[]).join(',')),
  assetId:known.get(x.id)||'',image:typeof x.image==='string'&&/^data:image\/(png|webp|jpeg);base64,/.test(x.image)?x.image:''
 }));
 try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(Array.isArray(saved)&&saved.length<300)return approvedMappings(parse(saved))}catch(_){}
 // Migrate V4 library and preserve every existing icon/custom edit; add only Wave 5 artwork.
 try{const prior=JSON.parse(localStorage.getItem('GMWW_ACTION_ICON_LIBRARY_V4')||'null');
  if(Array.isArray(prior)&&prior.length<300){const old=parse(prior),ids=new Set(old.map(x=>x.id));
   return approvedMappings(old.concat(clone(DEFAULT.filter(x=>/^4[0-9]_/.test(x.assetId)&&!ids.has(x.id)))));
  }
 }catch(_){}
 // Retain all V3 manually edited icons; add 10 independent wave-4 designs once.
 try{const prior=JSON.parse(localStorage.getItem('GMWW_ACTION_ICON_LIBRARY_V3')||'null');
  if(Array.isArray(prior)&&prior.length<300){
    const old=parse(prior),ids=new Set(old.map(x=>x.id));
    return approvedMappings(old.concat(clone(DEFAULT.filter(x=>/^[34][0-9]_/.test(x.assetId)&&!ids.has(x.id)))));
  }
 }catch(_){}
 // Migrate V2 library without losing custom edits, deletions or role mappings; append ONLY the 10 newly approved IDs.
 try{const prior=JSON.parse(localStorage.getItem('GMWW_ACTION_ICON_LIBRARY_V2')||'null');if(Array.isArray(prior)&&prior.length<300){const existing=parse(prior),ids=new Set(existing.map(x=>x.id));return approvedMappings(existing.concat(clone(DEFAULT.filter(x=>x.assetId&&/^[234][0-9]_/.test(x.assetId)&&!ids.has(x.id)))));}}catch(_){}
 // Preserve only user-created icons from an earlier Draft prototype, never overwrite approved artwork with old demo SVG.
 try{const old=JSON.parse(localStorage.getItem('GMWW_ACTION_ICON_LIBRARY_V1')||'null');
  if(Array.isArray(old)){
   const previous=new Set(['soi-xet','soi-nhom','so-sanh-phe','soi-can','bao-ve','cuu','giet','dong-bang','danh-dau','duoi','hoi-sinh','dich-vet-can','tham-nha','san','nhan-ban','doi-vai','hiep-si','say-ruou','tac-dong']);
   return clone(DEFAULT).concat(parse(old.filter(x=>!previous.has(x?.id)&&!known.has(x?.id))));
  }
 }catch(_){}
 return approvedMappings(clone(DEFAULT));
}
let icons=load(),editing=null,pendingImage=null;
function store(next){try{localStorage.setItem(KEY,JSON.stringify(next));icons=next;return true}catch(_){alert('Không đủ bộ nhớ. Hãy dùng ảnh PNG/WEBP nhỏ hơn hoặc xoá icon chưa sử dụng.');return false}}
function svg(kind){const shape=SHAPES[kind]||SHAPES.spark;return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs><radialGradient id="sea" cx="45%" cy="35%"><stop stop-color="#267fa5"/><stop offset="1" stop-color="#0a294d"/></radialGradient></defs><circle cx="48" cy="48" r="45" fill="#022842" stroke="#f0d18d" stroke-width="3"/><circle cx="48" cy="48" r="39" fill="url(#sea)" stroke="#65e3ed" stroke-width="2"/><g fill="none" stroke="#b1ecff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">'+shape+'</g><path d="M33 9q15-10 30 0M33 87q15 10 30 0" fill="none" stroke="#f7e0a1" stroke-width="4"/><circle cx="48" cy="6" r="4" fill="#fff0c1"/><circle cx="48" cy="90" r="4" fill="#fff0c1"/></svg>'}
function picture(icon){return icon.image||(icon.assetId?'action-icons/sea-v1/'+encodeURIComponent(icon.assetId):'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg(icon.shape)))}

function auditCatalog(){
 let state=null;
 for(const key of ['GMWW_V258_STATE','GMWW_V257_STATE','GMWW_V256_STATE']){
  try{const candidate=JSON.parse(localStorage.getItem(key)||'null');if(candidate&&Array.isArray(candidate.cards)&&Array.isArray(candidate.artifacts)){state=candidate;break}}catch(_){}
 }
 if(!state)return null;
 const rows=[],used=new Map();
 for(const [kind,entities] of [['role',state.cards],['artifact',state.artifacts]]){
  for(const card of entities){
   for(const fn of (Array.isArray(card.functions)?card.functions:Array.isArray(card.abilities)?card.abilities:[])){
    if(!fn||fn.passive===true||!fn.actionId)continue;
    const id=String(fn.actionId),key=kind+':'+id;
    if(!used.has(key)){const item={id,kind,owners:[],targetCount:Number(fn.targetCount??1),noTarget:fn.noTarget===true};used.set(key,item);rows.push(item)}
    used.get(key).owners.push(String(card.name||card.id||kind));
   }
  }
 }
 const definitions=[...(state.actions?.role||[]),...(state.actions?.artifacts||[])];
 for(const row of rows)row.label=String(definitions.find(x=>String(x.id)===row.id)?.name||row.id);
 return {roles:state.cards.length,artifacts:state.artifacts.length,actions:rows,missing:rows.filter(x=>!icons.some(icon=>icon.actions.includes(x.id)))};
}

const EXACT_ACTION_ICON_NAMES={
 'phong an':'phong-an','niem phong':'phong-an','phong an ky nang':'phong-an',
 'cam bo phieu':'cam-vote','cam vote':'cam-vote','khoa bo phieu':'cam-vote',
 'cam de cu':'cam-de-cu','khoa de cu':'cam-de-cu','cam chon':'cam-de-cu',
 'nguyen rua':'nguyen-rua','loi nguyen':'nguyen-rua',
 'ban phuoc':'ban-phuoc','ban phuc':'ban-phuoc','chuc phuc':'ban-phuoc',
 'cuop artifact':'cuop-artifact','cuop bao vat':'cuop-artifact','trom artifact':'cuop-artifact',
 'phan don':'phan-don','phan cong':'phan-don',
 'tang hinh':'tang-hinh','an than':'tang-hinh',
 'dat bay':'dat-bay','giang bay':'dat-bay',
 'thanh tay':'thanh-tay','giai nguyen':'thanh-tay'
};
function normalizedActionName(value){
 return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}
// Only exact named semantic matches from the actual local catalog. Never infer IDs
// from arbitrary substrings; no new game actions or ownership are created.
function mapUnambiguousLocalActions(){
 const report=auditCatalog();if(!report||!report.missing.length)return 0;
 const next=clone(icons),lookup=new Map(next.map(icon=>[icon.id,icon]));
 let mapped=0;
 for(const action of report.missing){
  if(!action.label||action.label===action.id)continue;
  const iconId=EXACT_ACTION_ICON_NAMES[normalizedActionName(action.label)];
  const icon=lookup.get(iconId);
  if(!icon||icon.actions.includes(action.id))continue;
  icon.actions.push(action.id);mapped++;
 }
 return mapped&&store(next)?mapped:0;
}

function renderAudit(){
 const box=document.getElementById('gmwwIconAudit');if(!box)return;
 const autoMapped=mapUnambiguousLocalActions();
 const report=auditCatalog();
 if(!report){box.textContent='Chưa tìm thấy danh mục Vai Trò/Artifact trên thiết bị này.';return}
 box.innerHTML='<b>KIỂM KÊ TRÊN THIẾT BỊ</b><p>'+report.roles+' Vai Trò · '+report.artifacts+' Artifact · '+report.actions.length+' kiểu hành động chủ động · '+report.missing.length+' hành động chưa gán icon.</p>'+
 (report.missing.length?'<details><summary>Xem hành động chưa gán</summary>'+report.missing.map(x=>'<div>'+esc(x.label)+' — '+esc(x.kind==='artifact'?'Artifact':'Vai Trò')+' ('+esc(x.owners.join(', '))+') <select aria-label="Chọn icon" data-icon-select="'+esc(x.id)+'">'+icons.map(icon=>'<option value="'+esc(icon.id)+'">'+esc(icon.name)+'</option>').join('')+'</select> <button type="button" data-icon-map="'+esc(x.id)+'">Gán icon</button></div>').join('')+'</details>':'<small>Đã gán icon cho tất cả hành động đọc được.</small>');
 if(autoMapped){const msg=document.createElement('p');msg.textContent='Đã tự gán '+autoMapped+' hành động trùng tên chính xác.';box.prepend(msg);}
 const exportBtn=document.createElement('button');exportBtn.type='button';exportBtn.textContent='SAO CHÉP DANH SÁCH CHƯA GÁN';exportBtn.onclick=()=>{const latest=auditCatalog();if(!latest)return;const payload=JSON.stringify({roleCount:latest.roles,artifactCount:latest.artifacts,missing:latest.missing},null,2);if(navigator.clipboard?.writeText){navigator.clipboard.writeText(payload).catch(()=>window.prompt('Sao chép danh sách hành động:',payload));}else window.prompt('Sao chép danh sách hành động:',payload)};box.append(exportBtn);
 box.querySelectorAll('[data-icon-map]').forEach(b=>b.onclick=()=>{
  const selected=[...box.querySelectorAll('[data-icon-select]')].find(x=>x.dataset.iconSelect===b.dataset.iconMap)?.value;
  const next=clone(icons),found=next.find(x=>x.id===selected);
  if(!found)return;
  found.actions=[...new Set(found.actions.concat(b.dataset.iconMap))];
  if(store(next))render();
 });
}

function render(){
 const q=(document.getElementById('gmwwIconSearch')?.value||'').toLowerCase();
 const box=document.getElementById('gmwwIconGrid');if(!box)return;
 const rows=icons.filter(x=>(x.name+' '+x.id+' '+x.actions.join(' ')).toLowerCase().includes(q));
 box.innerHTML=rows.map(x=>'<article class="gmww-icon-tile" role="button" tabindex="0" aria-label="Nhấn đúp để sửa '+esc(x.name)+'" data-icon-id="'+esc(x.id)+'"><img src="'+esc(picture(x))+'" alt=""><b>'+esc(x.name)+'</b></article>').join('')||'<p>Không có icon phù hợp.</p>';
 let lastTap=null;
 box.onclick=e=>{const tile=e.target.closest('[data-icon-id]');if(!tile)return;
  const now=Date.now();if(lastTap?.id===tile.dataset.iconId&&now-lastTap.at<440){lastTap=null;edit(tile.dataset.iconId)}
  else lastTap={id:tile.dataset.iconId,at:now};
 };
 box.ondblclick=e=>{const tile=e.target.closest('[data-icon-id]');if(tile)edit(tile.dataset.iconId)};
 box.onkeydown=e=>{if(!['Enter',' '].includes(e.key))return;const tile=e.target.closest('[data-icon-id]');if(tile){e.preventDefault();edit(tile.dataset.iconId)}};

 document.getElementById('gmwwIconCount').textContent=icons.length+' icon';
 renderAudit();
}
function edit(id){
 editing=id||null;const row=icons.find(x=>x.id===id)||{id:'',name:'',target:'character',actions:[],image:'',shape:'spark'};
 pendingImage=row.image||'';
 document.getElementById('gmwwIconEditor').hidden=false;
 document.getElementById('gmwwIconName').value=row.name;
 document.getElementById('gmwwIconActions').value=row.actions.join(', ');
 document.getElementById('gmwwIconTarget').value=row.target;
 document.getElementById('gmwwIconFile').value='';
 document.getElementById('gmwwIconEditorTitle').textContent=id?'Chỉnh sửa icon':'Thêm icon mới';
 document.getElementById('gmwwIconDelete').hidden=!id;
 document.getElementById('gmwwIconName').focus();
}
function remove(id){const row=icons.find(x=>x.id===id);if(!row||!confirm('Xoá icon "'+row.name+'"? Thao tác này chỉ xoá khỏi Thư viện Icon.'))return;if(store(icons.filter(x=>x.id!==id)))render()}
async function readImage(file){
 if(!file)return;
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>650000){alert('Chỉ nhận PNG/JPEG/WEBP tối đa 650 KB mỗi icon.');return}
 const reader=new FileReader();reader.onload=()=>{pendingImage=String(reader.result||'')};reader.readAsDataURL(file);
}
function save(){
 const name=document.getElementById('gmwwIconName').value.trim().slice(0,100),actions=cleanActions(document.getElementById('gmwwIconActions').value),target=document.getElementById('gmwwIconTarget').value;
 if(!name){alert('Cần nhập tên icon.');return}
 if(!['character','multi','card','direction','none'].includes(target))return;
 const id=editing||('icon-'+Date.now().toString(36));
 const prev=icons.find(x=>x.id===id)||{};
 const next=icons.filter(x=>x.id!==id).concat({id,name,actions,target,image:pendingImage||'',assetId:prev.assetId||'',shape:prev.shape||'spark'});
 if(store(next)){document.getElementById('gmwwIconEditor').hidden=true;render()}
}
function init(){
 const nav=document.querySelector('#library .library-tabs'),root=document.getElementById('libraryHome');
 if(!nav||!root||document.getElementById('lib-icons'))return;
 const tab=document.createElement('button');tab.className='libtab';tab.dataset.lib='icons';tab.type='button';tab.innerHTML='<b>ICON</b>';
 nav.insertBefore(tab,nav.querySelector('[data-lib="themes"]'));
 const pane=document.createElement('section');pane.className='libpane';pane.id='lib-icons';pane.setAttribute('aria-label','Thư viện Icon hành động');
 pane.innerHTML='<div class="gmww-icon-lib"><header><h2>ICON HÀNH ĐỘNG</h2><p>Icon GMWW chủ đề Biển · Một icon có thể dùng cho nhiều Vai Trò và Artifact. Thay đổi ở trang này chưa tự kích hoạt trong trận.</p></header><div class="gmww-icon-tools"><button id="gmwwIconAdd" type="button">＋ THÊM ICON</button><button id="gmwwIconReset" type="button">↻ KHÔI PHỤC</button><input id="gmwwIconSearch" placeholder="Tìm icon / actionId" aria-label="Tìm icon"><span id="gmwwIconCount"></span></div><section id="gmwwIconEditor" hidden><h3 id="gmwwIconEditorTitle">Thêm icon</h3><label>Tên icon<input id="gmwwIconName" maxlength="100"></label><label>Gắn actionId (cách nhau bằng dấu phẩy)<textarea id="gmwwIconActions" rows="2"></textarea></label><label>Loại tác động<select id="gmwwIconTarget"><option value="character">Kéo vào Character</option><option value="multi">Nhiều mục tiêu</option><option value="direction">Chọn hướng</option><option value="card">Chọn lá bài</option><option value="none">Không cần mục tiêu</option></select></label><label>Ảnh icon tuỳ chỉnh (PNG / WEBP / JPG)<input id="gmwwIconFile" type="file" accept="image/png,image/jpeg,image/webp"></label><div><button id="gmwwIconSave" type="button">LƯU</button><button id="gmwwIconDelete" type="button" hidden>XOÁ ICON</button><button id="gmwwIconCancel" type="button">HUỶ</button></div></section><section id="gmwwIconAudit" style="padding:12px;margin:12px 0;border:1px solid #4ca9b8;border-radius:12px;background:#063247aa"></section><div class="gmww-icon-grid" id="gmwwIconGrid"></div></div>';
 root.insertBefore(pane,document.getElementById('lib-themes'));
 const style=document.createElement('style');style.textContent='.gmww-icon-lib{padding:14px;color:#daf7ff}.gmww-icon-lib header p{opacity:.85;line-height:1.45}.gmww-icon-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:14px 0}.gmww-icon-tools input{flex:1;min-width:120px;padding:10px}.gmww-icon-tools button,.gmww-icon-tile button,#gmwwIconEditor button{background:#0b536b;color:#e4fcff;border:1px solid #77bfcb;border-radius:10px;padding:9px 12px;cursor:pointer}.gmww-icon-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:12px}.gmww-icon-tile{display:flex;flex-direction:column;align-items:center;gap:6px;border:1px solid #4aaaba88;border-radius:15px;background:#082f47aa;padding:12px;text-align:center}.gmww-icon-tile img{width:88px;height:88px;object-fit:contain}.gmww-icon-tile small{font-size:11px;line-height:1.35;overflow-wrap:anywhere}.gmww-icon-actions{opacity:.75;max-height:42px;overflow:auto}.gmww-icon-tile>div{display:flex;gap:6px;margin-top:auto}#gmwwIconEditor{border:1px solid #6bcbd0;border-radius:14px;background:#073852;padding:14px;margin-bottom:16px}#gmwwIconEditor[hidden]{display:none}#gmwwIconEditor label{display:grid;gap:5px;margin:8px 0}#gmwwIconEditor input,#gmwwIconEditor textarea,#gmwwIconEditor select{min-width:0;width:100%;box-sizing:border-box;padding:9px;border-radius:8px}#gmwwIconEditor>div{display:flex;gap:8px}';
 style.textContent+='.gmww-icon-tile{cursor:pointer;touch-action:manipulation}.gmww-icon-tile:focus-visible{outline:3px solid #9efaff}.gmww-icon-tile img{pointer-events:none}.gmww-icon-tile b{margin-bottom:0}.gmww-icon-tile:active{transform:scale(.98)}';document.head.appendChild(style);
 tab.onclick=()=>{nav.querySelectorAll('.libtab').forEach(b=>b.classList.toggle('active',b===tab));root.querySelectorAll('.libpane').forEach(x=>x.classList.toggle('active',x===pane));render();};
 document.getElementById('gmwwIconAdd').onclick=()=>edit();
 document.getElementById('gmwwIconReset').onclick=()=>{if(confirm('Khôi phục bộ icon GMWW mặc định và bỏ mọi thay đổi?')&&store(clone(DEFAULT)))render()};
 document.getElementById('gmwwIconCancel').onclick=()=>document.getElementById('gmwwIconEditor').hidden=true;
 document.getElementById('gmwwIconDelete').onclick=()=>{if(editing){const id=editing;remove(id);if(!icons.some(x=>x.id===id))document.getElementById('gmwwIconEditor').hidden=true}};
 document.getElementById('gmwwIconSave').onclick=save;
 document.getElementById('gmwwIconFile').onchange=e=>{void readImage(e.target.files?.[0])};
 document.getElementById('gmwwIconSearch').oninput=render;
 render();
}
window.GMWWActionIconLibrary={get:()=>clone(icons),resolve:(actionId)=>clone(icons.find(x=>x.actions.includes(String(actionId)))||null),resolveAll:(actionId)=>clone(icons.filter(x=>x.actions.includes(String(actionId)))),image:picture,audit:auditCatalog,autoMap:mapUnambiguousLocalActions};
// Wake up any GM scene rendered before the OTA icon library finished loading.
if(typeof document.dispatchEvent==='function'&&typeof Event==='function')document.dispatchEvent(new Event('gmww-action-icons-ready'));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
