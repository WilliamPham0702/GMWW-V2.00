// Arena 3D GĐ26 — visual-only signatures for every canonical Core action.
// Action IDs never originate from anonymous/public frames; caller MUST use a
// Core-accepted GM-private cast. No audio URL or gameplay rule is synthesized.
import {CORE_ACTION_CATALOG,CORE_ROLE_CATALOG} from './stage11-core-catalog.mjs';
import {CORE_ACTION_FAMILY} from './stage11-core-action-bridge.mjs';
export const ARENA_STAGE26_VERSION='gmww.arena.action-signatures.26';
const ACTION_IDS=Object.freeze(CORE_ACTION_CATALOG.map(a=>a.id));
const CHARSET=/^[a-zA-Z0-9_.-]{1,80}$/;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const HEX='/';
function hashId(value){let h=2166136261;for(const ch of value){h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;}return h>>>0;}
function signature(id,family){
 const hash=hashId(id);
 // Distinct rendering signatures are harmless phase offsets, colors and sizes.
 // Their numeric values are decorative ONLY; never alter Core targets/results.
 const hue=hash%360;
 return Object.freeze({actionId:id,family,accentHue:hue,
   gestureSpeed:Math.round((0.78+(hash%13)*0.035)*1000)/1000,
   orbitalPhase:Math.round(((hash>>>7)%6283)/1000*1000)/1000,
   impactScale:Math.round((0.78+((hash>>>16)%31)*.012)*1000)/1000,
   streakCount:3+((hash>>>10)%5),
   // Keep the sonic cue an ID from the existing family mapping, never a URL.
   signatureId:'fx-'+hash.toString(36)});
}
const BUILTIN=Object.freeze(Object.fromEntries(ACTION_IDS.map(id=>[id,
 signature(id,CORE_ACTION_FAMILY[id]||'scout')])));
export function arenaActionSignature({actionId='',family='scout',coreConfirmed=false}={}){
 // Custom ID signatures only exist as a consequence of confirmed Core
 // action + resolved authenticated private-card visual family.
 if(!coreConfirmed||typeof actionId!=='string'||!CHARSET.test(actionId))return null;
 if(Object.hasOwn(BUILTIN,actionId))return BUILTIN[actionId];
 const families=['wand','oracle','wolf','shield','heal','attack','vote','scout','curse'];
 if(!families.includes(family))return null;
 return signature(actionId,family);
}
export function arenaSignatureCoverage(){
 const mapped=ACTION_IDS.filter(x=>Object.hasOwn(BUILTIN,x));
 return Object.freeze({builtInRoles:CORE_ROLE_CATALOG.length,
   passiveRoles:CORE_ROLE_CATALOG.filter(x=>!x.actionIds.length).length,
   builtInActions:ACTION_IDS.length,mapped:mapped.length,
   missing:ACTION_IDS.filter(x=>!Object.hasOwn(BUILTIN,x)),
   customRoleAndArtifact:'requires-Core-confirmed-private-card-action'});
}
export const ARENA_CANONICAL_ACTION_SIGNATURES=BUILTIN;
