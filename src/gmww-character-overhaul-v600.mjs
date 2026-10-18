// Character V6.00 STAGING ONLY: no automatic activation or production changes.
import roster from '../assets/characters/overhaul-v600/manifest.json' with { type: 'json' };
export const CHARACTER_V600_ROSTER=Object.freeze(roster.characters.map(c=>Object.freeze({...c})));
export const CHARACTER_V600_ACTIONS=Object.freeze([...roster.actions]);
export const CHARACTER_V600_DIRECTIONS=Object.freeze([...roster.directions]);
export const CHARACTER_V600_READY=false; // Must only change after approved 30 real GLBs + avatars, regression and human iPhone QA.
export const CHARACTER_V600_MANIFEST=roster;
const idPattern=/^character-(0[1-9]|[12][0-9]|30)$/;
export function characterV600ById(id){return CHARACTER_V600_ROSTER.find(c=>c.id===String(id||''))||null}
export function characterV600IsValid(id){return idPattern.test(String(id||''))}
export function characterV600LegacyId(id){
 const n=Number(String(id||'').match(/^character-(\\d{2})$/)?.[1]||0);
 if(n>=1&&n<=30)return 'character-'+String(n).padStart(2,'0');
 // Preserve member data/history; only map obsolete presentation slots 31..42 deterministically.
 if(n>=31&&n<=42)return 'character-'+String(21+((n-31)%10)).padStart(2,'0');
 return null;
}
export function characterV600AssetAudit(exists){
 const missing=[];
 for(const c of CHARACTER_V600_ROSTER){
  for(const p of [c.avatarPath,c.skinPath])if(!exists(p))missing.push(p);
 }
 return {ready:missing.length===0&&CHARACTER_V600_READY,missing,characterCount:CHARACTER_V600_ROSTER.length};
}
