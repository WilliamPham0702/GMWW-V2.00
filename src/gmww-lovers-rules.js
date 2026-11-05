// Cupid: hai người được ghép đôi có sinh mạng liên kết. Một người chết thì người kia chết cùng lúc.
// Luật thuần, dùng cho Server và test. Luật do chủ dự án chốt 05/11/2026: chết theo CÙNG LÚC.
const id=value=>String(value??'').trim().replace(/^member:/,'').toLowerCase();
const PAIR_ACTION='action-cupid-pair';
export function loverPairs({interactions=[],matchId=''}={}){
  const match=String(matchId||''),rows=(Array.isArray(interactions)?interactions:[])
    .filter(r=>r&&String(r.matchId||'')===match&&String(r.actionId||'')===PAIR_ACTION&&
      r.noEffect!==true&&r.status!=='skipped'&&r.undone!==true);
  const byActor=new Map();
  for(const r of rows){
    const actor=id(r.actorId),target=id(r.loginId);if(!actor||!target)continue;
    const list=byActor.get(actor)||[];if(!list.includes(target))list.push(target);byActor.set(actor,list);
  }
  const pairs=[];
  for(const list of byActor.values())if(list.length===2)pairs.push(list);
  return pairs;
}
export function loverLinkedDeaths({interactions=[],matchId='',night=1}={}){
  const match=String(matchId||''),rows=Array.isArray(interactions)?interactions:[];
  const dead=r=>r&&String(r.matchId||'')===match&&r.type==='dead'&&r.effectActive!==false;
  const result=[];
  for(const [a,b] of loverPairs({interactions:rows,matchId:match})){
    for(const [from,to] of [[a,b],[b,a]]){
      const death=rows.find(r=>dead(r)&&id(r.loginId)===from);
      if(!death||rows.some(r=>dead(r)&&id(r.loginId)===to))continue;
      const rid='lover-link:'+match+':'+String(death.id||from)+':'+to;
      if(rows.some(r=>String(r.id||'')===rid)||result.some(r=>r.id===rid))continue;
      result.push({id:rid,type:'dead',loginId:to,matchId:match,night:Number(death.night||night)||1,
        cycleKey:String(death.cycleKey||''),source:'lovers-engine',actionId:'action_lover_link',
        effectName:'Tình Nhân',effectActive:true,causeDeathId:String(death.id||''),
        message:'Người yêu đã chết; chết theo cùng lúc.'});
    }
  }
  return result;
}
