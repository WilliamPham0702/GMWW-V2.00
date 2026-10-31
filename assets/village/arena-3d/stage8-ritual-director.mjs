// Arena GĐ8: pure, public-safe ritual orchestration. Never derive secret roles or targets.
export const STAGE8_VERSION='gmww.arena.core-ritual-director.8';
export const RITUAL_KINDS=Object.freeze(['shield','inspect','heal','attack','vote']);
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
import {ARENA_FAMILIES} from './stage14-dynamic-actions.mjs';
export function normalizeRitualCue(cue,actorIds=[],now=Date.now()){
 if(!cue||typeof cue!=='object'||typeof cue.turnId!=='string'||!cue.turnId)return null;
 const authorized=new Set(actorIds.filter(x=>typeof x==='string'&&x.length>0));
 const participants=[...new Set((Array.isArray(cue.actorIds)?cue.actorIds:[]).filter(x=>authorized.has(x)))].slice(0,30);
 if(!participants.length)return null;
 const cast=cue.cast;
 if(!cast||!participants.includes(cast.actorId)||!RITUAL_KINDS.includes(cast.kind))return {turnId:cue.turnId,actorIds:participants,cast:null};
 const expiresAt=Number(cast.expiresAt),startedAt=Number(cast.startedAt);
 if(!Number.isFinite(expiresAt)||expiresAt<=now||expiresAt>now+60000||!Number.isFinite(startedAt)||startedAt>expiresAt)return {turnId:cue.turnId,actorIds:participants,cast:null};
 const targets=[...new Set((Array.isArray(cast.targetIds)?cast.targetIds:[]).filter(x=>authorized.has(x)))].slice(0,5);
 return {turnId:cue.turnId,actorIds:participants,cast:{actorId:cast.actorId,targetIds:targets,kind:cast.kind,startedAt,expiresAt,roleId:typeof cast.roleId==='string'?cast.roleId:'',actionId:typeof cast.actionId==='string'?cast.actionId:'',
    visualFamily:ARENA_FAMILIES.includes(cast.visualFamily)?cast.visualFamily:''}};
}
export function ritualSequence(cue,{start=0,approachMs=900,castMs=2500,returnMs=1400}={}){
 if(!cue?.actorIds?.length)return [];
 const cast=cue.cast;
 const phases=[{phase:'standing',at:start,actorIds:cue.actorIds}];
 phases.push({phase:'approaching',at:start+Math.max(0,approachMs*.15),actorIds:cue.actorIds});
 if(cast){
  phases.push({phase:'casting',at:start+approachMs,actorIds:[cast.actorId],kind:cast.kind,targetIds:cast.targetIds});
  phases.push({phase:'returning',at:start+approachMs+castMs,actorIds:cue.actorIds});
  phases.push({phase:'seated',at:start+approachMs+castMs+returnMs,actorIds:cue.actorIds});
 }else phases.push({phase:'awaiting-core',at:start+approachMs,actorIds:cue.actorIds});
 return phases;
}
export function ritualPhaseAt(sequence,time){
 let phase=null;for(const item of sequence){if(time>=item.at)phase=item;else break;}return phase;
}
export function ritualQuality({players=6,fps=60,reducedMotion=false,lowPower=false}={}){
 const count=clamp(Math.trunc(Number(players)||6),6,30);
 const safeFps=Number.isFinite(fps)?fps:60;
 const minimal=reducedMotion||lowPower||safeFps<20;
 return {characterLimit:count,simultaneousCasters:minimal?1:count>20?2:3,
  effectTrailSegments:minimal?2:count>20?4:8,
  cameraEaseMs:reducedMotion?0:lowPower?600:900,
  decorativeParticles:minimal?0:count>20?4:10};
}
export function publicRitualSummary(cue){
 if(!cue)return {active:false,kind:null,actors:0,targets:0};
 return {active:true,kind:cue.cast?.kind||null,actors:cue.actorIds.length,targets:cue.cast?.targetIds?.length||0};
}
