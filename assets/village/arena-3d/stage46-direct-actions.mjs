// GĐ46 - Player 3D direct actions: pure, side-effect-free validation helpers.
// The Player Web sheet (same origin, framed) keeps the member credential and runs the
// real Core action flow. The 3D page only receives a MINIMAL descriptor list for the
// current player's own turn and sends back "pick action" / "target member" intents.
// This module never decides outcomes: Core validates every action on the server.
export const STAGE46_VERSION='gmww.arena.player-direct-actions.46';
export const BRIDGE_STATE='gmww3d:state';
export const BRIDGE_TOAST='gmww3d:toast';
export const BRIDGE_PICK='gmww3d:pick-action';
export const BRIDGE_TARGET='gmww3d:target';
export const BRIDGE_CANCEL='gmww3d:cancel';
export const BRIDGE_REQUEST='gmww3d:request-state';
const ID=/^[a-z0-9_.-]{1,80}$/i;
const clip=(v,n)=>String(v==null?'':v).slice(0,n);
const count=v=>{const n=Number.parseInt(v,10);return Number.isFinite(n)?Math.max(0,Math.min(5,n)):0};
export const memberIdOf=id=>typeof id==='string'?id.replace(/^member:/,''):'';
export function sanitizeBridgeState(raw){
 if(!raw||typeof raw!=='object'||raw.type!==BRIDGE_STATE)return null;
 const people=(Array.isArray(raw.people)?raw.people:[]).slice(0,60)
  .map(p=>({id:memberIdOf(clip(p?.id,90)),name:clip(p?.name,40)})).filter(p=>ID.test(p.id));
 const actions=(Array.isArray(raw.actions)?raw.actions:[]).slice(0,20)
  .map(a=>({key:clip(a?.key,120),name:clip(a?.name||'Hành động',60),
   targetCount:count(a?.targetCount),noSelf:a?.noSelf===true,blocked:a?.blocked===true}))
  .filter(a=>a.key);
 const p=raw.picking&&typeof raw.picking==='object'?raw.picking:null;
 const picking=p&&clip(p.key,120)?{key:clip(p.key,120),name:clip(p.name,60),
  need:count(p.need),noSelf:p.noSelf===true,
  targets:(Array.isArray(p.targets)?p.targets:[]).slice(0,5).map(x=>memberIdOf(clip(x,90))).filter(x=>ID.test(x))}:null;
 return Object.freeze({actions:Object.freeze(actions),people:Object.freeze(people),
  selfId:ID.test(clip(raw.selfId,90))?clip(raw.selfId,90):'',picking,busy:raw.busy===true});
}
// Same-origin + the exact framed Player Web window; anything else is ignored.
export function bridgeEventAccepted(event,{origin,frameWindow}){
 return Boolean(event&&frameWindow&&event.source===frameWindow&&event.origin===origin);
}
export function usableActions(state){
 return state?state.actions.filter(a=>!a.blocked):[];
}
// Returns the member id to send to the Player Web target flow, or null when not allowed.
export function targetFromTap(actorId,state){
 if(!state||!state.picking)return null;
 const id=memberIdOf(actorId);
 if(!ID.test(id)||!state.people.some(p=>p.id===id))return null;
 if(state.picking.noSelf&&id===state.selfId)return null;
 if(state.picking.targets.includes(id))return null;
 return id;
}
export function pickHint(state){
 if(!state)return '';
 if(state.picking){
  if(state.picking.need===0)return state.picking.name+': không cần mục tiêu.';
  return state.picking.name+' · chạm nhân vật làm mục tiêu '+
   Math.min(state.picking.targets.length+1,state.picking.need)+'/'+state.picking.need+'.';
 }
 const n=usableActions(state).length;
 return n?'Có '+n+' hành động sẵn sàng. Chọn một hành động bên dưới.':'';
}
export function outboundCommand(kind,payload={}){
 if(kind===BRIDGE_REQUEST||kind===BRIDGE_CANCEL)return {type:kind};
 if(kind===BRIDGE_PICK){const key=clip(payload.key,120);return key?{type:kind,key}:null}
 if(kind===BRIDGE_TARGET){const id=memberIdOf(clip(payload.id,90));return ID.test(id)?{type:kind,id}:null}
 return null;
}
