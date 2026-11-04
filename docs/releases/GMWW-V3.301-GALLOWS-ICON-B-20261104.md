# GMWW Runtime V3.301 — Icon đề cử Lên Giàn B (04/11/2026)

## Thay đổi
- Tích hợp mẫu B dây treo + cờ sói đỏ, nền trong suốt, không khung, thay 🚩 kéo-thả đề cử trên Player Web.
- GM Server dùng cùng biểu tượng ở nút **MỞ ĐỀ CỬ**.
- Giữ nguyên vùng chạm kéo 48px (icon 36px), snap vào nhân vật, xác nhận OK, Khôi Phục và tất cả quyền/luật đề cử, phiếu, trạng thái sống-chết.
- Nâng phiên bản Runtime từ 3.300 lên 3.301 để đảm bảo gói .gmwwupdate mới có checksum riêng, không ghi đè V3.300.

## Quy trình phát hành
- Kiểm tra GitHub Actions required CI trên HEAD mới nhất trước merge.
- Đóng gói .gmwwupdate, xác minh SHA-256, phát hành GitHub Releases với tag `gmww-runtime-v3.301` mới; giữ nguyên tag và dữ liệu của 3.300.
- Xác minh Worker/Player Web Production và nghiệm thu trên iPhone. **Không thay IPA/native, URL, Cloudflare A/B hoặc dữ liệu thật**.

## Rollback
- Nếu lỗi, chuyển Worker về phiên bản đã xác minh ngay trước deploy, giữ nguyên Durable Object/room/history.
- Với Runtime client, sử dụng bản .gmwwupdate V3.300 đã phát hành nếu chính sách chống rollback của client cho phép; trường hợp không cho phép, tạo bản sửa mang số phiên bản lớn hơn thay vì ghi đè/xóa bản phát hành cũ.
