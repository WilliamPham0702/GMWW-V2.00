// GMWW Character V4 — web-first staging contract; no legacy image dependencies.
// This module exposes public metadata only. Accounts/rooms are intentionally unchanged.
export const CHARACTER_V4_VERSION='4.0.0-preview';
export const CHARACTER_V4_ACTIONS=Object.freeze(['idle','walk','run','sit','sit-down','stand-up','wave','vote','result']);
export const CHARACTER_V4_DIRECTIONS=Object.freeze(['front','left','right','back']);
export const CHARACTER_V4_COUNT=20;
export function characterV4Catalog(){
 return Array.from({length:CHARACTER_V4_COUNT},(_,i)=>{
   const id='character-'+String(i+1).padStart(2,'0');
   return {id,name:'Nhân vật mới '+String(i+1).padStart(2,'0'),
     status:'awaiting-artwork',approved:false,
     views:{front:null,left:null,right:null,back:null},
     actions:CHARACTER_V4_ACTIONS};
 });
}
export function characterV4Status(){
 return {ok:true,version:CHARACTER_V4_VERSION,webOnly:true,ipaDeployed:false,
   legacyCharacters:{policy:'archived-for-replacement',availableInCurrentGame:true,
     reason:'Existing accounts and room sessions must remain functional until replacement assets are approved.'},
   count:CHARACTER_V4_COUNT,approvedCount:0,masterCharacter:'character-01',
   actions:CHARACTER_V4_ACTIONS,directions:CHARACTER_V4_DIRECTIONS,
   characters:characterV4Catalog()};
}
