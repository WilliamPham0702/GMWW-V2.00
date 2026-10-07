/* One coordinate contract for Worker, Player Web and the packaged GM app. */
(function(root){
  /* Courtyard plus the lower wooden bridge. Houses, sea and sky stay outside. */
  const fire={x:50,y:49.7},polygon=[[22,33],[78,33],[88,57],[75,84],[62,89],[62,99],[38,99],[38,89],[25,84],[12,57]];
  function inside(x,y){let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit}return hit}
  function clampPoint(x,y){x=Number(x);y=Number(y);if(arguments[0]==null||arguments[1]==null||!Number.isFinite(x)||!Number.isFinite(y))return{x:50,y:76};y=Math.max(34,Math.min(98,y));const xs=[];for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length];if((a[1]<=y&&b[1]>=y)||(b[1]<=y&&a[1]>=y)){if(a[1]!==b[1])xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]))}}if(xs.length)x=Math.max(Math.min(...xs)+1.5,Math.min(Math.max(...xs)-1.5,x));if(Math.hypot((x-fire.x)/6,(y-fire.y)/3)<1)y=fire.y+(y<fire.y?-3.1:3.1);return{x,y}}
  function positions(count){
    const n=Math.max(24,Math.min(30,Math.trunc(Number(count)||24))),rings=n<=24?[8,16]:[8,16,n-24],out=[];
    const geometry=[{rx:17,ry:7.2},{rx:29,ry:12.2},{rx:37,ry:15.2}];
    rings.forEach((size,r)=>{
      if(!size)return;
      const g=geometry[r],offset=r===0?0:r===1?Math.PI/size:Math.PI/(size*2);
      for(let i=0;i<size;i++){
        const a=-Math.PI/2+2*Math.PI*i/size+offset;
        const p=clampPoint(fire.x+g.rx*Math.cos(a),fire.y+g.ry*Math.sin(a));
        out.push({x:p.x,y:p.y,ring:r});
      }
    });
    return out
  }
  function spawn(id){let h=0;for(const ch of String(id||''))h=(h*31+ch.charCodeAt(0))>>>0;return clampPoint(26+h%4800/100,65+(h>>>8)%1400/100)}
  function fitMode(w,h){const ratio=Number(w)/Math.max(1,Number(h));return ratio>=.85?"stretch":ratio>=.72?"contain":"cover"}
  function rect(w,h){w=Math.max(1,Number(w)||864);h=Math.max(1,Number(h)||1536);const mode=fitMode(w,h);if(mode==="stretch")return{width:w,height:h,left:0,top:0,mode};const s=(mode==="contain"?Math.min:Math.max)(w/864,h/1536),width=864*s,height=1536*s;return{width,height,left:(w-width)/2,top:(h-height)/2,mode}}
  function toScreen(p,w,h){const r=rect(w,h);return{x:(r.left+r.width*p.x/100)/w*100,y:(r.top+r.height*p.y/100)/h*100}}
  function fromScreen(x,y,w,h){const r=rect(w,h);return{x:(x-r.left)/r.width*100,y:(y-r.top)/r.height*100}}
  function route(a,b){a=clampPoint(a.x,a.y);b=clampPoint(b.x,b.y);const dx=b.x-a.x,dy=(b.y-a.y)*2,t=Math.max(0,Math.min(1,((fire.x-a.x)*dx+(fire.y-a.y)*2*dy)/(dx*dx+dy*dy||1))),d=Math.hypot(a.x+dx*t-fire.x,(a.y+dy*t/2-fire.y)*2);if(d<7){const side=(a.y+b.y)/2<fire.y?-1:1,near={x:fire.x+(a.x<=b.x?-9:9),y:fire.y+side*5},far={x:fire.x+(a.x<=b.x?9:-9),y:fire.y+side*5};return[a,near,far,b]}return[a,b]}
  function interpolate(p,now=Date.now()){
    const fallback=p?.seatId?positions(p.seatCount||30)[Number(p.seatId)-1]:clampPoint(p?.positionX,p?.positionY);
    if(p?.movementStatus!=='moving'||!p?.moveStartedAt||!p?.moveDurationMs)return fallback;
    const a={x:Number(p.moveFromX),y:Number(p.moveFromY)},b={x:Number(p.moveToX),y:Number(p.moveToY)};if([p.moveFromX,p.moveFromY,p.moveToX,p.moveToY].some(v=>v==null||v===''||!Number.isFinite(Number(v))))return fallback;
    const path=route(a,b),t=Math.max(0,Math.min(1,(now-Number(p.moveStartedAt))/Math.max(1,Number(p.moveDurationMs)))),lengths=path.slice(1).map((q,i)=>Math.hypot(q.x-path[i].x,(q.y-path[i].y)*2)),total=lengths.reduce((s,v)=>s+v,0);let distance=t*total;
    for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]||i===lengths.length-1){const f=Math.min(1,distance/(lengths[i]||1));return{x:path[i].x+(path[i+1].x-path[i].x)*f,y:path[i].y+(path[i+1].y-path[i].y)*f}}distance-=lengths[i]}return b;
  }
  root.GMWW_VILLAGE_LAYOUT=Object.freeze({fire,polygon,inside,clampPoint,positions,spawn,fitMode,rect,toScreen,fromScreen,route,interpolate});
})(globalThis);
