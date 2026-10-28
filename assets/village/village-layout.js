/* One coordinate contract for Worker, Player Web and the packaged GM app. */
(function(root){
  /* V3.128 — ONLY the paving of Asahi Village is walkable.
     A deliberately conservative courtyard + central bridge corridor.
     The sea, roofs, landscaped terraces and lawns remain beyond this boundary.
     This shared object is loaded unchanged in Worker, GM IPA and Player Web. */
  // GP2: the fire is a scene landmark, not the centre of the bitmap.
  // All coordinates are 0..100 in the common Day/Night world frame.
  const fire={x:50,y:64};
  const scene=Object.freeze({id:'gp2-25d',version:1,fire,skyEnd:15,groundTop:28,groundBottom:99,
    zones:Object.freeze({back:[29,48],middle:[48,73],front:[73,94]})});
  // The central paving must accommodate one 6–30-seat circle.
  // Outer roofs/sea are excluded, while the lower bridge remains walkable.
  // Paved 2.5D courtyard; outer houses, sea and foliage are never walkable.
  const polygon=[[16,28],[84,28],[89,35],[89,53],[91,70],[89,88],
    [84,94],[62,94],[62,99],[38,99],[38,94],[16,94],[11,88],[9,70],[11,53],[11,35]];
  const fireRadius={x:8.8,y:5.6};
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
    if(!Number.isFinite(x)||!Number.isFinite(y))return{x:50,y:82};
    y=Math.max(29,Math.min(98,y));
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
  // V3.191: only even-sized Seat Mau presets: 6,8,...30. Actual seat IDs
  // remain contiguous (1..count), and odd-size existing rooms stay supported.
  const seatTemplateCounts=Object.freeze(Array.from({length:13},(_,i)=>6+i*2));
  const seatTemplateShapes=Object.freeze(['circle']);
  function normalizeSeatLayout(shape){
    // Render all saved legacy outlines on the same real-life circular ring.
    // Do not rewrite assignments or persisted Seat IDs.
    const value=String(shape||'');
    return ['circle','ellipse','diamond','rectangle'].includes(value)?'circle':'';
  }
  function recommendedSeatShape(count){
    return 'circle';
  }
  const SCREEN_Y_SCALE=1.78;
  function circleContour(t,rx,ry){
    const a=-Math.PI/2+2*Math.PI*t;
    return{x:rx*Math.cos(a),y:ry*Math.sin(a)};
  }
  // Spread by displayed arc length so small and large groups use one balanced
  // perimeter, even in the portrait 2.5D camera projection.
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
  function seatTemplatePositions(count,shape){
    const n=Math.max(1,Math.min(30,Math.trunc(Number(count)||12)));
    // Physical circle, displayed as an ellipse in the 2.5D perspective.
    // As player count increases, expand the ONE perimeter around the campfire
    // without changing Character scale or using inner tiers / box formations.
    const radiusX=Math.min(35,22+(n-6)*0.54);
    const radiusY=radiusX/SCREEN_Y_SCALE;
    const result=[];
    for(let i=0;i<n;i++){
      const p=ovalContour(i/n,radiusX,radiusY);
      const x=fire.x+p.x,y=fire.y+p.y;
      if(!inside(x,y))throw Error('INVALID_SEAT_CIRCLE_'+n+'_'+i);
      result.push({x,y,ring:0,depth:Math.max(0,Math.min(5,Math.floor((y-29)/11)))});
    }
    return result;
  }
  function normalizeSeatSpacing(value){const n=Number(value);return Number.isFinite(n)?Math.max(50,Math.min(300,Math.round(n))):100}
  function normalizeSeatOffset(value){
    // Offset is a world-frame gesture, not an arbitrary ±30 drag cap.
    // The actual bounds come from the full Seat formation below.
    const safe=n=>Number.isFinite(Number(n))?Math.max(-200,Math.min(200,Math.round(Number(n)*10)/10)):0;
    return {x:safe(value?.x),y:safe(value?.y)};
  }
  function seatFormationBase(count,shape='',spacing=100){
    const n=Math.max(1,Math.min(30,Math.trunc(Number(count)||12)));
    const template=seatTemplatePositions(n,normalizeSeatLayout(shape)||recommendedSeatShape(n));
    const value=normalizeSeatSpacing(spacing);
    // Keep existing 70–135% rooms visually unchanged. Outside that legacy
    // interval, open the real seat radius all the way from 50% to 300%.
    const interpolate=(low,high,start,end)=>start+(value-low)/(high-low)*(end-start);
    const scaleX=value<70?interpolate(50,70,.5,.94):value<=100?interpolate(70,100,.94,1):value<=135?interpolate(100,135,1,1.06):interpolate(135,300,1.06,3);
    const scaleY=value<70?interpolate(50,70,.5,.96):value<=100?interpolate(70,100,.96,1):value<=135?interpolate(100,135,1,1.08):interpolate(135,300,1.08,3);
    return template.map(p=>({x:fire.x+(p.x-fire.x)*scaleX,
      y:fire.y+(p.y-fire.y)*scaleY,ring:0,depth:p.depth}));
  }
  function resolveSeatOffset(count,shape='',offset=null,spacing=100){
    const base=seatFormationBase(count,shape,spacing);
    const target=normalizeSeatOffset(offset);
    // Drag the WHOLE ring across the scene; the campfire/courtyard collision
    // rules apply to walking Characters, not to GM positioning the Seat template.
    // Bound each axis by the extreme Seat anchors, never by individual clamps.
    // This makes the entire map reachable while preventing off-map Seats.
    const margin=2;
    // At high spacing, the ring may exceed the viewport. Allow panning
    // between both extremes instead of collapsing the 300% radius.
    const axisBounds=values=>{
      const lo=Math.min(...values),hi=Math.max(...values);
      return hi-lo<=100-2*margin
        ?[Math.ceil((margin-lo)*10)/10,Math.floor((100-margin-hi)*10)/10]
        :[Math.ceil((margin-hi)*10)/10,Math.floor((100-margin-lo)*10)/10];
    };
    const [minX,maxX]=axisBounds(base.map(p=>p.x));
    const [minY,maxY]=axisBounds(base.map(p=>p.y));
    return {
      x:Math.max(minX,Math.min(maxX,target.x)),
      y:Math.max(minY,Math.min(maxY,target.y))
    };
  }
  function positions(count,shape='',offset=null,spacing=100){
    const base=seatFormationBase(count,shape,spacing);
    const shift=resolveSeatOffset(count,shape,offset,spacing);
    // Every Seat has the SAME translation vector; never call clampPoint here.
    return base.map(p=>({...p,x:p.x+shift.x,y:p.y+shift.y}));
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
  function spawn(id){let h=0;for(const ch of String(id||''))h=(h*31+ch.charCodeAt(0))>>>0;return clampPoint(17+h%6600/100,38+(h>>>8)%4900/100)}
  function fitMode(w,h){const ratio=Number(w)/Math.max(1,Number(h));return ratio>=.85?"stretch":ratio>=.72?"contain":"cover"}
  function rect(w,h){w=Math.max(1,Number(w)||864);h=Math.max(1,Number(h)||1536);const mode=fitMode(w,h);if(mode==="stretch")return{width:w,height:h,left:0,top:0,mode};const s=(mode==="contain"?Math.min:Math.max)(w/864,h/1536),width=864*s,height=1536*s;return{width,height,left:(w-width)/2,top:(h-height)/2,mode}}
  function toScreen(p,w,h){const r=rect(w,h);return{x:(r.left+r.width*p.x/100)/w*100,y:(r.top+r.height*p.y/100)/h*100}}
  function fromScreen(x,y,w,h){const r=rect(w,h);return{x:(x-r.left)/r.width*100,y:(y-r.top)/r.height*100}}
  // Visibility-graph route planner. Cached per pair of endpoints; all path
  // segments remain inside the paving, avoiding the fire and outer gardens.
  const routeCache=new Map();
  const waypoints=[[50,34],[29,39],[71,39],[34,50],[66,50],
    [29,61],[39,62],[61,62],[71,61],[33,72],[67,72],
    [50,79],[28,83],[72,83],[50,90]].map(p=>({x:p[0],y:p[1]}));
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
  root.GMWW_VILLAGE_LAYOUT=Object.freeze({scene,fire,polygon,inside,clampPoint,positions,resolveSeatOffset,normalizeSeatOffset,normalizeSeatSpacing,seatTemplatePositions,seatTemplateCounts,seatTemplateShapes,normalizeSeatLayout,recommendedSeatShape,projectedSeatIds,spawn,fitMode,rect,toScreen,fromScreen,route,interpolate});
})(globalThis);
