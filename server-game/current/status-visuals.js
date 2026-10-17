/* GMWW Trạng Thái V1 — presentation only; never resolves game rules. */
(function(root){
  'use strict';
  const entries=[
    {id:'frozen',name:'Đóng Băng',icon:'❄️',type:'persistent',effect:'orbit',description:'❄️ Bông tuyết quay quanh nhân vật',priority:85,stack:true,playerWeb:true},
    {id:'protected',name:'Bảo Vệ',icon:'🛡️',type:'persistent',effect:'orbit',description:'🛡️ Những chiếc khiên quay quanh nhân vật',priority:65,stack:true,playerWeb:true},
    {id:'wolf_bitten',name:'Sói Cắn',icon:'🐺',type:'persistent',effect:'orbit',description:'🐺 Sói quay quanh nhân vật',priority:90,stack:true,playerWeb:true},
    {id:'marked',name:'Đánh Dấu',icon:'👍👎',type:'persistent',effect:'orbit',description:'👍 và 👎 quay quanh nhân vật (dấu Thần Chết)',priority:75,stack:true,playerWeb:false},
    {id:'dead',name:'Đã Chết',icon:'☠️',type:'persistent',effect:'gray-smoke',description:'Khói xám bao quanh, ☠️ quay quanh, nhân vật bất động',priority:100,stack:false,playerWeb:true},
    {id:'expelled',name:'Bị Đuổi',icon:'🌪️',type:'persistent',effect:'orbit',description:'🌪️ quay quanh nhân vật',priority:95,stack:false,playerWeb:true},
    {id:'infected',name:'Nhiễm Bệnh',icon:'🦠',type:'persistent',effect:'orbit',description:'🦠 quay quanh nhân vật',priority:70,stack:true,playerWeb:true},
    {id:'mute',name:'Bị Câm',icon:'😷',type:'persistent',effect:'orbit',description:'😷 quay quanh nhân vật',priority:60,stack:true,playerWeb:true},
    {id:'disabled_permanent',name:'Mất Năng Lực',icon:'🚫',type:'persistent',effect:'orbit',description:'🚫 quay quanh nhân vật',priority:80,stack:true,playerWeb:true},
    {id:'linked',name:'Liên Kết',icon:'✌️',type:'persistent',effect:'orbit',description:'✌️ quay quanh nhân vật',priority:55,stack:true,playerWeb:false},
    {id:'recover',name:'Hồi Sinh / Cứu',icon:'✨',type:'instant',effect:'orbit',description:'⭐ quay quanh nhân vật',priority:30,stack:true,playerWeb:true},
    {id:'transform',name:'Biến Đổi',icon:'🥳',type:'instant',effect:'orbit',description:'🥳 quay quanh nhân vật',priority:30,stack:true,playerWeb:true},
    {id:'attack',name:'Tấn Công',icon:'⚔️',type:'instant',effect:'orbit',description:'⚔️ quay quanh nhân vật',priority:30,stack:true,playerWeb:true},
    {id:'inspect',name:'Soi Xét',icon:'💫',type:'instant',effect:'orbit',description:'💫 quay quanh nhân vật',priority:30,stack:true,playerWeb:false},
    {id:'hunt',name:'Săn',icon:'🏹',type:'instant',effect:'orbit',description:'🏹 quay quanh nhân vật',priority:30,stack:true,playerWeb:true}
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
  const orbitIcons=Object.freeze({frozen:['❄️'],protected:['🛡️'],wolf_bitten:['🐺'],marked:['👍','👎'],dead:['☠️'],expelled:['🌪️'],infected:['🦠'],mute:['😷'],disabled_permanent:['🚫'],linked:['✌️'],recover:['⭐'],transform:['🥳'],attack:['⚔️'],hunt:['🏹'],inspect:['💫']});
  function orbitMarkup(id){
    const icons=orbitIcons[id]||[];if(!icons.length)return'';
    return '<span class="gmww-sv-orbit" data-orbit="'+safe(id)+'">'+Array.from({length:6},(_,i)=>'<span class="gmww-sv-orbit-item" style="--i:'+i+';--angle:'+(i*60)+'deg"><span class="'+(id==='wolf_bitten'?'gmww-sv-red-wolf':'')+'">'+safe(icons[i%icons.length])+'</span></span>').join('')+'</span>';
  }
  function overlay(ids){
    const collection=layers(ids);
    if(!collection.items.length)return'';
    const effects=collection.shown.map(id=>(id==='dead'?'<span class="gmww-sv-fx gmww-sv-gray-smoke" data-status-fx="dead" aria-hidden="true"><i></i><i></i><i></i></span>':'')+orbitMarkup(id)).join('');
    const badges=collection.items.map(id=>'<span title="'+safe(byId[id].name)+'">'+safe(byId[id].icon)+'</span>').join('');
    return '<span class="gmww-sv-overlay" aria-hidden="true">'+effects+'</span><span class="gmww-sv-badges" aria-hidden="true">'+badges+'</span>';
  }
  const api=Object.freeze({entries:Object.freeze(entries.map(x=>Object.freeze(x))),byId:Object.freeze(byId),normalize,resolveRows,layers,overlay,safe});
  root.GMWW_STATUS_VISUALS=api;
})(typeof globalThis==='object'?globalThis:window);
