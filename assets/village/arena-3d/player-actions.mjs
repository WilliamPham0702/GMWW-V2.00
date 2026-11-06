// Arena 3D Player actions — direct 3D UI over the SAME private Server API as Player Web 2D.
// Private data (role, offered actions) comes only from the authenticated /me response;
// the Server still validates every action (match/cycle, turn, targets, effects).
const DIRECTION_ACTIONS=new Set(['action_transfer_bite','action-fire-wolf-bite']);
const ASSASSIN_ACTION='action_assassin_mark';
const loginOf=id=>String(id||'').replace(/^member:/,'');

export function actionNeedsDirection(a){return DIRECTION_ACTIONS.has(a?.actionId)&&!a?.artifactId}
export function actionNeedsChoice(a){return a?.actionId===ASSASSIN_ACTION}
export function targetsRequired(a){return a?.noTarget||actionNeedsDirection(a)&&a.actionId==='action_transfer_bite'?0:Math.max(0,Number(a?.targetCount)||0)}

export function buildActionBody({me,action,targets,direction,choice,clientEventId}){
  if(!me?.room?.matchId||!me?.room?.cycleKey)throw Error('Chưa vào ván');
  const need=targetsRequired(action);
  if(targets.length!==need)throw Error('Cần chọn đúng '+need+' mục tiêu');
  const body={matchId:me.room.matchId,cycleKey:me.room.cycleKey,actionKey:action.key,
    targetIds:targets.map(loginOf),clientEventId};
  if(actionNeedsDirection(action)){
    if(!['left','right','none'].includes(direction))throw Error('Chọn hướng');
    body.direction=direction;
  }
  if(actionNeedsChoice(action)){
    if(!['👍','👎'].includes(choice))throw Error('Chọn 👍 hoặc 👎');
    body.assassinChoice=choice;
  }
  return body;
}

// Same member session token the Player Web 2D page already keeps; never a GM token.
const memberToken=()=>{try{return globalThis.localStorage?.getItem('gmww_token')||''}catch{return''}};

export function createPlayerActionHud({container,roomCode,getToken=memberToken,fetchImpl=globalThis.fetch,notice=()=>{}}){
  const state={me:null,actions:[],role:null,action:null,targets:[],direction:'',choice:'',busy:false,timer:0};
  container.hidden=false;
  const h=(tag,props={},...kids)=>{const el=document.createElement(tag);Object.assign(el,props);el.append(...kids);return el};
  function authHeaders(){const t=getToken();return t?{Authorization:'Bearer '+t}:{}}
  async function call(path,opts={}){
    const res=await fetchImpl('/api/rooms/'+encodeURIComponent(roomCode)+path,{cache:'no-store',...opts,
      headers:{accept:'application/json','content-type':'application/json',...authHeaders()}});
    let data;try{data=await res.json()}catch{throw Error('HTTP '+res.status)}
    if(!res.ok||data.ok===false)throw Error(data.message||data.error||'HTTP '+res.status);
    return data;
  }
  function reset(){state.action=null;state.targets=[];state.direction='';state.choice=''}
  function render(){
    container.replaceChildren();
    if(!getToken()){container.append(h('div',{className:'pa-note',textContent:'Đăng nhập Player Web để nhận vai và thao tác trong 3D.'}));return}
    const role=state.role;
    container.append(h('div',{className:'pa-role',textContent:role?('Vai: '+(role.roleName||role.roleId)):'Chưa có vai'}));
    if(!state.actions.length){container.append(h('div',{className:'pa-note',textContent:'Chưa đến lượt bạn.'}));return}
    const row=h('div',{className:'pa-actions'});
    for(const a of state.actions){
      const b=h('button',{type:'button',textContent:a.name,disabled:!!a.blocked||state.busy,title:a.blockedReason||''});
      if(state.action?.key===a.key)b.classList.add('active');
      b.onclick=()=>{state.action=a;state.targets=[];state.direction='';state.choice='';render()};
      row.append(b);
    }
    container.append(row);
    const a=state.action;if(!a)return;
    const need=targetsRequired(a);
    if(need>0)container.append(h('div',{className:'pa-note',
      textContent:'Chạm nhân vật trong 3D để chọn mục tiêu ('+state.targets.length+'/'+need+')'}));
    if(actionNeedsDirection(a)){
      const d=h('div',{className:'pa-actions'});
      for(const [v,t] of [['left','⬅ Trái'],['right','Phải ➡'],...(a.actionId==='action_transfer_bite'?[['none','Không']]:[])]){
        const b=h('button',{type:'button',textContent:t});if(state.direction===v)b.classList.add('active');
        b.onclick=()=>{state.direction=v;render()};d.append(b);
      }
      container.append(d);
    }
    if(actionNeedsChoice(a)){
      const d=h('div',{className:'pa-actions'});
      for(const v of ['👍','👎']){
        const b=h('button',{type:'button',textContent:v});if(state.choice===v)b.classList.add('active');
        b.onclick=()=>{state.choice=v;render()};d.append(b);
      }
      container.append(d);
    }
    container.append(h('div',{className:'pa-actions'},
      h('button',{type:'button',className:'pa-ok',textContent:'OK',disabled:state.busy,onclick:submit}),
      h('button',{type:'button',textContent:'Hủy',onclick:()=>{reset();render()}})));
  }
  async function submit(){
    try{
      const body=buildActionBody({me:state.me,action:state.action,targets:state.targets,
        direction:state.direction,choice:state.choice,clientEventId:'arena3d-'+crypto.randomUUID()});
      state.busy=true;render();
      await call('/action',{method:'POST',body:JSON.stringify(body)});
      notice('Đã gửi hành động '+state.action.name+'.');reset();
    }catch(error){notice(String(error.message||error))}
    finally{state.busy=false;await refresh();}
  }
  async function refresh(){
    if(!getToken()){render();return}
    try{
      const data=await call('/me');
      state.me={room:data.room||null};
      state.role=data.role||(Array.isArray(data.roles)?data.roles[0]:null)||null;
      state.actions=Array.isArray(data.onlineActions)?data.onlineActions:[];
      if(state.action&&!state.actions.some(a=>a.key===state.action.key))reset();
    }catch(error){state.actions=[];notice(String(error.message||error))}
    render();
  }
  // Debounced: driven by the existing room WebSocket frames, no extra polling timer.
  function scheduleRefresh(){clearTimeout(state.timer);state.timer=setTimeout(refresh,350)}
  // Returns true when the tap was consumed as a target pick.
  function handlePick(id){
    const a=state.action;if(!a||state.busy)return false;
    const need=targetsRequired(a);if(need<=0)return false;
    if(!String(id).startsWith('member:'))return false;
    if(a.noSelf&&loginOf(id)===loginOf(state.me?.self))return false;
    const at=state.targets.indexOf(id);
    if(at>=0)state.targets.splice(at,1);
    else if(state.targets.length<need)state.targets.push(id);
    else{state.targets.shift();state.targets.push(id)}
    render();return true;
  }
  render();
  return {refresh,scheduleRefresh,handlePick,get selectedTargets(){return[...state.targets]}};
}
