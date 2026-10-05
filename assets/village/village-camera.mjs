// Scene-only pointer camera. Buttons, forms and UI controls retain native touch behavior.
export function installVillageCamera(stage,scene,zoomInput){
  if(!stage||!scene)return()=>{};
  let zoom=1,panX=0,panY=0,active=null,originX=0,originY=0,initialX=0,initialY=0;
  const apply=()=>{
    panX=Math.max(-160,Math.min(160,panX));panY=Math.max(-120,Math.min(120,panY));
    stage.style.setProperty("--zoom",String(zoom));
    stage.style.setProperty("--pan-x",panX+"px");
    stage.style.setProperty("--pan-y",panY+"px");
  };
  const onZoom=()=>{zoom=Math.max(.7,Math.min(1.55,Number(zoomInput.value)/100));apply()};
  const down=e=>{
    if(e.target.closest("button,input,select,label,form,.hud,.scene-controls,.player"))return;
    if(active!==null)return;active=e.pointerId;originX=e.clientX;originY=e.clientY;initialX=panX;initialY=panY;
    stage.setPointerCapture?.(e.pointerId);
  };
  const move=e=>{
    if(active!==e.pointerId)return;
    panX=initialX+e.clientX-originX;panY=initialY+e.clientY-originY;apply();
  };
  const up=e=>{if(active===e.pointerId)active=null};
  const reset=()=>{panX=panY=0;zoom=1;if(zoomInput)zoomInput.value="100";apply()};
  zoomInput?.addEventListener("input",onZoom);
  stage.addEventListener("pointerdown",down);stage.addEventListener("pointermove",move);
  stage.addEventListener("pointerup",up);stage.addEventListener("pointercancel",up);
  stage.addEventListener("dblclick",reset);
  apply();
  return()=>{zoomInput?.removeEventListener("input",onZoom);stage.removeEventListener("pointerdown",down);stage.removeEventListener("pointermove",move);stage.removeEventListener("pointerup",up);stage.removeEventListener("pointercancel",up);stage.removeEventListener("dblclick",reset)};
}
