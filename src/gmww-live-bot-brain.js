// LIVE bot brain (pure, deterministic per seed): 7 chỉ số ẩn, cá tính, tin cậy.
// Chỉ dùng thông tin CÔNG KHAI để quyết định lời nói (ghế, đề cử, phiếu, tin cậy).
// Vai thật không bao giờ đi vào hàm nói; chỉ applyLynchOutcome nhận phe để cập nhật tin cậy ẩn.

export const BOT_STAT_KEYS=['smart','honest','gullible','aggressive','firm','acting','trust'];

const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};

// PRNG nhỏ, có seed để cùng loginId luôn ra cùng cá tính.
function seededRandom(seed){
 let s=seed>>>0||1;
 return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296};
}

const clamp=(n,lo=0,hi=100)=>Math.max(lo,Math.min(hi,n));

// Tạo hồ sơ bot: 7 chỉ số 0–100 cố định theo loginId.
export function createBotProfile(loginId){
 const rnd=seededRandom(hash('live-bot:'+loginId));
 const stats={};
 for(const k of BOT_STAT_KEYS)stats[k]=Math.round(10+rnd()*80); // 10–90, tránh cực đoan
 return {loginId:String(loginId),stats,trust:stats.trust,tone:toneFor(stats)};
}

// Giọng nói: 0 = nóng, 1 = vừa, 2 = điềm (khớp thứ tự LIVE_BANK).
export function toneFor(stats){
 const score=stats.aggressive*0.6+stats.acting*0.2-stats.firm*0.2;
 if(score>=50)return 0;
 if(score<=25)return 2;
 return 1;
}

// Quyết định một lượt nói của bot. ctx: {prev: {loginId,label}|null, target: id|'', prevTrust}
// Trả {label, vars} — label khớp LIVE_BANK.
export function decideTalk(profile,ctx={},rnd=Math.random){
 const s=profile.stats,roll=rnd();
 const prev=ctx.prev,target=ctx.target||'';
 // Đồng tình/phản bác câu trước: Cả tin dễ đồng tình; Tin cậy của người nói trước làm tăng xác suất đồng tình.
 if(prev&&roll<.35){
  const agreeChance=clamp(.35+(s.gullible-50)/200+((ctx.prevTrust??50)-50)/200,.1,.9);
  return {label:rnd()<agreeChance?'agree':'disagree',vars:{s:ctx.prevSeat||'bạn'}};
 }
 // Nghi ngờ mục tiêu: Hung hăng và Diễn xuất đẩy lên, Thông minh và Cả tin kéo xuống.
 const accuseChance=clamp(.25+(s.aggressive-50)/250+(s.acting-50)/500-(s.smart-50)/500-(s.gullible-50)/800,.1,.75);
 if(target&&roll<.8){
  if(rnd()<accuseChance)return {label:'accuse',vars:{t:target}};
  return {label:rnd()<.2?'defend_other':'filler',vars:{t:target}};
 }
 // Tự bảo vệ: Trung thực và Vững lập trường giúp bot bình tĩnh biện minh.
 if(roll<.9)return {label:rnd()<(s.honest+s.firm)/200+.2?'defend_self':'filler',vars:{}};
 return {label:'filler',vars:{}};
}

// Cập nhật tin cậy ẩn sau khi một người bị treo. accusers: danh sách loginId đã tố cáo người đó.
// wasWolf: phe thật (chỉ dùng ở server, không lộ ra lời nói). Người tố đúng tăng tin cậy, sai giảm.
export function applyLynchOutcome(profiles,accusers,wasWolf){
 for(const id of accusers){
  const p=profiles[id];if(!p)continue;
  const right=!!wasWolf;
  p.trust=clamp(p.trust+(right?4:-6));
 }
 return profiles;
}

// Chỉ số hiển thị cuối ván (lộ tất cả 7 chỉ số).
export function revealStats(profile){
 return {loginId:profile.loginId,stats:{...profile.stats},trust:profile.trust};
}
