# GMWW — Thiết kế lại Lên Giàn (24/10/2026)

## Phạm vi
Áp dụng chung Core Online / Offline / DEMO, giữ nguyên dữ liệu, Runtime, IPA, Production. Không tự merge/deploy.

## UI
- Panel Lên Giàn ngang bằng menu trên, mở/thu gọn giống DEMO, nền trong suốt, không che Character.
- Danh sách chỉ người còn sống, sắp xếp đề cử giảm dần: tên, số đề cử (%), phiếu Cứu/Giết, Cấm đề cử, Cấm bỏ phiếu.
- Tự động / Thủ công dạng chọn thu gọn; nút Khôi phục chỉ reset phiên làm việc hợp lệ.
- Tự động: GM mở Đề cử / Bỏ phiếu; Player Web chỉ hiện lựa chọn đúng giai đoạn, đồng bộ realtime; thống kê số và tỷ lệ theo người chơi đủ điều kiện; áp dụng cấm và Artifact cấm vote.
- Thủ công: GM chọn người còn sống, chốt Giết / Cứu; không kích hoạt biểu quyết tự động trên Player Web.
- Kết luận sống/chết tuân theo Core hiện có, idempotent, ghi lịch sử và đồng bộ room; không thay luật chết vào sáng hôm sau đối với hiệu ứng đêm.
- Âm thanh: khai báo các đường dẫn tài nguyên cho kết luận / người sống / người chết, để chủ dự án upload sau; không tạo audio giả hoặc link bên ngoài.

## Quy trình kỹ thuật
1. Kiểm kê gallows hiện hữu và luồng Player Web + Worker, tái sử dụng API, không tạo Core thứ hai.
2. Sửa UI source và bundle đúng chuẩn build; Server chịu trách nhiệm phân quyền và kết quả.
3. Regression đúng phạm vi: tự động, thủ công, ban/cấm vote, artifact, realtime, reconnect, audio missing fallback, reset; phân biệt PASS/FAIL/CHƯA CHẠY.
4. PR với release notes tiếng Việt, CI, rollback; không merge hoặc deploy khi chưa nghiệm thu.
