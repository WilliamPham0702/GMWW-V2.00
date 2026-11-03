# GMWW PR #778 — Chốt phát hành Worker/Player Web

## Phạm vi và mục tiêu
- Kế thừa mã thông cáo PR #778, hồi quy PR #781 và lưu lịch sử PR #782; chỉ sửa thứ tự nhận diện CI trên main-push để không rơi vào bộ test 3D đã đóng băng.
- Xác minh nguyên tắc: **không cắt/xóa thông cáo công khai trong ván**, hai sự kiện Sát Thủ chọn và kết quả tồn tại độc lập; danh tính người đóng vai Sát Thủ vẫn bí mật.
- Loại dòng thông cáo rỗng khỏi chữ chạy 🎬, giữ toàn bộ thông cáo hợp lệ; đồng bộ đúng file bundle Player Web.
- **Worker/Player Web-only**. Không thay đổi IPA, Runtime OTA, tên miền, dữ liệu phòng, migration hay DNS.

## An toàn CI
1. Nhánh main-push phải so khớp **chính xác 6 file** và commit tổ tiên của PR #782 trước khi dùng focused CI.
2. Trường hợp không đúng phạm vi / đổi Runtime, 3D, native phải fail-closed về full test.
3. Check Player Web Worker, CI Policy Gate, V3 Focused CI + Worker Dry Run, V3 Release Gate SUCCESS trên HEAD PR và main.
4. Chỉ triển khai khi main HEAD đúng SHA qua luồng GMWW V3 Worker and Player Web Delivery.

## Nghiệm thu
- GitHub Actions xác nhận Worker deploy, API health và JavaScript Player Web tải được.
- Với dữ liệu giả qua test: sau Sát Thủ đánh dấu, trả lời đúng/sai, tải lại: không mất thông cáo; không lộ `actorId`/`gmChoice` hoặc tên Sát Thủ.
- Sau phát hành, xác minh Cloudflare version mới và lịch sử version trước đó.

## Rollback
Ghi Worker version/deployment trước khi deploy và khôi phục đúng version đó nếu smoke thất bại. Bảo toàn DO dữ liệu thật và URL. Không thay đổi Runtime manifest (HTTP 503 nếu còn là lỗi khác).
