// Server-side set-up for player-created rooms (online only). Pure helpers, no storage/network.
// The room owner never sees who holds which role: the deal is made here, from a GM-published
// Ván Mẫu (template), and only the deck (role names and counts) is exposed back to the owner.

// One entry per physical card: roles are listed once with a count.
export function expandDeck(roles){
  const out=[];
  for(const r of Array.isArray(roles)?roles:[]){
    const roleId=String(r?.roleId||'');if(!roleId)continue;
    const n=Math.max(1,Math.min(20,Math.trunc(Number(r?.count))||1));
    for(let i=0;i<n;i++)out.push({roleId,roleName:String(r?.roleName||''),faction:String(r?.faction||''),order:Number(r?.order||0)});
  }
  return out;
}

// members: [{loginId}], shuffle: array => shuffled copy (the Worker passes its crypto shuffle).
export function planPlayerRoomDeal(roles,members,shuffle){
  const deck=expandDeck(roles),people=(Array.isArray(members)?members:[]).filter(m=>m&&m.loginId);
  if(!people.length)return{ok:false,error:'NO_PLAYERS'};
  if(deck.length!==people.length)return{ok:false,error:'ROLE_COUNT_MISMATCH',need:deck.length,have:people.length};
  const mixed=shuffle([...deck]);
  if(!Array.isArray(mixed)||mixed.length!==deck.length)return{ok:false,error:'SHUFFLE_FAILED'};
  return{ok:true,rows:people.map((m,i)=>({loginId:m.loginId,roleId:mixed[i].roleId,roleName:mixed[i].roleName,faction:mixed[i].faction,order:mixed[i].order}))};
}

// Version 1 of player rooms plays roles only: artifacts are not dealt, so the template's
// artifact list is switched off for the room instead of leaving cards nobody can receive.
export function playerRoomConfigFromTemplate(template){
  const base=template&&typeof template.compiledConfig==='object'?template.compiledConfig:null;
  if(!base||!Array.isArray(base.roles)||!base.roles.length)return null;
  return{...base,id:String(template.id||base.id||''),artifactsEnabled:false,artifacts:[]};
}

// Role ids of a config that have no stored role card yet (checked before dealing).
export function missingRoleCards(roles,hasCard){
  return [...new Set((Array.isArray(roles)?roles:[]).map(r=>String(r?.roleId||'')).filter(Boolean))].filter(id=>!hasCard(id));
}

// What the owner may see about the deck: names and counts, never any assignment.
export function ownerDeckView(cfg){
  if(!cfg||typeof cfg!=='object')return null;
  return{id:String(cfg.id||''),name:String(cfg.name||''),playerCount:Number(cfg.playerCount||0),
    roles:(Array.isArray(cfg.roles)?cfg.roles:[]).map(r=>({roleId:String(r?.roleId||''),roleName:String(r?.roleName||''),faction:String(r?.faction||''),count:Math.max(1,Number(r?.count)||1)}))};
}
