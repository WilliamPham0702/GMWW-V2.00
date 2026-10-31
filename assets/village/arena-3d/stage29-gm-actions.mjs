// GĐ29 - Private GM menu projection of *delivered* Core role/artifact cards.
// The caller must first authenticate the GM and establish the current Core turn.
// Never put this return value in a public room snapshot, WS or DOM dataset.
import {CORE_ACTION_CATALOG} from './stage11-core-catalog.mjs';
import {matchConfiguredAction} from './stage14-dynamic-actions.mjs';
export const ARENA_STAGE29_VERSION='gmww.arena.private-action-menu.29';
const VALID=/^[a-z0-9_.-]{1,80}$/i;
const KNOWN_LABELS=new Map(CORE_ACTION_CATALOG.map(x=>[x.id,x.name]));
const clipped=v=>String(v||'').slice(0,80);
export function privateTurnActionOptions({actorId='',roleId='',artifactId='',
 card=null,artifactCard=null,turnActorIds=[],matchOk=false}={}){
 if(!matchOk||!VALID.test(actorId)||!turnActorIds.includes('member:'+actorId))return [];
 const out=[],used=new Set();
 const append=(source,artifact)=>{
  if(!source||typeof source!=='object')return;
  for(const fn of [...(Array.isArray(source.functions)?source.functions:[]),
   ...(Array.isArray(source.actions)?source.actions:[])].slice(0,80)){
   const id=String(fn?.actionId||fn?.id||'');
   if(!VALID.test(id)||used.has(artifact+':'+id)||!matchConfiguredAction(source,id))continue;
   // Passive abilities cannot be sent as user-triggered battle actions.
   if(fn?.passive===true)continue;
   const noTarget=fn?.noTarget===true||fn?.targetCount===0;
   const targets=Number.isInteger(Number(fn?.targetCount))?Number(fn.targetCount):1;
   if(targets<0||targets>5)continue;
   used.add(artifact+':'+id);
   out.push(Object.freeze({
    actorId,roleId:artifact?'':roleId,artifactId:artifact,
    actionId:id,type:VALID.test(fn?.type)?fn.type:'effect_notice',
    label:clipped(fn?.label||fn?.name||KNOWN_LABELS.get(id)||id),
    targetCount:noTarget?0:Math.max(1,targets),
    noSelf:fn?.noSelf===true
   }));
  }
 };
 append(card,'');
 if(VALID.test(artifactId))append(artifactCard,artifactId);
 return Object.freeze(out.slice(0,60));
}
export function validateGmActionTargets(action,targetIds){
 if(!action||!Array.isArray(targetIds))return null;
 const count=Number(action.targetCount);
 if(!Number.isInteger(count)||count<0||count>5||targetIds.length!==count)return null;
 const distinct=new Set(targetIds);
 if(distinct.size!==targetIds.length||targetIds.some(x=>typeof x!=='string'||!/^member:[a-z0-9_.-]{1,80}$/i.test(x)))return null;
 if(action.noSelf&&distinct.has('member:'+action.actorId))return null;
 return targetIds.map(x=>x.slice(7));
}
