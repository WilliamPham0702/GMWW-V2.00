// GD46 - the ONLY Player 3D module that talks to the framed Player Web sheet.
// player.mjs stays a public, render-only projection (no postMessage, no private data).
// This layer relays "pick my action" / "target this character" intents into the EXISTING
// Player Web flow; Core validates every action. State received here is this player's own menu,
// kept in memory only: never stored, never put in diagnostics or the public scene.
import {sanitizeBridgeState,bridgeEventAccepted,usableActions,targetFromTap,pickHint,outboundCommand,
  BRIDGE_STATE,BRIDGE_TOAST,BRIDGE_PICK,BRIDGE_TARGET,BRIDGE_CANCEL,BRIDGE_REQUEST} from './stage46-direct-actions.mjs';
export function installDirectActions({THREE,canvas,camera,field,frameEl,cardEl,dockEl,hintEl,listEl,cancelEl,
  isRenderPaused=()=>false,notice=()=>{}}){
  let state=null;
  const frameWindow=()=>frameEl.contentWindow;
  const send=(kind,payload)=>{
    const cmd=outboundCommand(kind,payload),w=frameWindow();
    if(cmd&&w)w.postMessage(cmd,location.origin);
  };
  function render(){
    const covered=cardEl.classList.contains('open');
    const usable=usableActions(state);
    dockEl.hidden=covered||(!usable.length&&!state?.picking);
    if(dockEl.hidden)return;
    hintEl.textContent=pickHint(state);
    cancelEl.hidden=!state?.picking;
    listEl.replaceChildren();
    if(state?.picking)return;
    for(const action of usable){
      const b=document.createElement('button');
      b.type='button';b.textContent=action.name;
      b.setAttribute('aria-label','Dùng hành động '+action.name);
      b.onclick=()=>send(BRIDGE_PICK,{key:action.key});
      listEl.appendChild(b);
    }
  }
  function handleTap(event){
    if(!state?.picking||state.busy||isRenderPaused())return;
    const box=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((event.clientX-box.left)/box.width*2-1,
      -(event.clientY-box.top)/box.height*2+1),camera);
    const id=targetFromTap(field.pick(ray),state);
    if(id)send(BRIDGE_TARGET,{id});
  }
  window.addEventListener('message',event=>{
    if(!bridgeEventAccepted(event,{origin:location.origin,frameWindow:frameWindow()}))return;
    const data=event.data;
    if(data?.type===BRIDGE_STATE){state=sanitizeBridgeState(data);render()}
    else if(data?.type===BRIDGE_TOAST&&typeof data.text==='string'&&state)notice(data.text.slice(0,160));
  });
  cancelEl.onclick=()=>send(BRIDGE_CANCEL);
  frameEl.addEventListener('load',()=>send(BRIDGE_REQUEST));
  new MutationObserver(render).observe(cardEl,{attributes:true,attributeFilter:['class']});
  return Object.freeze({handleTap,render});
}
