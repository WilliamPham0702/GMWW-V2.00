/* One coordinate contract for Worker, Player Web and the packaged GM app. */
(function(root){
  /* V3.128 — ONLY the paving of Asahi Village is walkable.
     A deliberately conservative courtyard + central bridge corridor.
     The sea, roofs, landscaped terraces and lawns remain beyond this boundary.
     This shared object is loaded unchanged in Worker, GM IPA and Player Web. */
  const fire={x:50,y:49.7};
  const polygon=[[30,36],[70,36],[78,41],[82,52],[80,60],[75,71],
    [64,84],[60,89],[60,94],[40,94],[40,89],[36,84],
    [25,71],[20,60],[18,52],[22,41]];
  const fireRadius={x:7,y:4.2};
  function polygonInside(x,y){
    let hit=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
      const a=polygon[i],b=polygon[j];
      if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;
    }
    return hit;
  }
  function fireClear(x,y){return Math.hypot((x-fire.x)/fireRadius.x,(y-fire.y)/fireRadius.y)>=1;}
  function inside(x,y){x=Number(x);y=Number(y);return Number.isFinite(x)&&Number.isFinite(y)&&polygonInside(x,y)&&fireClear(x,y)}
  function clampPoint(x,y){
    x=Number(x);y=Number(y);
    if(!Number.isFinite(x)||!Number.isFinite(y))return{x:50,y:75};
    y=Math.max(37,Math.min(93,y));
    // Never clamp just the Y coordinate then leave X in a roof or water area.
    // Find the actual left/right courtyard intersections at this latitude.
    const xs=[];
    for(let i=0;i<polygon.length;i++){
      const a=polygon[i],b=polygon[(i+1)%polygon.length];
      if((a[1]<=y&&b[1]>=y)||(b[1]<=y&&a[1]>=y)){
        if(a[1]!==b[1])xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));
      }
    }
    if(xs.length>=2)x=Math.max(Math.min(...xs)+1.4,Math.min(Math.max(...xs)-1.4,x));
    if(!fireClear(x,y)){
      // Push away from the fire along the least-disruptive axis, never inside it.
      const dx=x-fire.x,dy=y-fire.y;
      if(Math.abs(dx/fireRadius.x)>Math.abs(dy/fireRadius.y))
        x=fire.x+(dx>=0?1:-1)*(fireRadius.x+0.7);
      else y=fire.y+(dy>=0?1:-1)*(fireRadius.y+0.7);
    }
    return{x,y};
  }
  /* Single perimeter, like a real Werewolf circle of people seated around the fire.
     Coordinates shared by GM IPA, Cloudflare Worker, and Player Web. */
  const seatTemplateCounts=Object.freeze([8,10,12,14,16,18,20,22,24,25,26,27,28,29,30]);
  const seatTemplateShapes=Object.freeze(['circle','ellipse','rectangle']);
  function normalizeSeatLayout(shape){
    const value=String(shape||'');
    // Existing V3.100 rooms may carry 'diamond'; interpret them safely
    // without losing seat IDs or breaking ongoing room metadata.
    return value==='diamond'?'ellipse':seatTemplateShapes.includes(value)?value:'';
  }
  function recommendedSeatShape(count){
    const n=Math.max(1,Math.min(30,Math.trunc(Number(count)||12)));
    return n<=12?'circle':n<=20?'ellipse':'rectangle';
  }
  const SCREEN_Y_SCALE=1.78;
  function circleContour(t,rx,ry){
    const a=-Math.PI/2+2*Math.PI*t;
    return{x:rx*Math.cos(a),y:ry*Math.sin(a)};
  }
  // Even distribution by on-screen distance, not by angle: no clusters
  // at the narrow ends of the ellipse.
  function ovalContour(t,rx,ry){
    const steps=360,dist=[0],points=[circleContour(0,rx,ry)];
    for(let i=1;i<=steps;i++){
      const next=circleContour(i/steps,rx,ry),old=points[i-1];
      dist.push(dist[i-1]+Math.hypot(next.x-old.x,SCREEN_Y_SCALE*(next.y-old.y)));
      points.push(next);
    }
    const target=((t%1)+1)%1*dist[steps];
    let lo=0,hi=steps;
    while(hi-lo>1){const mid=(lo+hi)>>1;if(dist[mid]<target)lo=mid;else hi=mid}
    const portion=(target-dist[lo])/Math.max(1e-9,dist[hi]-dist[lo]);
    return{x:points[lo].x+(points[hi].x-points[lo].x)*portion,
      y:points[lo].y+(points[hi].y-points[lo].y)*portion};
  }
  function rectangleContour(t,rx,ry){
    // Follow exactly ONE closed perimeter, starting at the top midpoint.
    const corners=[[0,-ry],[rx,-ry],[rx,ry],[-rx,ry],[-rx,-ry],[0,-ry]];
    const lengths=corners.slice(1).map((p,i)=>
      Math.hypot(p[0]-corners[i][0],SCREEN_Y_SCALE*(p[1]-corners[i][1])));
    const length=lengths.reduce((a,b)=>a+b,0);
    let distance=((t%1)+1)%1*length;
    for(let i=0;i<lengths.length;i++){
      if(distance<=lengths[i]||i===lengths.length-1){
        const f=Math.min(1,distance/Math.max(1e-9,lengths[i]));
        return{x:corners[i][0]+(corners[i+1][0]-corners[i][0])*f,
          y:corners[i][1]+(corners[i+1][1]-corners[i][1])*f};
      }
      distance-=lengths[i];
    }
    return{x:0,y:-ry};
  }
  function seatTemplatePositions(count,shape){
    const n=Math.max(1,Math.min(30,Math.trunc(Number(count)||12))),
      kind=normalizeSeatLayout(shape)||recommendedSeatShape(n);
    // There is exactly one seat ring; never reuse old positionX/Y
    // or account-hash spawn for a seated/provisionally seated player.
    const rx=kind==='circle'?22.2:kind==='ellipse'?26.0:26.3;
    const ry=kind==='circle'?12.0:kind==='ellipse'?12.4:12.6;
    const sample=kind==='rectangle'?rectangleContour:ovalContour;
    // The rectangle is distributed by equal SCREEN perimeter distance,
    // including its two long sides, rather than by raw vertex index.
    const points=Array.from({length:n},(_,i)=>{
      const p=sample(i/n,rx,ry),q=clampPoint(fire.x+p.x,fire.y+p.y);
      return{x:q.x,y:q.y,ring:0};
    });
    return points;
  }
  function normalizeSeatSpacing(value){const n=Number(value);return Number.isFinite(n)?Math.max(70,Math.min(135,Math.round(n/5)*5)):100}
  function normalizeSeatOffset(value){
    const safe=n=>Number.isFinite(Number(n))?Math.max(-10,Math.min(10,Math.round(Number(n)*10)/10)):0;
    return {x:safe(value?.x),y:safe(value?.y)};
  }
  function positions(count,shape='',offset=null,spacing=100){
    // NEVER render 24 seats for a 12-player room: seat IDs and template points
    // must use the same seatCount on GM, Worker and Player Web.
    const n=Math.max(1,Math.min(30,Math.trunc(Number(count)||12)));
    const points=seatTemplatePositions(n,normalizeSeatLayout(shape)||recommendedSeatShape(n));
    const shift=normalizeSeatOffset(offset),scale=normalizeSeatSpacing(spacing)/100;
    if(!shift.x&&!shift.y&&scale===1)return points;
    return points.map(p=>({...clampPoint(fire.x+(p.x-fire.x)*scale+shift.x,fire.y+(p.y-fire.y)*scale+shift.y),ring:0}));
  }
  // Presentation/transition repair: old rooms can contain members without seats
  // even after role delivery. Keep every valid seat ID and deterministically
  // allocate only the missing ones, without changing an existing assignment.
  // GM and Player Web use the SAME pure mapping (no account-name-based spawn).
  function seatIdentity(p){
    return String(p?.participantId||(p?.loginId?'member:'+p.loginId:'')||p?.id||'');
  }
  function projectedSeatIds(players,seatCount){
    const n=Math.max(1,Math.min(30,Math.trunc(Number(seatCount)||12)));
    const rows=Array.isArray(players)?players.slice():Object.values(players||{});
    rows.sort((a,b)=>seatIdentity(a).localeCompare(seatIdentity(b)));
    const taken=new Set(),mapping=Object.create(null),waiting=[];
    for(const p of rows){
      const key=seatIdentity(p),raw=Number(p?.seatId);
      if(!key||Object.prototype.hasOwnProperty.call(mapping,key))continue;
      const seat=Number.isInteger(raw)&&raw>=1&&raw<=n&&!taken.has(raw)?raw:0;
      if(seat){mapping[key]=seat;taken.add(seat)}else waiting.push(key);
    }
    for(const key of waiting){
      let choice=0,best=-1;
      for(let seat=1;seat<=n;seat++){
        if(taken.has(seat))continue;
        const gap=taken.size?Math.min(...[...taken].map(other=>{
          const delta=Math.abs(seat-other);return Math.min(delta,n-delta);
        })):n;
        if(gap>best){best=gap;choice=seat}
      }
      if(!choice)break;
      mapping[key]=choice;taken.add(choice);
    }
    return mapping;
  }
  function spawn(id){let h=0;for(const ch of String(id||''))h=(h*31+ch.charCodeAt(0))>>>0;return clampPoint(26+h%4800/100,65+(h>>>8)%1400/100)}
  function fitMode(w,h){const ratio=Number(w)/Math.max(1,Number(h));return ratio>=.85?"stretch":ratio>=.72?"contain":"cover"}
  function rect(w,h){w=Math.max(1,Number(w)||864);h=Math.max(1,Number(h)||1536);const mode=fitMode(w,h);if(mode==="stretch")return{width:w,height:h,left:0,top:0,mode};const s=(mode==="contain"?Math.min:Math.max)(w/864,h/1536),width=864*s,height=1536*s;return{width,height,left:(w-width)/2,top:(h-height)/2,mode}}
  function toScreen(p,w,h){const r=rect(w,h);return{x:(r.left+r.width*p.x/100)/w*100,y:(r.top+r.height*p.y/100)/h*100}}
  function fromScreen(x,y,w,h){const r=rect(w,h);return{x:(x-r.left)/r.width*100,y:(y-r.top)/r.height*100}}
  // Visibility-graph route planner. Cached per pair of endpoints; all path
  // segments remain inside the paving, avoiding the fire and outer gardens.
  const routeCache=new Map();
  const waypoints=[[50,38],[36,40],[64,40],[40.5,50],[59.5,50],
    [32,59],[68,59],[42,60],[58,60],[50,65],[35,73],[65,73],
    [50,79],[50,87],[50,92]].map(p=>({x:p[0],y:p[1]}));
  function safeSegment(a,b){
    const steps=Math.max(2,Math.ceil(Math.hypot(b.x-a.x,(b.y-a.y)*1.78)/1.5));
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      if(!inside(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t))return false;
    }
    return true;
  }
  function route(a,b){
    a=clampPoint(a?.x,a?.y);b=clampPoint(b?.x,b?.y);
    const key=[a.x,a.y,b.x,b.y].map(n=>n.toFixed(2)).join('|');
    if(routeCache.has(key))return routeCache.get(key);
    const nodes=[a,b,...waypoints.filter(p=>inside(p.x,p.y))],best=new Array(nodes.length).fill(Infinity),
      parent=new Array(nodes.length).fill(-1),visited=new Set();
    best[0]=0;
    for(let count=0;count<nodes.length;count++){
      let u=-1;
      for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&(u<0||best[i]<best[u]))u=i;
      if(u<0||best[u]===Infinity||u===1)break;
      visited.add(u);
      for(let v=1;v<nodes.length;v++){
        if(v===u||visited.has(v)||!safeSegment(nodes[u],nodes[v]))continue;
        const weight=Math.hypot(nodes[v].x-nodes[u].x,(nodes[v].y-nodes[u].y)*1.78);
        if(best[u]+weight<best[v]){best[v]=best[u]+weight;parent[v]=u}
      }
    }
    const out=[b];
    if(parent[1]>=0){let at=1;while(parent[at]>0){at=parent[at];out.unshift(nodes[at])}out.unshift(a)}
    else out.unshift(a); // Interpolation still clamps each frame if no connected route.
    if(routeCache.size>=128)routeCache.clear();
    routeCache.set(key,out);
    return out;
  }
  function interpolate(p,now=Date.now()){
    const fallback=p?.seatId?positions(p.seatCount||30)[Number(p.seatId)-1]:clampPoint(p?.positionX,p?.positionY);
    if(p?.movementStatus!=='moving'||!p?.moveStartedAt||!p?.moveDurationMs)return fallback;
    const a={x:Number(p.moveFromX),y:Number(p.moveFromY)},b={x:Number(p.moveToX),y:Number(p.moveToY)};
    if([p.moveFromX,p.moveFromY,p.moveToX,p.moveToY].some(v=>v==null||v===''||!Number.isFinite(Number(v))))return fallback;
    const path=route(a,b),t=Math.max(0,Math.min(1,(now-Number(p.moveStartedAt))/Math.max(1,Number(p.moveDurationMs)))),
      lengths=path.slice(1).map((q,i)=>Math.hypot(q.x-path[i].x,(q.y-path[i].y)*1.78)),
      total=lengths.reduce((sum,v)=>sum+v,0);
    let distance=t*total;
    for(let i=0;i<lengths.length;i++){
      if(distance<=lengths[i]||i===lengths.length-1){
        const f=Math.min(1,distance/Math.max(1e-9,lengths[i]));
        return clampPoint(path[i].x+(path[i+1].x-path[i].x)*f,path[i].y+(path[i+1].y-path[i].y)*f);
      }
      distance-=lengths[i];
    }
    return clampPoint(b.x,b.y);
  }
  root.GMWW_VILLAGE_LAYOUT=Object.freeze({fire,polygon,inside,clampPoint,positions,normalizeSeatOffset,normalizeSeatSpacing,seatTemplatePositions,seatTemplateCounts,seatTemplateShapes,normalizeSeatLayout,recommendedSeatShape,projectedSeatIds,spawn,fitMode,rect,toScreen,fromScreen,route,interpolate});
})(globalThis);
