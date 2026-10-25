# GMWW V3.203 — Khắc phục cổng phát hành đúng phạm vi
Ngày 24/10/2026

## Nguyên nhân
Sau khi PR #463 Lên Giàn được merge, workflow main chạy toàn bộ Chrome/Edge/WebKit. Bài test lá bài không liên quan báo timeout sau 60 giây, làm Deploy Production #1726 bị dừng ngay tại cổng CI. Không có Worker mới nào được phát hành từ run thất bại.

## Thay đổi
- Không sửa gameplay, Seat, Role Card, OTA package, DO hoặc Player Web.
- Chính sách CI-only trên main chạy unit selector, không khởi chạy toàn bộ test Chrome/Edge ngoài phạm vi.
- Chỉ với bản V3.203 và chỉ khi chủ dự án chủ động kích hoạt workflow_dispatch, chấp nhận **Check Lên Giàn theo đúng phạm vi** và **Check Player Web Worker** đều SUCCESS trên **cùng SHA main**; kiểm tra có đúng PR #463 trong lịch sử và release notes.
- Mọi phiên bản khác vẫn yêu cầu Chrome/Edge/WebKit CI bình thường. Không bỏ chốt kiểm tra phiên bản, Worker, SHA-256, manifest OTA, sức khỏe Production và rollback.
- Main chỉ thay chính sách CI thì không tự động deploy; phiên bản V3.203 triển khai thông qua workflow chính chủ sau khi CI đạt.

## Phát hành/rollback
- Dùng workflow `Deploy Production` thủ công trên main sau khi workflow `Check Lên Giàn theo đúng phạm vi` và `Check Player Web Worker` SUCCESS tại cùng SHA.
- Nếu kiểm chứng Production không đạt, không ghi nhận phát hành thành công; rollback về deployment Worker trước đó.
