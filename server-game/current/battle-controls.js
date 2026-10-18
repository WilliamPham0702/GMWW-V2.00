/* GMWW battle controls: pure, data-driven presentation rules. No automatic resolution of effects. */
(function(root){
  "use strict";
  const folded = value => String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const labelOf = (row,fallback) => String(row?.name||row?.label||fallback||"").trim();
  const loginOf = value => String(value||"").replace(/^member:/,"");
  const displayLabel = (row,fallback) => row?.kind==="wolf-introduction"?"Bầy sói ơi dậy đi":labelOf(row,fallback);
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
    if(phase!=="night")return [{id:"start",kind:"start",label:"Đêm thứ "+n,status:"active",active:true}];
    const queue=Array.isArray(runtime?.queue)?runtime.queue:[];
    const cursor=Math.max(0,Number(runtime?.cursor)||0);
    const rows=queue.map((row,i)=>({id:String(row?.id||i),kind:String(row?.kind||"role"),label:row?.kind==="village-wakeup"?"Làng ơi dậy đi":displayLabel(row,"Lượt "+(i+1)),displayNumber:["role","role-group"].includes(row?.kind)&&Number.isFinite(Number(row?.order))&&Number(row.order)>0?Number(row.order):i+1,status:artifactUsed(used,row)?"used":row?.status==="skipped"?"skipped":i<cursor?"completed":i===cursor&&!runtime?.completed?"active":"pending",active:i===cursor&&!runtime?.completed}));
    if(!queue.some(row=>row?.kind==="village-wakeup"))rows.push({id:"wake",kind:"day",label:"Làng ơi dậy đi",status:runtime?.completed?"active":"pending",active:!!runtime?.completed});
    return rows;
  }
  function resolvedType(action){
    const x=folded([action?.actionId,action?.name,...(action?.effectIds||[])].join(" "));
    if(/(assassin_mark|danh dau)/.test(x))return "assassin_mark";
    if(/(freeze|dong_bang|dong bang|frozen)/.test(x))return "frozen";
    if(/(exile|expel|duoi|banish)/.test(x))return "expelled";
    if(/(revive|hoi_sinh|resurrect)/.test(x))return "revive";
    if(/(kill|chet|giet|poison)/.test(x))return "dead";
    return "effect_notice"; // bite/protection/divination needs the effect engine, never immediate death.
  }
  // The server owns the authoritative turn and Artifact-use ledger.
  // A role turn may contain both role and owned Artifact actions.
  function actionsForTurn(turn,night,catalog,used=[]){
    if(!turn||turn.kind==="wolf-introduction"||turn.kind==="village-wakeup")return [];
    const roles=Array.isArray(catalog?.cards)?catalog.cards:[],
      artifacts=Array.isArray(catalog?.artifacts)?catalog.artifacts:[],
      definitions=catalog?.actions||[];
    const alreadyUsed=owned=>artifactUsed(used,{kind:"artifact-main",artifactId:owned.artifactId,playerId:owned.playerId||"member:"+loginOf(owned.loginId)});
    const build=(owner,isArt)=>{
      const pool=isArt?artifacts:roles;
      const id=isArt?owner.artifactId:owner.roleId;
      const chosen=pool.find(row=>String(row?.id||"")===String(id))||pool.find(row=>folded(row?.name)===folded(isArt?owner.artifactName:owner.label));
      const fns=Array.isArray(chosen?.functions)?chosen.functions:Array.isArray(chosen?.actions)?chosen.actions:[];
      const actorIds=isArt?[loginOf(owner.loginId)]:(owner.loginIds||[owner.loginId]).filter(Boolean).map(loginOf);
      return fns.filter(fn=>fn&&!fn.passive&&(fn.phase==="night"||!fn.phase||fn.phase==="any")&&(!fn.fromNight||Number(fn.fromNight)<=Number(night))&&(!fn.toNight||Number(fn.toNight)>=Number(night))).map((fn,i)=>{
        const actionCatalog=Array.isArray(definitions)?definitions:(isArt?definitions.artifacts:definitions.role)||[];
        const definition=actionCatalog.find(a=>String(a?.id||"")===String(fn?.actionId||"")),
          label=labelOf(definition,labelOf(fn,"")),
          technical=/^action[-_][a-z0-9_-]+$/i.test(label)||!label,
          description=String(fn?.description||definition?.description||"").trim(),
          knownName={"action-lone-wolf-join":"Gia nhập Bầy Sói"}[String(fn?.actionId||"")],
          name=technical?(knownName||(/^.{3,52}$/.test(description)&&!/^action[-_]/i.test(description)?description:"Hành động "+(i+1))):label;
        return {id:(isArt?"artifact:"+id+":"+loginOf(owner.loginId)+":":"role:"+id+":")+String(fn.id||fn.actionId||i),
          actionId:String(fn.actionId||""),name,type:resolvedType({...fn,name}),noSelf:fn.noSelf!==false,
          allowDead:!!fn.allowDead,noTarget:!!fn.noTarget,
          targetCount:Math.max(0,Math.min(30,Math.trunc(Number(fn.targetCount??1)||0))),
          effectIds:Array.isArray(fn.effectIds)?fn.effectIds.map(String):[],actorIds,
          ...(isArt?{artifactId:String(owner.artifactId),artifactLoginId:loginOf(owner.loginId),artifactName:String(owner.artifactName||chosen?.name||"Artifact")}: {})};
      });
    };
    if(turn.kind==="early-artifact-window")
      return (Array.isArray(turn.actions)?turn.actions:[]).filter(owner=>!alreadyUsed(owner)).flatMap(owner=>build(owner,true));
    if(turn.kind==="role")
      return [...build(turn,false),...(Array.isArray(turn.artifacts)?turn.artifacts:[]).filter(owner=>!alreadyUsed(owner)).flatMap(owner=>build(owner,true))];
    if(turn.kind==="role-group"){
      const roles=Array.isArray(turn.roles)?turn.roles:[],dedup=new Map(),art=[];
      for(const role of roles){
        for(const action of build(role,false)){
          // Same visible function + targeting/effect contract = one group action.
          // Distinct powers must remain distinct even when names look similar.
          const key=JSON.stringify([folded(action.name),action.type,action.targetCount,
            action.noSelf,action.allowDead,action.noTarget,(action.effectIds||[]).slice().sort()]);
          const old=dedup.get(key);
          if(old){old.actorIds=[...new Set([...old.actorIds,...action.actorIds])];old.roleIds=[...new Set([...(old.roleIds||[]),role.roleId])];}
          else dedup.set(key,{...action,roleIds:[String(role.roleId||"")]});
        }
        for(const owner of Array.isArray(role.artifacts)?role.artifacts:[])
          if(!alreadyUsed(owner))art.push(...build(owner,true));
      }
      return [...dedup.values(),...art];
    }
    if(turn.kind==="early-artifact"||turn.kind==="artifact-main")
      return alreadyUsed(turn)?[]:build(turn,true);
    return [];
  }
  function targetAllowed(action,member,effect,rows=[],night=0){
    if(!action||!member?.loginId||action.noTarget)return false;
    if(action.noSelf&&action.actorIds.includes(loginOf(member.loginId)))return false;
    if(action.type==="revive")return effect==="dead";
    // A night victim is announced at dawn; the Seer may still scan them tonight.
    // Historical deaths remain ineligible on subsequent nights.
    const nightVictim=action.actionId==="action_seer"&&effect==="dead"&&
      (Array.isArray(rows)?rows:[]).some(x=>
        loginOf(x?.loginId)===loginOf(member.loginId)&&x?.type==="dead"&&
        x?.effectActive!==false&&Number(x?.night)===Number(night)&&night>0);
    return nightVictim||action.allowDead||effect!=="dead"&&effect!=="expelled";
  }
  const api=Object.freeze({currentTurn,timeline,displayLabel,artifactUsed,remainingSeconds,formatTime,resolvedType,actionsForTurn,targetAllowed});
  root.GMWW_BATTLE_CONTROLS=api;
})(globalThis);
