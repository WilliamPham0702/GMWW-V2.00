// Live mode: ngân hàng câu thoại bot (3 giọng: nóng / vừa / điềm). {t}=ghế bị nhắc, {s}=người nói trước.
// Chỉ dùng thông tin công khai (số ghế, đề cử, phiếu); không bao giờ lộ vai.
export const LIVE_BANK={
"accuse": [
[
"{t}! Đừng tưởng tui không thấy ánh mắt đó!",
"Tui nghi {t}. Nghi từ đêm qua rồi, ông nói gì đi!",
"{t} nói ít quá, mà đã nói thì toàn né câu hỏi. Quá đáng nghi!",
"Ê {t}, sao nãy giờ im re vậy? Có tật giật mình hả?"
],
[
"Tui thấy {t} hơi lạ. Ai cũng sợ mà {t} lại bình tĩnh quá.",
"Nói thiệt nha, tui không tin {t} lắm.",
"Có ai thấy {t} cứ lảng chuyện không? Tui thấy rồi đó.",
"Tui chọn nghi {t}. Chưa chắc đúng, nhưng linh cảm nó cứ réo."
],
[
"Mình chỉ nói là… {t} có vài điểm chưa khớp thôi.",
"Tôi đề nghị cả làng để ý {t} một chút.",
"Chưa dám khẳng định, nhưng {t} là người tôi thấy cần hỏi lại.",
"Nếu phải chọn thì tôi chọn nghi {t}. Lý do thì để tôi nói sau."
]
],
"defend_self": [
[
"Cái gì?! Tui mà là Sói á? Tui còn sợ Sói hơn mấy người nữa đó!",
"Đổ oan cho tui hả? Được thôi, nhìn lại coi ai đang cố lái cả làng đi!",
"Ai nói tui là Sói bước ra đây! Dám không?!",
"Trời ơi, tui vô tội! Bắt nhầm là hối hận cả đời đó nha!"
],
[
"Khoan, tui không phải Sói. Nghe tui nói đã.",
"Tui hiểu mọi người nghi, nhưng tui thật sự là người tốt.",
"Đừng vội. Tui nghi người đang chỉ tay vào tui hơn đó.",
"Nếu tui là Sói thì tui đâu có ngồi đây cho mấy người nghi như vậy."
],
[
"Tôi hiểu sự nghi ngờ. Nhưng hãy nhìn lại những gì tôi đã nói từ đầu.",
"Cứ để tôi giải thích, đừng vội vote.",
"Tôi không phải Sói. Tôi chỉ nhắc mọi người đừng để bị dắt mũi.",
"Bình tĩnh nào. Một cái tên bị réo chưa phải là bằng chứng."
]
],
"defend_other": [
[
"Đừng đụng vào {t}! Tui đảm bảo {t} sạch!",
"Nghi {t} là sai rồi! Tui thấy {t} nói câu nào cũng hợp lý!",
"Ai treo {t} thì tui không cho yên đâu!"
],
[
"Tui thấy {t} không giống Sói đâu. Nghĩ lại đi.",
"Tui tin {t}. Từ đầu tới giờ {t} nói khá thật.",
"Khoan nghi {t}, còn nhiều người đáng nghi hơn."
],
[
"Theo tôi {t} chưa có gì đáng ngờ cả.",
"Tôi nghiêng về phía tin {t}, các bạn cân nhắc lại.",
"Nếu loại {t} thì chúng ta có thể đang giúp Sói đó."
]
],
"agree": [
[
"Đúng! Đúng luôn! Y chang tui nghĩ nè {s}!",
"{s} nói trúng tim đen rồi đó!"
],
[
"Ờ, {s} nói cũng có lý.",
"Tui đồng ý với {s}."
],
[
"Quan điểm của {s} có cơ sở. Tôi ghi nhận.",
"Tôi cũng nghĩ vậy, như {s}."
]
],
"disagree": [
[
"{s} nói sai bét! Nghe là thấy đang lái làng rồi!",
"Không đúng! {s} đừng có xuyên tạc!"
],
[
"Ơ, tui không đồng ý với {s} đâu.",
"{s} nghĩ vậy thì tui nghĩ ngược lại."
],
[
"Tôi e là {s} chưa đúng ở chỗ này.",
"Tôi thấy lập luận của {s} còn hở."
]
],
"death_react": [
[
"Không thể nào… {t} chết rồi?! Tụi nó dám!",
"{t}! Trời ơi {t}! Sói khốn nạn!",
"Máu… khắp nơi… {t} đi rồi, tui không chịu nổi!"
],
[
"Hết rồi… {t} không còn nữa. Đêm qua tui nghe tiếng động mà không dám ra.",
"Tội {t} quá. Phải tìm ra thằng nào làm chuyện này.",
"{t} chết… vậy là Sói ở ngay giữa chúng ta."
],
[
"{t} ra đi rồi. Hãy bình tĩnh và suy nghĩ kỹ.",
"Mất {t} là một tổn thất. Chúng ta phải cẩn trọng.",
"Đã có người ngã xuống. {t}… xin yên nghỉ."
]
],
"no_death": [
[
"Sáng ra mà không ai chết?! Có ai cứu hay Sói đang giỡn mặt tụi mình?!",
"Không ai chết? Hay lắm, Sói đang tính gì đây?"
],
[
"Yên bình quá… nhưng tui không tin là bình thường.",
"Ơ, không ai chết hả? Vậy là có người cứu được rồi."
],
[
"Đêm qua không ai tử vong. Có thể có người đã ra tay cứu.",
"Một đêm lặng lẽ. Chúng ta có thêm thời gian để suy xét."
]
],
"nominate": [
[
"Tui đề cử {t}! Lên giàn đi!",
"{t} lên giàn! Không bàn cãi!"
],
[
"Tui đề cử {t}.",
"Lá phiếu này của tui dành cho {t}."
],
[
"Tôi đề cử {t} lên giàn, để làng nghe lời biện minh."
]
],
"gallows_beg": [
[
"Đồ ngốc! Treo tui là các người thua đó! Tui KHÔNG PHẢI Sói!",
"Cứu tui! Làm ơn! Tui nói thật mà!"
],
[
"Tui đứng đây rồi. Mọi người nghĩ kỹ trước khi quyết.",
"Nếu tui là Sói tui đã không để lộ như vầy. Xin tha cho tui."
],
[
"Đây là giây phút quan trọng. Xin hãy bình tĩnh bỏ phiếu theo lương tâm."
]
],
"vote_kill": [
[
"Giết! Không còn gì để nói!",
"Giết đi! Tui chịu hết nổi rồi!"
],
[
"Tui bỏ phiếu giết. Xin lỗi.",
"Giết. Tui thấy hợp lý hơn cả."
],
[
"Tôi chọn giết. Đây là quyết định khó khăn."
]
],
"vote_save": [
[
"Tha! Tha cho nó! Tui tin nó!",
"Cứu! Đừng có giết oan!"
],
[
"Tui bỏ phiếu cứu. Chưa đủ bằng chứng.",
"Cứu thôi. Nhỡ sai thì sao."
],
[
"Tôi chọn cứu. Chưa đủ cơ sở để kết tội."
]
],
"filler": [
[
"Gấp quá, tui đang rối hết cả lên!",
"Ai đó nói gì đi chứ, im lặng thế này là tui càng sợ!",
"Nhìn mặt ai cũng như Sói hết trơn!"
],
[
"Hừm… để tui nghĩ coi.",
"Tui chưa chắc, mọi người nói tiếp đi.",
"Tình hình này khó đoán thiệt.",
"Tui đang quan sát từng người."
],
[
"Tôi đang cân nhắc.",
"Mọi thứ còn quá sớm để kết luận.",
"Hãy để ý lời nói và việc làm của từng người."
]
],
"lynched": [
[
"Các người sẽ hối hận! Tui vô tội, nhớ lấy lời tui!",
"Treo nhầm rồi! Rồi sẽ thấy, rồi sẽ thấy!"
],
[
"Thôi được, nếu cả làng đã quyết… nhưng đừng nói tui không cảnh báo.",
"Tui đi đây. Mong là mấy người chọn đúng."
],
[
"Tôi không oán trách ai. Mong làng tìm ra sự thật.",
"Hãy nhìn kỹ hơn nữa. Chúc may mắn."
]
]
};
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
export const liveTone=loginId=>hash(loginId)%3;
export function liveLine(label,loginId,vars={},rnd=Math.random){
 const rows=LIVE_BANK[label];if(!rows)return '';
 const tone=rows[liveTone(loginId)]||rows[1]||rows[0],text=tone[Math.floor(rnd()*tone.length)]||'';
 return text.replace(/\{(t|s)\}/g,(_,k)=>vars[k]??'');
}
