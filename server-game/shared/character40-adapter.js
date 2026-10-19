// The same accepted motion controller is bundled for GM Runtime and Player Web.
const roots=new Set(),images=new Map();let raf=0,last=0;
function visualId(id){return id==='character-41'?'character-39':id==='character-42'?'character-40':id;}
function supports(id){return !!CATALOG[visualId(id)];}
function imageFor(url){if(!images.has(url)){const im=new Image();im.decoding='async';im.src=url;images.set(url,im);}return images.get(url);}
function actionFor(command){return command.state==='dead'?'idle':command.motion==='turn'?'turn':command.state==='running'?'run':command.state==='walking'?'walk':'idle';}
function apply(root,command={}){
 const id=command.characterId||root.dataset.characterId,c=CATALOG[visualId(id)];if(!c)return false;
 const changed=root.dataset.characterId!==id;
 if(changed){root.dataset.characterId=id;root._gmwwMotion=createMotion(c);root._gmwwCharacter=c;}
 const s=root._gmwwMotion,action=actionFor(command),facing=command.facing==='left'?'left':'right';
 if(s.action!==action)setAction(s,action);s.facing=facing;
 root.dataset.state=command.state||'idle';root.dataset.motion=action;root.dataset.facing=facing;return true;
}
function paint(root,dt){
 const canvas=root.firstElementChild,ctx=canvas.getContext('2d'),c=root._gmwwCharacter,s=root._gmwwMotion;
 if(!ctx)return;
 const frozen=root.dataset.state==='dead'||root.closest?.('.frozen,.is-frozen,[data-frozen="true"]');
 if(!frozen)advance(s,dt);
 const index=sampleFrame(s),[x,y,w,h]=c.frames[index],im=imageFor(root._gmwwAssetBase+'/characters/gmww40/'+c.atlas);
 ctx.clearRect(0,0,256,320);
 if(im.complete&&im.naturalWidth){const scale=Math.min(250/w,310/h);ctx.drawImage(im,x,y,w,h,(256-w*scale)/2,320-h*scale,w*scale,h*scale);root.dataset.loaded='true';}
 root.dataset.frame=String(index);root.dataset.action=s.action;
}
function loop(now){raf=0;const dt=Math.min(80,Math.max(0,now-(last||now)));last=now;
 for(const root of roots){if(!root.isConnected){if(root._gmwwConnected)roots.delete(root);continue;}root._gmwwConnected=true;if(!document.hidden)paint(root,dt);}
 if(roots.size)raf=requestAnimationFrame(loop);else last=0;
}
function mount(host,{characterId='character-01',command={},assetBase=''}={}){
 const c=CATALOG[visualId(characterId)];if(!host||!c)return null;
 host.replaceChildren();const root=document.createElement('span');root.dataset.characterRenderer='gmww40-atlas';root.dataset.motionVersion='c40-1';root.dataset.characterId=characterId;
 root.className='gmww40-character';root.style.cssText='display:block;width:100%;height:100%;position:relative;transform:none;animation:none';
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=320;canvas.setAttribute('aria-label',characterId);canvas.style.cssText='display:block;width:100%;height:100%;object-fit:contain;transform:none;animation:none';root.append(canvas);
 root._gmwwMotion=createMotion(c);root._gmwwCharacter=c;root._gmwwAssetBase=String(assetBase).replace(/\/$/,'');host.append(root);apply(root,{...command,characterId});roots.add(root);paint(root,0);if(!raf)raf=requestAnimationFrame(loop);return root;
}
function update(host,command){const root=host?.querySelector?.('[data-character-renderer="gmww40-atlas"]');return root?apply(root,command):false;}
g.GMWW_SHARED_MOTION=Object.freeze({version:'c40-1',supports,visualId,mount,update,actions:ACTIONS,source:SOURCE15});
