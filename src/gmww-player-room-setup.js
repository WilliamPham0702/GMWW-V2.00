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
export function planPlayerRoomDeal(roles,members,shuffle,artifacts=[]){
  const deck=expandDeck(roles),people=(Array.isArray(members)?members:[]).filter(m=>m&&m.loginId);
  if(!people.length)return{ok:false,error:'NO_PLAYERS'};
  if(deck.length!==people.length)return{ok:false,error:'ROLE_COUNT_MISMATCH',need:deck.length,have:people.length};
  const mixed=shuffle([...deck]);
  if(!Array.isArray(mixed)||mixed.length!==deck.length)return{ok:false,error:'SHUFFLE_FAILED'};
  const artifactPool=Array.isArray(artifacts)?artifacts.filter(a=>String(a?.artifactId||a?.id||'')):[];
  const artifactOrder=shuffle([...artifactPool]);
  if(!Array.isArray(artifactOrder)||artifactOrder.length!==artifactPool.length)return{ok:false,error:'SHUFFLE_FAILED'};
  const recipients=artifactOrder.length?shuffle([...people]):[];
  if(artifactOrder.length&&(!Array.isArray(recipients)||recipients.length!==people.length))return{ok:false,error:'SHUFFLE_FAILED'};
  const artifactByPlayer=new Map(recipients.slice(0,Math.min(people.length,artifactOrder.length)).map((m,i)=>[String(m.loginId),artifactOrder[i]]));
  return{ok:true,rows:people.map((m,i)=>{
    const a=artifactByPlayer.get(String(m.loginId));
    return{loginId:m.loginId,roleId:mixed[i].roleId,roleName:mixed[i].roleName,faction:mixed[i].faction,order:mixed[i].order,...(a?{artifact:{artifactId:String(a.artifactId||a.id),artifactName:String(a.name||a.artifactName||''),artifactCard:a.artifactCard||a.package?.roleCard||a}}:{})};
  })};
}

export function playerRoomConfigFromTemplate(template){
  const base=template&&typeof template.compiledConfig==='object'?template.compiledConfig:null;
  if(!base||!Array.isArray(base.roles)||!base.roles.length)return null;
  return{...base,id:String(template.id||base.id||''),artifactsEnabled:base.artifactsEnabled===true,
    artifacts:base.artifactsEnabled===true&&Array.isArray(base.artifacts)?base.artifacts.slice(0,100):[]};
}

// Role ids of a config that have no stored role card yet (checked before dealing).
export function missingRoleCards(roles,hasCard){
  return [...new Set((Array.isArray(roles)?roles:[]).map(r=>String(r?.roleId||'')).filter(Boolean))].filter(id=>!hasCard(id));
}

// What the owner may see about the deck: names and counts, never any assignment.
export function ownerDeckView(cfg){
  if(!cfg||typeof cfg!=='object')return null;
  return{id:String(cfg.id||''),name:String(cfg.name||''),playerCount:Number(cfg.playerCount||0),
    artifactsEnabled:cfg.artifactsEnabled===true,artifacts:(Array.isArray(cfg.artifacts)?cfg.artifacts:[]).map(a=>({artifactId:String(a?.artifactId||''),name:String(a?.name||a?.artifactName||''),order:Number(a?.order)||0})),
    artifactLimitPerCycle:Math.max(0,Math.min(30,Number(cfg.artifactLimitPerCycle??3)||0)),timing:cfg.timing&&typeof cfg.timing==='object'?{...cfg.timing}:{},
    roles:(Array.isArray(cfg.roles)?cfg.roles:[]).map(r=>({roleId:String(r?.roleId||''),roleName:String(r?.roleName||''),faction:String(r?.faction||''),count:Math.max(1,Number(r?.count)||1)}))};
}
