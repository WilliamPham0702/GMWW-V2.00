# GMWW – Giao diện hành động còn thiếu (2026-11-05)

## Thay đổi (Worker + Player Web, không OTA)
- Sói Lửa: chọn hướng Lửa Lan (trái/phải) trên Player Web; server bắt buộc có hướng.
- Cô Bé Ti Hí: Bầy Sói thấy bảng "Phát hiện / Không phát hiện" khi có người hí mắt (quyết định đầu tiên là cuối cùng; không quyết định = không phát hiện).
- Hồn Ma: ô nhập đúng 1 từ trên Player Web khi đã chết (ban ngày); tự công bố ở Thông cáo Làng; nhắc tên người chơi bị chặn và mất quyền.
- Thẩm Phán: sau phiên Treo Cổ đầu 5 giây, server tự mở phiên thứ hai đầy đủ (không cần nút GM).
- Công bố công khai: Loan Tin, Lực Sỹ và Hồn Ma nay hiện trong Thông cáo Làng (trước đó mới ghi vào lịch sử, chưa hiển thị).
- Sói Quỷ / Lang Huynh Đệ: dùng bảng hành động Online sẵn có (chọn mục tiêu) — không cần giao diện mới.

## Kiểm thử
- tests/card-ui-20261105.test.mjs: 5 PASS (gồm Durable Object thật cho quyết định Ti Hí). Toàn bộ suite: xem PR.
- CHƯA CHẠY: thử tay trên web/iPhone.

## Triển khai & rollback
- Worker-only deploy + smoke. Rollback: Worker version trước (hiện tại b8ef229a-efb3-4963-b6f7-41c500db6f77).
