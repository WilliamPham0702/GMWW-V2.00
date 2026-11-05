# GMWW – Kẻ Trộm (2026-11-05)

## Thay đổi (Worker + Player Web)
- Kẻ Trộm: từ Đêm 3, đúng lượt của mình, chọn 1 lá trong bộ bài vai trò (toàn bộ gói vai trò GM đã tải lên, trừ chính Kẻ Trộm) hoặc "Không đổi". Quyết định đúng 1 lần/ván.
- Đổi vai: nhận vai trò, phe, chức năng và điều kiện thắng của vai mới; thẻ riêng và ảnh chụp giao hàng cập nhật; nếu vai mới có chức năng đêm thì thức ngay sau lượt Kẻ Trộm; nếu là Sói thì vào Bầy Sói cắn.
- Lượt đã dùng của từng vai trò được giữ theo vai (khóa theo người chơi + vai trò).
- Player Web: bảng chọn vai trò cho Kẻ Trộm (endpoint `/api/rooms/:code/thief/choose`).
- Chặn: Kẻ Trộm bị đóng băng/chết/đuổi không chọn được.

## Điều kiện cần
- GM phải tải đủ gói vai trò (63 lá) lên phòng; vai nào chưa có gói thì không hiện trong bộ bài.

## Kiểm thử
- tests/thief-20261105.test.mjs: 4 PASS (gồm chạy phương thức Durable Object thật). Hồi quy liên quan: 246 PASS / 0 FAIL. Player Web assemble --verify: khớp.
- CHƯA CHẠY: thử trên iPhone/web thật, GM xem lựa chọn của Kẻ Trộm.

## Triển khai & rollback
- Worker-only deploy (Player Web phục vụ từ Worker) + smoke test. Rollback: deploy lại Worker phiên bản trước.
