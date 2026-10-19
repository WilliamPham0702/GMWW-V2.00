// The same accepted motion controller is bundled for GM Runtime and Player Web.
const roots=new Set(),images=new Map();let raf=0,last=0;
// Conserve CPU/GPU power on iPhones: most Atlas poses change far less often
// than the display's 60 Hz refresh rate. Keep motion time-based, not frame-based.
const paintInterval=()=>roots.size>=16?1000/24:1000/30;
function visualId(id){return id==='character-41'?'character-39':id==='character-42'?'character-40':id;}
function supports(id){return !!CATALOG[visualId(id)];}
function imageFor(url){if(!images.has(url)){const im=new Image();im.decoding='async';im.src=url;images.set(url,im);}return images.get(url);}
function actionFor(command){return command.state==='dead'?'idle':command.motion==='turn'?'turn':command.state==='running'?'run':command.state==='walking'?'walk':'idle';}
function apply(root,command={}){
 const id=command.characterId||root.dataset.characterId,c=CATALOG[visualId(id)];if(!c)return false;
 const changed=root.dataset.characterId!==id;
 if(changed){root.dataset.characterId=id;root._gmwwMotion=createMotion(c);root._gmwwCharacter=c;root._gmwwWantedFacing=undefined;root._gmwwPending=null;root._gmwwFrameScale=0;}
 const s=root._gmwwMotion,action=actionFor(command),facing=command.facing==='left'?'left':'right';
 if(s.action==='turn'&&root._gmwwPending){root._gmwwPending={action:action==='turn'?'idle':action,facing};}
 else if((root._gmwwWantedFacing!==undefined&&s.facing!==facing)||action==='turn'){root._gmwwPending={action:action==='turn'?'idle':action,facing:action==='turn'&&s.facing===facing?(facing==='left'?'right':'left'):facing};setAction(s,'turn');}
 else {if(s.action!==action)setAction(s,action);s.facing=facing;}
 root._gmwwWantedFacing=facing;
 root._gmwwPaused=command.paused===true||command.state==='dead';root.dataset.state=action==='walk'?'walking':action==='run'?'running':'idle';root.dataset.motion=action;root.dataset.facing=facing;return true;
}
function paint(root,dt){
 const canvas=root.firstElementChild,c=root._gmwwCharacter,s=root._gmwwMotion;
 const frozen=root._gmwwPaused||root.closest?.('.frozen,.is-frozen,[data-frozen="true"]');
 if(!frozen){const turning=s.action==='turn';advance(s,dt);if(turning&&s.action!=='turn'&&root._gmwwPending){const pending=root._gmwwPending;root._gmwwPending=null;s.facing=pending.facing;setAction(s,pending.action);}}
 const index=sampleFrame(s),im=imageFor(root._gmwwAssetBase+'/characters/gmww40/'+c.atlas);
 if(!im.complete||!im.naturalWidth)return; // Retry when the atlas has decoded.
 const drawKey=c.atlas+':'+index;
 if(root._gmwwDrawKey===drawKey)return; // No pixels changed: never repaint an idle frame.
 const ctx=root._gmwwContext||(root._gmwwContext=canvas.getContext('2d'));
 if(!ctx)return;
 const [x,y,w,h]=c.frames[index];
 const scale=root._gmwwFrameScale||(root._gmwwFrameScale=Math.min(250/Math.max(...c.frames.map(f=>f[2])),310/Math.max(...c.frames.map(f=>f[3]))));
 ctx.clearRect(0,0,256,320);
 ctx.drawImage(im,x,y,w,h,(256-w*scale)/2,320-h*scale,w*scale,h*scale);
 root._gmwwDrawKey=drawKey;
 root.dataset.loaded='true';root.dataset.frame=String(index);root.dataset.action=s.action;
}
function loop(now){
 raf=0;
 if(document.hidden){last=0;return;} // visibilitychange resumes the loop.
 if(last&&now-last<paintInterval()-1){if(roots.size)raf=requestAnimationFrame(loop);return;}
 const dt=Math.min(80,Math.max(0,now-(last||now)));last=now;
 for(const root of roots){if(!root.isConnected){roots.delete(root);continue;}paint(root,dt);}
 if(roots.size)raf=requestAnimationFrame(loop);else last=0;
}
// Pausing matters more than FPS throttling when Safari is backgrounded.
if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{
 if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;last=0;}
 else if(roots.size&&!raf){last=0;raf=requestAnimationFrame(loop);}
});
function mount(host,{characterId='character-01',command={},assetBase=''}={}){
 const c=CATALOG[visualId(characterId)];if(!host||!c)return null;
 host.replaceChildren();const root=document.createElement('span');root.dataset.characterRenderer='gmww40-atlas';root.dataset.motionVersion='c40-1';root.dataset.characterId=characterId;
 root.className='gmww40-character';root.style.cssText='display:block;width:100%;height:100%;position:relative;transform:none;animation:none';
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=320;canvas.setAttribute('aria-label',characterId);canvas.style.cssText='display:block;width:100%;height:100%;object-fit:contain;transform:scale(var(--gmww-character-scale,1));transform-origin:50% 100%;animation:none';root.append(canvas);
 root._gmwwMotion=createMotion(c);root._gmwwCharacter=c;root._gmwwAssetBase=String(assetBase).replace(/\/$/,'');host.append(root);apply(root,{...command,characterId});roots.add(root);paint(root,0);if(!raf)raf=requestAnimationFrame(loop);return root;
}
function update(host,command){const root=host?.querySelector?.('[data-character-renderer="gmww40-atlas"]');return root?apply(root,command):false;}
g.GMWW_SHARED_MOTION=Object.freeze({version:'c40-1',supports,visualId,mount,update,actions:ACTIONS,source:SOURCE15});
