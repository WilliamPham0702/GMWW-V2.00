# GMWW – Lô lá bài hành động nhanh (2026-11-05)

## Thay đổi (chỉ Worker)
- Lực Sỹ: sói cắn lần đầu không chết (ghi nhận hành động).
- Cụ Già: chết khi đêm = số sói đầu game + 1.
- Người Loan Tin: vai trò được công bố cho cả làng.
- Con Bệnh / Bác Sỹ Điên: trạng thái bệnh/chữa được tính từ lịch sử.
- Con Quạ: +2 phiếu treo cổ cho mục tiêu.
- Bà Góa Đen: rời làng, không thể bị/được hành động trong ngày.
- Kẻ Báo Thù: lấy phe của mục tiêu (kể cả phe thứ ba).
- Hiệp Sĩ / Hoàng Tử: đâm ban ngày, sai thì tự chết.
- Học Việc: kế thừa Tiên Tri khi Tiên Tri chết.

## Kiểm thử
- tests/cards-quick-batch-20261105.test.mjs: PASS (13).
- Hồi quy liên quan: 126 PASS / 0 FAIL.

## Triển khai & rollback
- Worker-only deploy, smoke test sau deploy.
- Rollback: deploy lại phiên bản Worker trước đó.
