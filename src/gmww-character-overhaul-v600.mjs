// V6.00 STAGING CONTRACT — deliberately not imported by live Worker/runtime.
// Character V5.83 style, V5.10 original 16-bone rig, no automatic asset replacement.
import roster from '../assets/characters/overhaul-v600/manifest.json' with {type:'json'};
export const CHARACTER_V600_MANIFEST=roster;
export const CHARACTER_V600_ROSTER=Object.freeze(roster.characters.map(c=>Object.freeze({...c})));
export const CHARACTER_V600_ACTIONS=Object.freeze([...roster.actions]);
export const CHARACTER_V600_DIRECTIONS=Object.freeze([...roster.directions]);
export const CHARACTER_V600_READY=false; // Must remain FALSE until physical art, GLBs, avatar QA and owner approval.
const idPattern=/^character-(0[1-9]|[12][0-9]|30)$/;
const legacyIdPattern=/^character-(0[1-9]|[1-3][0-9]|4[0-2])$/;
export function characterV600IsValid(id){return idPattern.test(String(id||''))}
export function characterV600ById(id){return CHARACTER_V600_ROSTER.find(c=>c.id===String(id||''))||null}
export function characterV600LegacyId(id){
 const raw=String(id||'');
 if(!legacyIdPattern.test(raw))return null;
 const n=Number(raw.slice(-2));
 if(n<=30)return raw;
 // Historical IDs 31–42 remain readable while 30 current slots replace the visual.
 return 'character-'+String(21+(n-31)%10).padStart(2,'0');
}
// Keep member identity, passwords, play history, rankings and room state unchanged.
// Only transform game-character artwork selection and its matching builtin avatar ID.
export function characterV600MigrateMember(member){
 if(!member||typeof member!=='object')throw new TypeError('EXPECTED_MEMBER');
 const original=String(member.gameCharacterId||'');
 const remapped=characterV600LegacyId(original);
 if(!remapped)return {...member};
 const avatarWasLinked=String(member.avatarId||'')===original;
 return {...member,gameCharacterId:remapped,...(avatarWasLinked?{avatarId:remapped}:{})};
}
const motionAliases=Object.freeze({
 'idle-breathe':'idle',idle:'idle',
 walking:'walk',walk:'walk',
 running:'run',run:'run',
 'cheer':'result',result:'result'
});
export function characterV600Motion(action='idle',direction='front'){
 const motion=motionAliases[String(action||'').trim().toLowerCase()]||'idle';
 const facing=CHARACTER_V600_DIRECTIONS.includes(direction)?direction:'front';
 return {motion,facing};
}
export function characterV600AssetsFor(id){
 const row=characterV600ById(id);
 if(!row)return null;
 return Object.freeze({id:row.id,artwork:row.artworkPath,avatar:row.avatarPath,skin:row.skinPath});
}
export function characterV600Catalog(){
 return CHARACTER_V600_ROSTER.map(c=>Object.freeze({
  id:c.id,name:c.name,body:c.body,rigId:c.rigId,
  imageUrl:'/characters/overhaul-v600/'+c.id+'/avatar.webp',
  frameCount:4,actions:CHARACTER_V600_ACTIONS
 }));
}
export function characterV600AssetAudit(exists){
 if(typeof exists!=='function')throw new TypeError('EXPECTED_EXISTS_CALLBACK');
 const missing=[];
 for(const c of CHARACTER_V600_ROSTER){
  for(const p of [c.artworkPath,c.avatarPath,c.skinPath])if(!exists(p))missing.push(p);
 }
 return {
  ready:missing.length===0&&CHARACTER_V600_READY&&roster.readyForMain===true,
  missing,required:CHARACTER_V600_ROSTER.length*3,found:CHARACTER_V600_ROSTER.length*3-missing.length,
  characterCount:CHARACTER_V600_ROSTER.length
 };
}
