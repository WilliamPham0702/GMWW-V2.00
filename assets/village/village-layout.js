/* One coordinate contract for Worker, Player Web and the packaged GM app. */
(function(root){
  /* Courtyard plus the lower wooden bridge. Houses, sea and sky stay outside. */
  const fire={x:50,y:49.7},polygon=[[22,33],[78,33],[88,57],[75,84],[62,89],[62,99],[38,99],[38,89],[25,84],[12,57]];
  function inside(x,y){let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit}return hit}
  function clampPoint(x,y){x=Number(x);y=Number(y);if(arguments[0]==null||arguments[1]==null||!Number.isFinite(x)||!Number.isFinite(y))return{x:50,y:76};y=Math.max(34,Math.min(98,y));const xs=[];for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length];if((a[1]<=y&&b[1]>=y)||(b[1]<=y&&a[1]>=y)){if(a[1]!==b[1])xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]))}}if(xs.length)x=Math.max(Math.min(...xs)+1.5,Math.min(Math.max(...xs)-1.5,x));if(Math.hypot((x-fire.x)/6,(y-fire.y)/3)<1)y=fire.y+(y<fire.y?-3.1:3.1);return{x,y}}
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
    const n=Math.max(1,Math.min(30,Math.trunc(Number(count)||12)));
    const kind=normalizeSeatLayout(shape)||recommendedSeatShape(n);
    // Radius adapts to available courtyard, with fire permanently at
    // world (50,49.7). For 30 players we expand ONE rectangle, not rings.
    const rx=kind==='circle'?22.8:kind==='ellipse'?27.4:27.5;
    const ry=kind==='circle'?13.1:kind==='ellipse'?12.9:13.2;
    // A small deterministic phase search keeps 25–30 adjacent players
    // from bunching diagonally around rectangle corners.
    let phase=0;
    if(kind==='rectangle'){
      let bestDistance=-1;
      for(let step=0;step<32;step++){
        const shift=step/(32*n),points=Array.from({length:n},(_,i)=>
          rectangleContour(i/n+shift,rx,ry));
        const minGap=Math.min(...points.map((p,i)=>{
          const q=points[(i+1)%n];
          return Math.hypot(p.x-q.x,SCREEN_Y_SCALE*(p.y-q.y));
        }));
        if(minGap>bestDistance+1e-8){bestDistance=minGap;phase=shift}
      }
    }
    const result=[];
    for(let i=0;i<n;i++){
      const p=kind==='rectangle'?rectangleContour(i/n+phase,rx,ry):ovalContour(i/n,rx,ry);
      const point=clampPoint(fire.x+p.x,fire.y+p.y);
      result.push({x:point.x,y:point.y,ring:0});
    }
    return result;
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
  function spawn(id){let h=0;for(const ch of String(id||''))h=(h*31+ch.charCodeAt(0))>>>0;return clampPoint(26+h%4800/100,65+(h>>>8)%1400/100)}
  function fitMode(w,h){const ratio=Number(w)/Math.max(1,Number(h));return ratio>=.85?"stretch":ratio>=.72?"contain":"cover"}
  function rect(w,h){w=Math.max(1,Number(w)||864);h=Math.max(1,Number(h)||1536);const mode=fitMode(w,h);if(mode==="stretch")return{width:w,height:h,left:0,top:0,mode};const s=(mode==="contain"?Math.min:Math.max)(w/864,h/1536),width=864*s,height=1536*s;return{width,height,left:(w-width)/2,top:(h-height)/2,mode}}
  function toScreen(p,w,h){const r=rect(w,h);return{x:(r.left+r.width*p.x/100)/w*100,y:(r.top+r.height*p.y/100)/h*100}}
  function fromScreen(x,y,w,h){const r=rect(w,h);return{x:(x-r.left)/r.width*100,y:(y-r.top)/r.height*100}}
  function route(a,b){a=clampPoint(a.x,a.y);b=clampPoint(b.x,b.y);const dx=b.x-a.x,dy=(b.y-a.y)*2,t=Math.max(0,Math.min(1,((fire.x-a.x)*dx+(fire.y-a.y)*2*dy)/(dx*dx+dy*dy||1))),d=Math.hypot(a.x+dx*t-fire.x,(a.y+dy*t/2-fire.y)*2);if(d<7){const side=(a.y+b.y)/2<fire.y?-1:1,near={x:fire.x+(a.x<=b.x?-9:9),y:fire.y+side*5},far={x:fire.x+(a.x<=b.x?9:-9),y:fire.y+side*5};return[a,clampPoint(near.x,near.y),clampPoint(far.x,far.y),b]}return[a,b]}
  function interpolate(p,now=Date.now()){
    const fallback=p?.seatId?positions(p.seatCount||30)[Number(p.seatId)-1]:clampPoint(p?.positionX,p?.positionY);
    if(p?.movementStatus!=='moving'||!p?.moveStartedAt||!p?.moveDurationMs)return fallback;
    const a={x:Number(p.moveFromX),y:Number(p.moveFromY)},b={x:Number(p.moveToX),y:Number(p.moveToY)};if([p.moveFromX,p.moveFromY,p.moveToX,p.moveToY].some(v=>v==null||v===''||!Number.isFinite(Number(v))))return fallback;
    const path=route(a,b),t=Math.max(0,Math.min(1,(now-Number(p.moveStartedAt))/Math.max(1,Number(p.moveDurationMs)))),lengths=path.slice(1).map((q,i)=>Math.hypot(q.x-path[i].x,(q.y-path[i].y)*2)),total=lengths.reduce((s,v)=>s+v,0);let distance=t*total;
    for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]||i===lengths.length-1){const f=Math.min(1,distance/(lengths[i]||1));return clampPoint(path[i].x+(path[i+1].x-path[i].x)*f,path[i].y+(path[i+1].y-path[i].y)*f)}distance-=lengths[i]}return b;
  }
  root.GMWW_VILLAGE_LAYOUT=Object.freeze({fire,polygon,inside,clampPoint,positions,normalizeSeatOffset,normalizeSeatSpacing,seatTemplatePositions,seatTemplateCounts,seatTemplateShapes,normalizeSeatLayout,recommendedSeatShape,spawn,fitMode,rect,toScreen,fromScreen,route,interpolate});
})(globalThis);
