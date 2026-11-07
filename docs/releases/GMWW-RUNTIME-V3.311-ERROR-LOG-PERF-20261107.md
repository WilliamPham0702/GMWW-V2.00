# GMWW Runtime V3.311 — Nhật ký lỗi tập trung và đo hiệu năng GM

Ngày: 07/11/2026 · PR nguồn: #841 (nhật ký lỗi), #842 (đo hiệu năng)

## Thay đổi cho GM
- **Cài đặt → NHẬT KÝ LỖI:** xem lỗi JS/promise từ GM và Player Web, nút LÀM MỚI, SAO CHÉP BÁO LỖI (dán cho Claude/GPT), XÓA NHẬT KÝ.
- **Hiệu năng & Chống nóng:** hiển thị tốc độ vẽ, % khung trễ, số bộ đếm đang chạy, tác vụ nặng/phút và bộ nhớ JS (nếu thiết bị hỗ trợ); nút CHẾ ĐỘ NHẸ 1 CHẠM, bấm lại để khôi phục.

## Server / Player Web (đã deploy qua V3 Worker-only)
- Player Web tự báo lỗi về Server (dedupe, tối đa 5 lần/lượt tải). Server lưu 1 bản ghi giới hạn 40 mục trong Durable Object hiện có, không migration.

## An toàn dữ liệu
- Không đổi luật chơi, phòng, lịch sử, IPA hoặc URL. Không xóa dữ liệu.

## Rollback
- Quay về Runtime V3.310 (GitHub Release `gmww-runtime-v3.310`) và Worker version trước đó qua quy trình rollback V3.
