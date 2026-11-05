# GMWW – Nhóm Sói biến thể (2026-11-05)

## Thay đổi (chỉ Worker)
- Sói Quỷ (≤3 lần/ván) và Lang Huynh Đệ (khi là Sói duy nhất): Cắn Chuyển Hóa thay Sói Cắn chung; mục tiêu không chết, sang Phe Sói từ đêm sau, nhận thông báo riêng.
- Sói Con: chết thì đêm kế tiếp Bầy Sói Cắn hai người (một đêm).
- Sói Lạc Bầy: Đêm 1–2 không tham gia Cắn; từ Đêm 3 Cắn cùng đàn.
- Sói Lai: từ Đêm 5 thành Phe Dân, không còn Cắn cùng đàn.
- Sói Đá: Da Đá chặn 1 lần Sói Cắn gây chết (Treo Cổ không bị chặn).
- Sói Lửa: Sói duy nhất → Lửa Lan, người sát bên (GM chọn trái/phải) chết sáng 2 ngày sau; không hợp lệ thì hủy.

## Giới hạn đã biết
- Da Đá hiện chặn Sói Cắn; các tác động chết đêm khác chưa qua bộ lọc này.
- Lycan, Người Sói đã có từ trước (Tiên Tri soi), không đổi.

## Kiểm thử
- tests/wolf-variants-20261105.test.mjs: 7 PASS. Hồi quy liên quan: 255 PASS / 0 FAIL.

## Triển khai & rollback
- Worker-only deploy + smoke test. Rollback: deploy lại Worker phiên bản trước.
