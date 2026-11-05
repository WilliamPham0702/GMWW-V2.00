# GMWW – Gói hành động toàn bộ lá Vai Trò (2026-11-05)

Gộp: Hiệp Sĩ/Du Côn (test), Sói Thợ Săn, Cupid, lô nhanh (Lực Sỹ, Cụ Già, Loan Tin, Quạ, Bà Góa Đen, Báo Thù, đâm ban ngày, Học Việc), Sói biến thể, đổi vai/thông tin, Treo Cổ, Già Làng/Trưởng Phái/Tà Đạo, Kẻ Trộm. Chi tiết từng nhóm: các file GMWW-*-20261105.md cùng thư mục.

## Loại triển khai
- Worker-only deploy (gồm Player Web phục vụ từ Worker). Không cần OTA Runtime.

## Kiểm thử
- Toàn bộ `node --test tests/*.test.mjs`: 2208 PASS, 2 FAIL (pr630-release-ci, v3186-local-village-cache – cũng FAIL trên main sạch), 3 TODO quarantine cũ.
- CHƯA CHẠY: thử tay trên web/iPhone (do chủ dự án), smoke sau deploy.

## Giới hạn đã biết
- Chưa có giao diện GM/Player cho: Sói Quỷ/Lang Huynh Đệ/Sói Lửa, Ti Hí (Sói phát hiện), Hồn Ma nhập từ, Thẩm Phán "phiên thứ hai".
- 31/44 Artifact chưa có executor (xem docs/audits/artifact-execution-audit-20261105.md).

## Smoke sau deploy
1. Tạo phòng thử, chia vai, qua Đêm 3 với Kẻ Trộm: chọn vai/"Không đổi".
2. Một ván nhanh: Sói Cắn → bình minh đúng người chết; Treo Cổ Kẻ Ngốc lần 1 không chết.

## Rollback
- Deploy lại Worker phiên bản trước đó (Cloudflare Versions → Rollback). Dữ liệu ván cũ không bị đổi cấu trúc.
