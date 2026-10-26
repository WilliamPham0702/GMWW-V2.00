# GMWW Runtime V3.233 — Audio hệ thống + giao diện GM (26/10/2026)

## Sửa lỗi
- Khắc phục lỗi JavaScript iPhone `null is not an object (evaluating '$("[data-system-sound-slot]").forEach')`: dùng bộ chọn danh sách `$$` trong `renderAudio()`, giữ thao tác tải và thay thế Audio Ngày/Lên Giàn.
- Nút **QUẢN LÝ / CLOUDFLARE** chia hai dòng, cùng kích thước với các nút Kiểm tra & bảo trì khác, không tràn hàng.
- **VÁN GỢI Ý – ✨ AUTO VÁN – ＋ THÊM MỚI** trên cùng một hàng, 3 ô riêng, vẫn gợi ý theo số người và tạo ván cân bằng.
- Dock GM một hàng đúng thứ tự **Đồng hồ – 🏖️ – Hành động – ⛱️ – 🌈**. Hai icon không dùng chung cột, bỏ hiển thị Khôi phục ở dock (không xóa logic hoàn tác).
- Giữ nguyên Runtime V3.232 Health Check, icon lớn 80px xuất hiện tại lối vào làng V3.231, dữ liệu phòng, Server Core, Player Web, DO và IPA.

## Kiểm thử & phát hành
- Chỉ kiểm thử Audio shortcut, kích thước và nhãn Cloudflare, chọn ván, thứ tự dock, bundle, cú pháp, kiểm tra phiên bản/OTA SHA-256 và Worker deployment.
- Không chạy Chrome Card/Seat/DEMO/Arena3D/Native IPA ngoài phạm vi.
- Phát hành Runtime OTA V3.233 sau CI đúng phạm vi SUCCESS; xác minh SHA-256 từ bytes thực trên Production, giữ shell IPA hiện tại.

## Rollback
- Quay lại Runtime/Worker V3.232 nếu phát hiện hồi quy, bảo toàn phòng, dữ liệu người chơi, lịch sử và IPA. Không xóa DO.
