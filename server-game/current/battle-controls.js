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
    const rows=queue.map((row,i)=>({id:String(row?.id||i),kind:String(row?.kind||"role"),label:row?.kind==="village-wakeup"?"Làng ơi dậy đi":displayLabel(row,"Lượt "+(i+1)),displayNumber:i+1,status:artifactUsed(used,row)?"used":row?.status==="skipped"?"skipped":i<cursor?"completed":i===cursor&&!runtime?.completed?"active":"pending",active:i===cursor&&!runtime?.completed}));
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
    if(turn.kind==="wolf-pack-bite")
      return [{id:"wolf-pack:action_wolf_bite",roleId:"wolf-pack",actionId:"action_wolf_bite",name:"Sói Cắn",type:"effect_notice",
        actorIds:[...(turn.biteActorIds||turn.loginIds||[])],targetCount:1,noSelf:false,allowDead:false,noTarget:false,effectIds:["effect_wolf_bite"]}];
    const roles=Array.isArray(catalog?.cards)?catalog.cards:[],
      artifacts=Array.isArray(catalog?.artifacts)?catalog.artifacts:[],
      definitions=catalog?.actions||[];
    const alreadyUsed=owned=>artifactUsed(used,{kind:"artifact-main",artifactId:owned.artifactId,playerId:owned.playerId||"member:"+loginOf(owned.loginId)});
    const build=(owner,isArt)=>{
      const pool=isArt?artifacts:roles;
      const id=isArt?owner.artifactId:owner.roleId;
      const chosen=pool.find(row=>String(row?.id||row?.artifactId||"")===String(id))
        ||pool.find(row=>folded(row?.name||row?.artifactName)===folded(isArt?owner.artifactName:owner.label));
      const fns=Array.isArray(chosen?.functions)&&chosen.functions.length?chosen.functions:
        Array.isArray(chosen?.actions)&&chosen.actions.length?chosen.actions:
        Array.isArray(chosen?.artifact?.functions)&&chosen.artifact.functions.length?chosen.artifact.functions:
        Array.isArray(chosen?.artifact?.actions)?chosen.artifact.actions:[];
      const actorIds=isArt?[loginOf(owner.loginId)]:(owner.loginIds||[owner.loginId]).filter(Boolean).map(loginOf);
      const eligible=fns.filter(fn=>fn&&!fn.passive&&(fn.phase==="night"||!fn.phase||fn.phase==="any"||fn.phase==="both")&&
        (!fn.fromNight||Number(fn.fromNight)<=Number(night))&&(!fn.toNight||Number(fn.toNight)>=Number(night))&&
        (isArt||String(fn.actionId||fn.id||"")!=="action_wolf_bite"));
      // Never silently hide an assigned Artifact. Non-night/passive cards
      // are informational and MUST remain disabled to protect server rules.
      if(isArt&&!eligible.length){
        const dayOnly=fns.some(fn=>fn?.phase==="day"),
          reason=!chosen?"Chưa đồng bộ lá Artifact.":dayOnly?"Chức năng Artifact chỉ dùng vào ban ngày.":
            fns.length?"Artifact không có chức năng sử dụng trong đêm này.":"Artifact chưa được thiết lập chức năng.";
        const storedAction=Array.isArray(chosen?.actions)?chosen.actions:[],
          actionCatalog=Array.isArray(definitions)?definitions:(definitions?.artifacts||[]),
          configured=fns[0],actionId=String(configured?.actionId||configured?.id||""),
          ownedAction=storedAction.find(a=>String(a?.id||a?.actionId||"")===actionId),
          catalogAction=actionCatalog.find(a=>String(a?.id||"")===actionId),
          validName=value=>{const name=String(value||"").trim();return name&&!/^(?:artifact\s*)?(?:nội tại|dùng ban ngày|chưa có chức năng)$/i.test(name)&&!/^action[-_][a-z0-9_-]+$/i.test(name)&&!/^hành động(?:\s*\d+)?$/i.test(name)},
          actionName=[ownedAction?.name,catalogAction?.name,configured?.name,storedAction[0]?.name].map(value=>String(value||"").trim()).find(validName)||"Chưa cấu hình tên hành động";
        return [{id:"artifact:"+id+":"+loginOf(owner.loginId)+":info",
          actionId:"",name:actionName,
          actorIds,noTarget:true,targetCount:0,artifactId:String(id),artifactName:String(owner.artifactName||chosen?.name||"Artifact"),
          unavailable:true,unavailableReason:reason}];
      }
      return (isArt?eligible.slice(0,1):eligible).map((fn,i)=>{
        const actionCatalog=Array.isArray(definitions)?definitions:(isArt?definitions.artifacts:definitions.role)||[];
        const actionId=String(fn?.actionId||fn?.id||""),
          definition=actionCatalog.find(a=>String(a?.id||"")===actionId),
          ownedAction=(Array.isArray(chosen?.actions)?chosen.actions:[]).find(a=>String(a?.id||a?.actionId||"")===actionId),
          isPlaceholder=value=>!value||/^action[-_][a-z0-9_-]+$/i.test(value)||/^hành động(?:\s*\d+)?$/i.test(value),
          candidates=[ownedAction?.name,definition?.name,fn?.name].map(x=>String(x||"").trim()),
          exactName=candidates.find(x=>!isPlaceholder(x)),
          description=String(ownedAction?.description||fn?.description||definition?.description||"").trim(),
          knownName={"action-lone-wolf-join":"Gia nhập Bầy Sói"}[actionId],
          descName=description.replace(/[.。;:].*$/s,"").trim().slice(0,70),
          name=exactName||knownName||(descName.length>=3&&!isPlaceholder(descName)?descName:"Chưa đặt tên hành động");
        return {id:(isArt?"artifact:"+id+":"+loginOf(owner.loginId)+":":"role:"+id+":")+String(fn.id||fn.actionId||i),
          actionId:String(fn.actionId||fn.id||""),roleId:isArt?"":String(id),name,type:resolvedType({...fn,name}),noSelf:fn.noSelf!==false,
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
  function oldWitchReviveEligible(action,member,rows=[],night=0){
    if(action?.roleId!=="role_old_witch"||action?.actionId!=="action_revive")return true;
    const previous=Math.max(0,Number(night)||0)-1,target=loginOf(member?.loginId);
    if(previous<1||!target)return false;
    return (Array.isArray(rows)?rows:[]).some(x=>
      loginOf(x?.loginId)===target&&x?.type==="dead"&&x?.effectActive!==false&&
      Number(x?.night)===previous&&
      (!x?.cycleKey||["night-"+previous,"morning-"+previous,"day-"+previous].includes(String(x.cycleKey))));
  }
  function targetAllowed(action,member,effect,rows=[],night=0){
    if(!action||!member?.loginId||action.noTarget)return false;
    if(action.noSelf&&action.actorIds.includes(loginOf(member.loginId)))return false;
    if((action.forbiddenTargets||[]).includes(loginOf(member.loginId)))return false;
    if(action.roleId==="role_old_witch"&&action.actionId==="action_revive")
      return effect==="dead"&&oldWitchReviveEligible(action,member,rows,night);
    if(action.type==="revive")return effect==="dead"||effect==="expelled";
    // A night victim is announced at dawn; the Seer may still scan them tonight.
    // Historical deaths remain ineligible on subsequent nights.
    const nightVictim=action.actionId==="action_seer"&&effect==="dead"&&
      (Array.isArray(rows)?rows:[]).some(x=>
        loginOf(x?.loginId)===loginOf(member.loginId)&&x?.type==="dead"&&
        x?.effectActive!==false&&Number(x?.night)===Number(night)&&night>0);
    return nightVictim||action.allowDead||effect!=="dead";
  }
  const api=Object.freeze({currentTurn,timeline,displayLabel,artifactUsed,remainingSeconds,formatTime,resolvedType,actionsForTurn,targetAllowed,oldWitchReviveEligible});
  root.GMWW_BATTLE_CONTROLS=api;
})(globalThis);
