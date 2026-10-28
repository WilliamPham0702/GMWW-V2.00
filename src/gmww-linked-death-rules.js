// Server-authoritative connected deaths for Cupid, Trưởng Phái and Tà Đạo.
// Pairing is recognized only after two distinct accepted receipts from the
// very same confirmed multi-target action, never one unconfirmed click.
const id=v=>String(v??'').trim().toLowerCase().replace(/^member:/,'');
const receiptGroup=row=>String(row.clientEventId||'').replace(/:[^:]+$/,'');
export function resolveLinkedDeaths({assignments=[],interactions=[],matchId,night}={}){
 const match=String(matchId||'');
 if(!match)return [];
 const rows=(Array.isArray(interactions)?interactions:[]).filter(x=>
   String(x.matchId||'')===match&&x.undone!==true&&x.noEffect!==true);
 const roles=new Map((Array.isArray(assignments)?assignments:[]).map(x=>[id(x.loginId),x.roleId]));
 const linked=new Map(),add=(source,target,kind)=>{
   if(!source||!target||source===target)return;
   const list=linked.get(source)||[];list.push({target,kind});linked.set(source,list);
 };
 const pairs=new Map();
 for(const x of rows){
   if(x.type!=='effect_notice')continue;
   const actor=id(x.actorId),target=id(x.loginId);
   if(x.actionId==='action-cupid-pair'&&roles.get(actor)==='role_cupid'){
     const key=actor+':'+receiptGroup(x);const group=pairs.get(key)||new Set();
     group.add(target);pairs.set(key,group);
   }
   if(x.actionId==='25'&&roles.get(actor)==='role_sect_leader')
     add(actor,target,'sect');
   if(x.actionId==='action-cult-add'&&roles.get(actor)==='role_cult')
     add(actor,target,'cult');
 }
 for(const targets of pairs.values()){
   if(targets.size!==2)continue;
   const [a,b]=targets;add(a,b,'cupid');add(b,a,'cupid');
 }
 const deaths=rows.filter(x=>x.type==='dead'&&x.effectActive!==false&&
   Number(x.night||0)<=Number(night||Infinity));
 const seen=new Set(deaths.map(x=>id(x.loginId))),out=[],queue=deaths.map(x=>id(x.loginId));
 // The graph is bounded by the number of actual players, not retries or
 // repeats of the same target. Repeated calls return no duplicate deaths.
 const max=Math.max(1,(Array.isArray(assignments)?assignments:[]).length);
 while(queue.length&&out.length<=max){
   const source=queue.shift();
   for(const {target,kind} of linked.get(source)||[]){
     if(seen.has(target))continue;
     seen.add(target);queue.push(target);
     const eventId='linked-death:'+match+':'+kind+':'+target;
     if(rows.some(x=>x.id===eventId))continue;
     out.push({id:eventId,type:'dead',loginId:target,actorId:source,
       matchId:match,night:Number(night||1),effectActive:true,
       source:'linked-death-engine',actionId:'action-linked-'+kind,
       message:kind==='cupid'?'Một người trong cặp Tình Nhân đã chết.':
         kind==='sect'?'Trưởng Phái chết nên Giáo Dân chết theo.':
         'Thủ lĩnh Tà Đạo chết nên thành viên chết theo.'});
   }
 }
 return out;
}
