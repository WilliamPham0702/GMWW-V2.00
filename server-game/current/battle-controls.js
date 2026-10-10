/* GMWW battle controls: pure, data-driven presentation rules. No automatic resolution of effects. */
(function(root){
  "use strict";
  const folded = value => String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const labelOf = (row,fallback) => String(row?.name||row?.label||fallback||"").trim();
  const loginOf = value => String(value||"").replace(/^member:/,"");
  const displayLabel = (row,fallback) => row?.kind==="wolf-introduction"?"Bầy sói":labelOf(row,fallback);
  function currentTurn(phase,runtime){
    if(phase!=="night"||!runtime||runtime.completed)return null;
    return Array.isArray(runtime.queue)?runtime.queue[Math.max(0,Number(runtime.cursor)||0)]||null:null;
  }
  function artifactUsed(used,step){
    if(!step||(step.kind!=="early-artifact"&&step.kind!=="artifact-main"))return false;
    return (Array.isArray(used)?used:[]).some(x=>String(x?.artifactId||"")===String(step.artifactId||"")&&String(x?.playerId||("member:"+loginOf(x?.loginId)))===String(step.playerId||""));
  }
  function remainingSeconds(runtime,serverNow=Date.now()){
    const current=currentTurn("night",runtime);
    if(!current)return null;
    const seconds=Number(current.durationSec);
    if(!Number.isFinite(seconds)||seconds<=0)return null;
    const deadline=Date.parse(runtime?.deadlineAt||"");
    if(Number.isFinite(deadline))return Math.max(0,Math.ceil((deadline-serverNow)/1000));
    const paused=Number(runtime?.autoPausedRemainingMs);
    if(Number.isFinite(paused)&&paused>0)return Math.max(0,Math.ceil(paused/1000));
    const start=Date.parse(current.startedAt||runtime?.startedAt||"");
    return Number.isFinite(start)?Math.max(0,Math.ceil(seconds-(serverNow-start)/1000)):Math.ceil(seconds);
  }
  function formatTime(seconds){
    if(seconds===null||!Number.isFinite(seconds))return "--:--";
    const s=Math.max(0,Math.ceil(seconds));
    return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");
  }
  function timeline(phase,runtime,night,used=[]){
    const n=Math.max(1,Number(night)||1);
    if(phase==="day")return [{id:"wake",kind:"day",label:"Làng ơi dậy đi",status:"active",active:true}];
    if(phase!=="night")return [{id:"start",kind:"start",label:"Bắt đầu Đêm 1",status:"active",active:true}];
    const queue=Array.isArray(runtime?.queue)?runtime.queue:[];
    const cursor=Math.max(0,Number(runtime?.cursor)||0);
    const rows=queue.map((row,i)=>({id:String(row?.id||i),kind:String(row?.kind||"role"),label:displayLabel(row,"Lượt "+(i+1)),status:artifactUsed(used,row)?"used":row?.status==="skipped"?"skipped":i<cursor?"completed":i===cursor&&!runtime?.completed?"active":"pending",active:i===cursor&&!runtime?.completed}));
    rows.push({id:"wake",kind:"day",label:"Làng ơi dậy đi",status:runtime?.completed?"active":"pending",active:!!runtime?.completed});
    return rows;
  }
  function resolvedType(action){
    const x=folded([action?.actionId,action?.name,...(action?.effectIds||[])].join(" "));
    if(/(freeze|dong_bang|dong bang|frozen)/.test(x))return "frozen";
    if(/(exile|expel|duoi|banish)/.test(x))return "expelled";
    if(/(revive|hoi_sinh|resurrect)/.test(x))return "revive";
    if(/(kill|chet|giet|poison)/.test(x))return "dead";
    return "effect_notice"; // bite/protection/divination needs the effect engine, never immediate death.
  }
  function actionsForTurn(turn,night,catalog){
    if(!turn||turn.kind==="wolf-introduction")return [];
    const roles=Array.isArray(catalog?.cards)?catalog.cards:[],artifacts=Array.isArray(catalog?.artifacts)?catalog.artifacts:[],actions=Array.isArray(catalog?.actions)?catalog.actions:[];
    const isArt=turn.kind==="early-artifact"||turn.kind==="artifact-main";
    const pool=isArt?artifacts:roles,chosen=pool.find(r=>String(r?.id||"")===String(isArt?turn.artifactId:turn.roleId))||pool.find(r=>folded(r?.name)===folded(turn.label));
    const fns=Array.isArray(chosen?.functions)?chosen.functions:Array.isArray(chosen?.actions)?chosen.actions:[];
    return fns.filter(fn=>fn&&!fn.passive&&(fn.phase==="night"||!fn.phase||fn.phase==="any")&&(!fn.fromNight||Number(fn.fromNight)<=Number(night))&&(!fn.toNight||Number(fn.toNight)>=Number(night))).map((fn,i)=>{
      const definition=actions.find(a=>String(a?.id||"")===String(fn?.actionId||"")),name=labelOf(definition,labelOf(fn,fn?.actionId||"Hành động "+(i+1)));
      return {id:String(fn.id||fn.actionId||i),actionId:String(fn.actionId||""),name,type:resolvedType({...fn,name}),noSelf:fn.noSelf!==false,allowDead:!!fn.allowDead,noTarget:!!fn.noTarget,targetCount:Math.max(0,Math.min(30,Math.trunc(Number(fn.targetCount??1)||0))),effectIds:Array.isArray(fn.effectIds)?fn.effectIds.map(String):[],actorIds:(turn.loginIds||[turn.loginId]).filter(Boolean).map(loginOf)};
    });
  }
  function targetAllowed(action,member,effect){
    if(!action||!member?.loginId||action.noTarget)return false;
    if(action.noSelf&&action.actorIds.includes(loginOf(member.loginId)))return false;
    if(action.type==="revive")return effect==="dead";
    return action.allowDead||effect!=="dead"&&effect!=="expelled";
  }
  const api=Object.freeze({currentTurn,timeline,displayLabel,artifactUsed,remainingSeconds,formatTime,resolvedType,actionsForTurn,targetAllowed});
  root.GMWW_BATTLE_CONTROLS=api;
})(globalThis);
