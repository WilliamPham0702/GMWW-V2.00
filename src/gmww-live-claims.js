// LIVE: bot tự nhận vai (Tiên Tri / Phù Thuỷ), phản biện nhau; Uy tín (trust) lên/xuống trong cùng một ván.
// Khác LIVE_BANK (chỉ thông tin công khai): ở đây bot CỐ Ý nói vai — có thể nói thật (vai thật) hoặc nói dối (Sói giả danh).
// Hàm thuần: nhận dữ kiện đêm qua + hồ sơ bot, trả kịch bản lời nói. Không đụng storage/HTTP.

export const CLAIM_BANK={
 seer_wolf:[
  ["Tui là TIÊN TRI! Đêm qua tui soi {t} — ra SÓI! Treo {t} ngay!","Nghe nè cả làng: tui là Tiên Tri, {t} là Sói, tui soi rồi!"],
  ["Tui nhận vai luôn: tui là Tiên Tri. Đêm qua tui soi {t}, ra Sói.","Tui là Tiên Tri. Kết quả đêm qua: {t} là Sói."],
  ["Tôi xin nhận là Tiên Tri. Đêm qua tôi soi {t}, kết quả là Sói.","Tôi là Tiên Tri. {t} là Sói — tôi chịu trách nhiệm lời này."]
 ],
 seer_good:[
  ["Tui là Tiên Tri! Đêm qua soi {t}, {t} trắng tinh, đừng ai đụng!","Tiên Tri đây! {t} là người tốt, tui bảo kê!"],
  ["Tui là Tiên Tri. Đêm qua tui soi {t}, {t} là dân.","Tui nhận Tiên Tri: {t} sạch, mọi người nghi người khác đi."],
  ["Tôi là Tiên Tri. Tôi đã soi {t} — {t} không phải Sói.","Tôi nhận Tiên Tri. {t} là người tốt, chúng ta loại {t} ra khỏi danh sách nghi."]
 ],
 counter_seer:[
  ["LÁO! Tui mới là Tiên Tri thật! {s} giả danh! Tui soi {t} ra Sói!","{s} nói xạo! Tiên Tri là tui! Đêm qua tui soi {t}, Sói đó!"],
  ["Khoan! Tui mới là Tiên Tri. {s} đang giả. Tui soi {t} ra Sói.","{s} nhận Tiên Tri à? Tui mới là Tiên Tri. Kết quả của tui: {t} là Sói."],
  ["Tôi phải lên tiếng: tôi mới là Tiên Tri, {s} đang mạo danh. Tôi soi {t} — Sói.","Hai người nhận Tiên Tri thì một người là Sói. Tôi là Tiên Tri thật, {t} là Sói."]
 ],
 witch_saved:[
  ["Tui là PHÙ THUỶ! Đêm qua {t} bị Sói cắn, tui cứu đó! Không có tui là {t} đi rồi!","Phù Thuỷ đây! {t} bị cắn, tui đã cứu!"],
  ["Tui nhận Phù Thuỷ. Đêm qua {t} bị cắn, tui dùng bình cứu.","Tui là Phù Thuỷ, đêm qua tui cứu {t}."],
  ["Tôi là Phù Thuỷ. Đêm qua {t} bị Sói cắn và tôi đã cứu.","Tôi xin nhận Phù Thuỷ: {t} bị cắn, tôi cứu, bình cứu đã hết."]
 ],
 witch_nosave_alive:[
  ["Tui là Phù Thuỷ! Đêm qua {t} bị Sói cắn, tui KHÔNG cứu — vậy mà {t} vẫn sống?! Giải thích đi {t}!","Phù Thuỷ đây: {t} bị cắn, tui không cứu. Sao {t} còn sống nhăn vậy?!"],
  ["Tui là Phù Thuỷ. Đêm qua {t} bị cắn, tui không cứu, mà {t} vẫn sống. Lạ ghê.","Tui nhận Phù Thuỷ: {t} bị cắn, tui không cứu. Tại sao {t} vẫn sống?"],
  ["Tôi là Phù Thuỷ. Đêm qua {t} bị Sói cắn, tôi không cứu — thế nhưng {t} vẫn sống. Có Bảo Vệ, hay {t} có điều gì giấu?","Tôi là Phù Thuỷ. {t} bị cắn, tôi không dùng bình cứu. {t} còn sống là điều cần làm rõ."]
 ],
 witch_nosave_dead:[
  ["Tui là Phù Thuỷ… đêm qua {t} bị cắn, tui không kịp cứu. Tui có lỗi!","Phù Thuỷ đây, {t} bị cắn mà tui không cứu. Giờ tui quyết tìm Sói!"],
  ["Tui nhận Phù Thuỷ. Đêm qua {t} bị cắn, tui không cứu.","Tui là Phù Thuỷ, {t} bị cắn, tui giữ bình cứu lại."],
  ["Tôi là Phù Thuỷ. Đêm qua {t} bị cắn, tôi đã không cứu. Tôi giữ bình cho đêm sau.","Tôi nhận Phù Thuỷ: nạn nhân đêm qua là {t}."]
 ],
 believe:[
  ["Tui tin {s}! {s} nói vậy là chuẩn rồi!","Theo {s}! Uy tín {s} cao lắm!"],
  ["Tui tin {s}. Nghe hợp lý.","{s} nói có lý, tui theo {s}."],
  ["Tôi tin {s}. Lời {s} khớp với những gì đã diễn ra.","Tôi đứng về phía {s}."]
 ],
 doubt:[
  ["Xạo! {s} nhận vai lúc này là lộ hàng rồi!","Tui không tin {s}! Sói hay nhận vai bậy lắm!"],
  ["Tui không tin {s} lắm. Nhận vai sớm vậy làm gì?","{s} nói vậy chứ tui chưa tin."],
  ["Tôi chưa tin {s}. Nhận vai mà không có bằng chứng thì dễ là Sói.","Lời {s} còn nhiều điểm đáng ngờ."]
 ],
 defend_alive:[
  ["Ủa tui sống thì sao?! Chắc có Bảo Vệ che tui chứ sao!","Tui sống là may! Đừng có đổ tui!"],
  ["Tui cũng không biết, chắc có Bảo Vệ che tui.","Tui sống thì đâu có nghĩa tui là Sói."],
  ["Có thể Bảo Vệ đã che tôi. Còn sống không có nghĩa là có tội.","Tôi không biết vì sao tôi sống. Xin đừng vội kết luận."]
 ]
};

const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
export function claimLine(label,tone=1,vars={},rnd=Math.random){
 const rows=CLAIM_BANK[label];if(!rows)return '';
 const list=rows[tone]||rows[1]||rows[0],text=list[Math.floor(rnd()*list.length)]||'';
 return text.replace(/\{(t|s)\}/g,(_,k)=>vars[k]??'');
}
const isWolfFaction=f=>/s[oó]i|wolf/i.test(String(f||'').normalize('NFC'));

// facts: {alive:[id], wolves:[id], seer:{actorId,targetId}|null, witch:{actorId}|null, bitten:[id], witchSaved:bool, diedLastNight:[id]}
// profiles: {id:{stats,trust,tone}}. Trả các bước nói theo thứ tự: {actorId,label,bank:'claim'|'live',vars:{t?,s?} (loginId), effect?}
export function planClaimScript(facts,profiles,rnd=Math.random){
 const steps=[],alive=new Set(facts.alive||[]),wolves=new Set(facts.wolves||[]),prof=id=>profiles[id]||{stats:{},trust:50,tone:1};
 const say=(actorId,label,vars={},effect=null)=>steps.push({actorId,label,bank:'claim',vars,effect});
 let seerClaim=null;
 // Tiên Tri thật: kết quả Sói làm tăng ý muốn nhận vai.
 const seer=facts.seer;
 if(seer&&alive.has(seer.actorId)&&seer.targetId){
  const s=prof(seer.actorId).stats,isWolf=wolves.has(seer.targetId);
  const chance=clamp(.3+(isWolf?.35:0)+((s.aggressive??50)-50)/250+((s.honest??50)-50)/400,.15,.9);
  if(rnd()<chance){seerClaim={actorId:seer.actorId,targetId:seer.targetId,wolf:isWolf};say(seer.actorId,isWolf?'seer_wolf':'seer_good',{t:seer.targetId},{type:'claim',role:'seer',target:seer.targetId,wolf:isWolf})}
 }
 // Sói giả danh Tiên Tri: phản biện Tiên Tri thật, hoặc tự nhận khi chưa ai nhận.
 const liars=[...wolves].filter(id=>alive.has(id)&&(!seerClaim||id!==seerClaim.actorId));
 const liar=liars.sort((a,b)=>(prof(b).stats.acting??0)-(prof(a).stats.acting??0))[0];
 if(liar){
  const acting=prof(liar).stats.acting??50,villagers=[...alive].filter(id=>!wolves.has(id)&&id!==liar);
  if(seerClaim&&rnd()<clamp(acting/130,.15,.75)){
   const target=seerClaim.wolf&&seerClaim.targetId===liar?seerClaim.actorId:(rnd()<.6?seerClaim.actorId:villagers[Math.floor(rnd()*villagers.length)]);
   if(target)say(liar,'counter_seer',{s:seerClaim.actorId,t:target},{type:'counter',role:'seer',against:seerClaim.actorId,target,wolf:true});
  }else if(!seerClaim&&villagers.length&&rnd()<clamp((acting-40)/150,.05,.35)){
   const target=villagers[Math.floor(rnd()*villagers.length)];
   seerClaim={actorId:liar,targetId:target,wolf:true,fake:true};
   say(liar,'seer_wolf',{t:target},{type:'claim',role:'seer',target,wolf:true,fake:true});
  }
 }
 // Phù Thuỷ thật: kể nạn nhân bị cắn đêm qua.
 const witch=facts.witch,bitten=(facts.bitten||[])[0];
 if(witch&&alive.has(witch.actorId)&&bitten&&rnd()<clamp(.4+((prof(witch.actorId).stats.aggressive??50)-50)/250,.2,.8)){
  const died=(facts.diedLastNight||[]).includes(bitten);
  const label=facts.witchSaved?'witch_saved':died?'witch_nosave_dead':'witch_nosave_alive';
  say(witch.actorId,label,{t:bitten},{type:'claim',role:'witch',target:bitten,suspicious:label==='witch_nosave_alive'});
  if(label==='witch_nosave_alive'&&alive.has(bitten))say(bitten,'defend_alive',{},{type:'defend',target:bitten});
 }
 // Phản ứng: 2–4 bot tin / không tin người nhận vai, theo uy tín người nhận và tính Cả tin / Thông minh.
 const claimers=steps.filter(x=>x.effect&&['claim','counter'].includes(x.effect.type)).map(x=>x.actorId);
 if(claimers.length){
  const others=[...alive].filter(id=>!claimers.includes(id)).sort(()=>rnd()-.5).slice(0,Math.min(4,Math.max(2,claimers.length*2)));
  for(const id of others){
   const about=claimers[Math.floor(rnd()*claimers.length)],me=prof(id).stats,tr=prof(about).trust??50;
   const p=clamp(.5+(tr-50)/100+((me.gullible??50)-50)/200-((me.smart??50)-50)/400-(wolves.has(id)&&!wolves.has(about)?.25:0),.1,.9);
   const believe=rnd()<p;
   say(id,believe?'believe':'doubt',{s:about},{type:believe?'believe':'doubt',about});
  }
 }
 return steps;
}

// Uy tín thay đổi khi lời được nói ra. suspicion: {loginId:điểm} dùng để bot đề cử / bỏ phiếu.
export function applyClaimEffect(effect,actorId,profiles,suspicion,steps=[]){
 if(!effect)return;
 const p=id=>profiles[id];
 const bump=(id,d)=>{if(p(id))p(id).trust=clamp(Math.round((p(id).trust??50)+d),0,100)};
 const sus=(id,d)=>{if(id)suspicion[id]=Math.max(0,(suspicion[id]||0)+d)};
 const w=id=>((p(id)?.trust??50)/50);
 if(effect.type==='claim'){
  const contested=steps.some(x=>x.effect?.type==='counter'&&x.effect.against===actorId);
  bump(actorId,contested?-5:4);
  if(effect.role==='seer')sus(effect.target,effect.wolf?3*w(actorId):-1.5*w(actorId));
  if(effect.role==='witch'&&effect.suspicious)sus(effect.target,1.5*w(actorId));
 }else if(effect.type==='counter'){
  bump(actorId,-5);bump(effect.against,-5);sus(effect.target,2.5*w(actorId));sus(effect.against,1.2);sus(actorId,1.2);
 }else if(effect.type==='believe'){bump(effect.about,3)}
 else if(effect.type==='doubt'){bump(effect.about,-3);sus(effect.about,.8)}
 else if(effect.type==='defend'){bump(actorId,1)}
}

// Chọn mục tiêu theo điểm nghi: trọng số 1 + nghi.
export function weightedPick(ids,suspicion={},rnd=Math.random){
 const w=ids.map(id=>1+Math.max(0,suspicion[id]||0)),total=w.reduce((a,b)=>a+b,0);
 let r=rnd()*total;for(let i=0;i<ids.length;i++){r-=w[i];if(r<=0)return ids[i]}
 return ids[ids.length-1];
}
// Xác suất bỏ phiếu Giết theo điểm nghi của người trên giàn.
export const killChance=score=>clamp(.45+Math.min(4,Math.max(0,score||0))*.1,.3,.88);
export {isWolfFaction,hash as claimHash};
