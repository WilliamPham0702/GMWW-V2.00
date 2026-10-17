/* GMWW Trạng Thái V1 — presentation only; never resolves game rules. */
(function(root){
  'use strict';
  const entries=[
    {id:'frozen',name:'Đóng Băng',icon:'❄️',type:'persistent',effect:'snowfall',description:'Tuyết rơi liên tục từ trên xuống nhân vật',priority:85,stack:true,playerWeb:true},
    {id:'protected',name:'Bảo Vệ',icon:'🛡️',type:'persistent',effect:'blue-shield',description:'Khiên phép màu xanh bao quanh nhân vật',priority:65,stack:true,playerWeb:true},
    {id:'wolf_bitten',name:'Sói Cắn',icon:'🐺',type:'persistent',effect:'wolf-claws',description:'Móng vuốt Sói cào cấu liên tục lên nhân vật',priority:90,stack:true,playerWeb:true},
    {id:'marked',name:'Đánh Dấu',icon:'🎯',type:'persistent',effect:'secret-mark',description:'Ấn ký bí mật phía trên đầu nhân vật',priority:75,stack:true,playerWeb:false},
    {id:'dead',name:'Đã Chết',icon:'💀',type:'persistent',effect:'gray-smoke',description:'Khói xám bao quanh liên tục, nhân vật đứng bất động',priority:100,stack:false,playerWeb:true},
    {id:'expelled',name:'Bị Đuổi',icon:'🚪',type:'persistent',effect:'iron-cage',description:'Nhân vật bị đóng khung lồng sắt',priority:95,stack:false,playerWeb:true},
    {id:'infected',name:'Nhiễm Bệnh',icon:'🦠',type:'persistent',effect:'green-rain',description:'Khói xanh lục rơi liên tục từ trên xuống',priority:70,stack:true,playerWeb:true},
    {id:'mute',name:'Bị Câm',icon:'🤐',type:'persistent',effect:'silenced',description:'Biểu tượng khóa lời nói',priority:60,stack:true,playerWeb:true},
    {id:'disabled_permanent',name:'Mất Năng Lực',icon:'⛔',type:'persistent',effect:'power-seal',description:'Phong ấn phép thuật quanh cơ thể',priority:80,stack:true,playerWeb:true},
    {id:'linked',name:'Liên Kết',icon:'🔗',type:'persistent',effect:'soul-link',description:'Dây năng lượng liên kết giữa các nhân vật',priority:55,stack:true,playerWeb:false},
    {id:'recover',name:'Hồi Sinh / Cứu',icon:'✨',type:'instant',effect:'healing',description:'Ánh sáng hồi phục, nhân vật đứng dậy',priority:30,stack:true,playerWeb:true},
    {id:'transform',name:'Biến Đổi',icon:'🌀',type:'instant',effect:'transformation',description:'Vòng xoáy phép thuật thay đổi vai trò',priority:30,stack:true,playerWeb:true},
    {id:'attack',name:'Tấn Công',icon:'⚔️',type:'instant',effect:'slash',description:'Hiệu ứng đòn đánh, vết chém xuất hiện liên tục',priority:30,stack:true,playerWeb:true},
    {id:'inspect',name:'Soi / Kiểm Tra',icon:'🔮',type:'instant',effect:'scan',description:'Tia sáng quét qua mục tiêu liên tục',priority:30,stack:true,playerWeb:false},
    {id:'transfer',name:'Dịch Chuyển',icon:'↔️',type:'instant',effect:'shifting',description:'Vệt sáng dịch chuyển giữa các nhân vật',priority:30,stack:true,playerWeb:true}
  ];
  const byId=Object.fromEntries(entries.map(x=>[x.id,Object.freeze(x)]));
  const aliases={disabled_2n:'disabled_permanent',assassin_mark:'marked',revive:'recover',witch_save:'recover',thief_change_role:'transform',wolf_bite:'wolf_bitten',snow_wolf_freeze:'frozen'};
  function normalize(id){const key=String(id||'');return byId[key]?key:(aliases[key]||null)}
  function safe(value){return String(value||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}
  function resolveRows(rows,loginId,now=Date.now()){
    const selected=new Set(),id=String(loginId||'');
    for(const row of (Array.isArray(rows)?rows:[])){
      if(!row||String(row.loginId||'')!==id||row.effectActive===false)continue;
      if(row.expiresAt&&Date.parse(row.expiresAt)<=now)continue;
      const key=normalize(row.type==='status'?row.statusId:row.type);
      if(key&&byId[key]?.type==='persistent')selected.add(key);
    }
    return [...selected].sort((a,b)=>byId[b].priority-byId[a].priority);
  }
  function layers(ids){
    const items=[...new Set((ids||[]).map(normalize).filter(Boolean))].sort((a,b)=>byId[b].priority-byId[a].priority);
    const dominant=items.find(id=>byId[id].stack===false),shown=dominant?[dominant]:items.filter(id=>byId[id].stack!==false).slice(0,3);
    return{items,shown};
  }
  function overlay(ids){
    const collection=layers(ids);
    if(!collection.items.length)return'';
    const effects=collection.shown.map(id=>'<span class="gmww-sv-fx gmww-sv-'+safe(byId[id].effect)+'" data-status-fx="'+safe(id)+'" aria-hidden="true"><i></i><i></i><i></i></span>').join('');
    const badges=collection.items.map(id=>'<span title="'+safe(byId[id].name)+'">'+safe(byId[id].icon)+'</span>').join('');
    return '<span class="gmww-sv-overlay" aria-hidden="true">'+effects+'</span><span class="gmww-sv-badges" aria-hidden="true">'+badges+'</span>';
  }
  const api=Object.freeze({entries:Object.freeze(entries.map(x=>Object.freeze(x))),byId:Object.freeze(byId),normalize,resolveRows,layers,overlay,safe});
  root.GMWW_STATUS_VISUALS=api;
})(typeof globalThis==='object'?globalThis:window);
