# GMWW V3.180 — Sửa giao diện Bối cảnh Làng trên IPA (2026-10-22)

## Đã thay đổi (chưa triển khai Production)
- Xóa nút **XEM TRƯỚC** khỏi mục **Cài đặt → Chủ Đề → Bối cảnh Làng 2D** trên GM Server/IPA.
- Gỡ sự kiện mở cửa sổ riêng `window.open(...sceneEditor=preview)` và truyền ảnh xem trước qua `postMessage`.
- Điều chỉnh cache-key `app.js` trên trang GM để thiết bị nhận mã mới khi phát hành.

## Giữ nguyên
- Chọn ảnh ban ngày và ảnh ban đêm.
- **XUẤT BẢN** đồng bộ GM Server ↔ Player Web.
- **KHÔI PHỤC BẢN TRƯỚC**, dữ liệu cũ và API xuất bản.
- Không thay đổi vị trí Character hoặc artwork đã xuất bản.

## Điều kiện phát hành
- Merge và Production **chỉ sau khi toàn bộ CI SUCCESS**.
- Kiểm thử trên iPhone/IPA: không còn nút Xem trước; tải ảnh Ngày/Đêm và xuất bản được; Player Web đồng bộ; rollback hoạt động.
- Không xóa dữ liệu scene hiện có. Có thể rollback về commit trước thay đổi.

## GP2 — Thiết kế làng 2,5D (đề xuất riêng, chưa có trong PR này)
- Thiết kế lại ảnh Ngày/Đêm với cùng hình học; giảm bầu trời, tăng diện tích mặt đất dành cho tương tác.
- Xây dựng tọa độ world-space và vùng đi được, điểm spawn đủ cho 30 Character; không giảm kích thước Character.
- Định vị GM theo anchor đống lửa trong metadata của scene, không theo tâm bitmap.
- Player Web và GM Server sử dụng chung tọa độ, collider/pathfinding, cách xếp lớp y-sort, và bố trí responsive trên iPhone.
- Test riêng trước khi hợp nhất: 30 Character, kéo thả/đi lại, không trùng nhau/ra biển/đè UI, cảnh Ngày/Đêm đồng bộ, không giật nóng máy.
