export const VILLAGE_FIRE_CENTER=Object.freeze({x:50,y:49.7});

export function villageGatherPoint(id,participantIds=[]){
  const own=String(id||"");
  const ordered=[...new Set([...(Array.isArray(participantIds)?participantIds:[]).map(String).filter(Boolean),own].filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const total=Math.max(1,Math.min(30,ordered.length));
  const index=Math.max(0,Math.min(total-1,ordered.indexOf(own)));
  const innerCount=total<=12?total:Math.min(12,Math.max(6,Math.round(total*.4)));
  const outer=index>=innerCount;
  const ringCount=outer?Math.max(1,total-innerCount):Math.max(1,innerCount);
  const ringIndex=outer?index-innerCount:index;
  const rx=outer?17.8:11.2,ry=outer?8.6:5.4;
  const stagger=outer?Math.PI/ringCount:0;
  const angle=-Math.PI/2+(Math.PI*2*ringIndex/ringCount)+stagger;
  return{
    x:Math.round((VILLAGE_FIRE_CENTER.x+rx*Math.cos(angle))*100)/100,
    y:Math.round((VILLAGE_FIRE_CENTER.y+ry*Math.sin(angle))*100)/100
  };
}
