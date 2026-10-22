# GMWW V3.181 — Hotfix lớp ảnh nền Làng Ngày/Đêm (22/10/2026)

## Triệu chứng
Khi GM xuất bản ảnh bối cảnh mới, Player Web có thể hiển thị ảnh nhưng mất Character / vị trí Seat. GM báo cáo hiện tượng tương tự trên Server iPhone.

## Nguyên nhân xác nhận trong source
- `assets/village/village.css` có `.stage.custom-scene > * { position: relative }`, lấn át `.scene { position: absolute; inset:0 }` dẫn đến vùng camera/Character bị thu gọn hoặc lệch.
- `.stage.custom-scene::before` còn vẽ thêm **một bản sao ảnh mới**, trong khi pipeline mới của V3.180 đã vẽ ảnh trong `::after` và nền mặc định vẫn tồn tại bên dưới: không phải thay thế sạch.
- GM `#playWorld` vốn dùng CSS background-image, không đủ bằng chứng quy lỗi render Character GM riêng cho ảnh. Hotfix tăng bảo vệ `#playPlayerRing` trước các override.

## Thay đổi
- Player Web: bỏ rule ép child `position:relative` và lớp ảnh `::before` trùng; ảnh đã xuất bản chỉ dùng `::after` z-index 0; làm rỗng ảnh nền mặc định khi tùy chỉnh bật; bảo đảm camera `.scene` tuyệt đối z-index 2.
- GM: khóa `#playPlayerRing` là lớp tuyệt đối z-index 3 ở chế độ ảnh tùy chỉnh, giữ nguyên tọa độ/size/Character 40.
- Cache-bust CSS của hai phía trên iPhone, giữ phiên bản runtime V3.181 và IPA shell hiện hành; không sửa API, trạng thái phòng, Durable Objects, ván mẫu hoặc ảnh đã lưu.
- Tests: unit source contract và WebKit iPhone-sized 390×844, Ngày/Đêm, 30 Character placeholder, hit-test Player/GM, CI screenshot. **Đây chưa phải QA với 30 atlas Character thực và iPhone vật lý.**

## Cổng phát hành
1. Kiểm tra npm test, CI Player Web, WebKit, Worker và SHA-256 đều SUCCESS trên commit cuối.
2. Không merge trực tiếp hoặc đẩy Production trước khi đạt gate và được nghiệm thu.
3. Kiểm tra iPhone thật với ít nhất một nhân vật ở Sảnh, 8–30 người khi vào phòng, đổi Ngày/Đêm trên cả GM và Player Web; xác nhận Character vẫn di chuyển/chạm được, GM tương tác đống lửa, không có hai lớp ảnh.
4. Nếu lỗi, sử dụng chức năng **Cài đặt → Chủ Đề → Bối cảnh Làng → Khôi phục bản trước**, hoặc rollback Worker/OTA về deployment đã kiểm chứng. Khôi phục ảnh không xóa dữ liệu phòng.
