/**
 * GP2 optical world/camera math only. NOT connected to runtime while art is unapproved.
 * World pixels are CSS pixels: 864x1536, so a 56x74px Character is NEVER
 * secretly scaled down to squeeze 30 actors into an iPhone viewport.
 * The scenery, hit points and character anchors must share this projection.
 */
export const GP2_WORLD_FRAME=Object.freeze({width:864,height:1536});
const finite=(n,fallback)=>Number.isFinite(Number(n))?Number(n):fallback;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

export function gp2Camera({viewportWidth,viewportHeight,world=GP2_WORLD_FRAME,
  focus={x:50,y:64},pan={x:0,y:0}}={}){
  const width=Math.max(1,finite(viewportWidth,390)),height=Math.max(1,finite(viewportHeight,844));
  const worldWidth=Math.max(1,finite(world?.width,864)),worldHeight=Math.max(1,finite(world?.height,1536));
  // Background/layer size = world size; camera is an offset and never a scale.
  const offset=(viewSize,worldSize,focused,delta)=>{
    if(worldSize<=viewSize)return (viewSize-worldSize)/2;
    return clamp(viewSize/2-worldSize*clamp(finite(focused,50),0,100)/100+finite(delta,0),
      viewSize-worldSize,0);
  };
  const left=offset(width,worldWidth,focus?.x,pan?.x);
  const top=offset(height,worldHeight,focus?.y,pan?.y);
  const toViewport=point=>({x:left+finite(point?.x,50)*worldWidth/100,
    y:top+finite(point?.y,50)*worldHeight/100});
  const fromViewport=point=>({x:(finite(point?.x,0)-left)*100/worldWidth,
    y:(finite(point?.y,0)-top)*100/worldHeight});
  return Object.freeze({
    viewportWidth:width,viewportHeight:height,
    worldWidth,worldHeight,left,top,scale:1,
    toViewport,fromViewport,
    visibleWorldBounds:Object.freeze({
      left:clamp(-left/worldWidth*100,0,100),
      right:clamp((width-left)/worldWidth*100,0,100),
      top:clamp(-top/worldHeight*100,0,100),
      bottom:clamp((height-top)/worldHeight*100,0,100),
    }),
  });
}

// Spacing in actual CSS pixels. Do not use toScreen() on a compressed 390px
// bitmap as a substitute: this is a different (virtual-world) camera.
export function gp2ActorCollisionPairs(seats,{world=GP2_WORLD_FRAME,
  actorWidth=56,actorHeight=74}={}){
  const points=(Array.isArray(seats)?seats:[]).map(row=>({
    seatId:row.seatId,
    x:finite(row.x,0)*world.width/100,
    y:finite(row.y,0)*world.height/100
  }));
  const collisions=[];
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
    const a=points[i],b=points[j];
    if(Math.abs(a.x-b.x)<actorWidth&&Math.abs(a.y-b.y)<actorHeight)
      collisions.push([a.seatId,b.seatId]);
  }
  return collisions;
}
