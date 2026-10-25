# GMWW – Ghi chú thay đổi PR #483 – Bộ ICON Hành Động chủ đề Biển
Ngày: 25/10/2026 · **Draft, chưa phát hành**

## Thay đổi đã triển khai trên nhánh PR
- Tích hợp chính xác **19 SVG thiết kế riêng** và **19 PNG RGBA 1024×1024** được nghiệm thu (đợt 1: 10; đợt 2: 9). Không cắt từ ảnh ghép, không dùng icon hệ thống iPhone.
- Lưu bản gốc ở `assets/action-icons/sea-v1/` và 19 PNG phục vụ giao diện GM cục bộ ở `server-game/current/action-icons/sea-v1/`.
- Giao diện **Thư viện → ICON** hiển thị hình PNG thật, tên và các actionId tương ứng; hỗ trợ tìm, thêm, sửa, xoá, tải ảnh riêng, khôi phục bộ mặc định, kiểm kê các action của Vai Trò/Artifact có trên thiết bị.
- Ánh xạ 26 actionId Vai Trò mặc định. Các chức năng tương đồng dùng chung ảnh; riêng Yêu Tinh có 2 icon hướng trái/phải gắn cùng `action_transfer_bite` nhưng phân biệt thao tác.
- Lưu hành động chọn nhiều người, chọn hướng và chọn lá bài theo đúng loại đích. Các icon chỉ là lớp trình bày, **không tự gửi lệnh lên Core hoặc thay đổi luật**.
- `manifest.json` ghi checksum SHA-256 riêng từng PNG/SVG và hành động được gán để kiểm soát thay đổi.
- Nâng phiên bản khóa dữ liệu Thư viện Icon thành V2, giữ icon tự tạo từ bản Draft cũ mà không thay thế ảnh đã nghiệm thu bằng vector thử nghiệm.

## Kiểm thử đúng phạm vi
Chạy duy nhất `node --test tests/action-icon-library.test.mjs`:
- Cú pháp module và liên kết HTML.
- Hiển thị 19 PNG thật, 19 SVG gốc; đối chiếu 19 bản PNG GM cục bộ với bản tài nguyên chính.
- 26 actionId mặc định đều có icon.
- Phân biệt chọn một/nhiều mục tiêu, trái/phải, chọn lá bài.
- Kiểm kê Artifact động giả lập, báo chức năng chưa có icon.
- Checksum SHA-256 tất cả PNG/SVG đối chiếu bản nghiệm thu.

**Chưa kiểm thử trên iPhone thật**; chưa thể xác minh toàn bộ Artifact người dùng đã nhập trên thiết bị thực. Không chạy các test Card/Seat/OTA/IPA không liên quan.

## Phạm vi an toàn và nghiệm thu tiếp theo
- PR **Draft**, không merge `main`, không deploy Production, không sửa dữ liệu phòng chơi.
- Việc đóng gói native và tải runtime cần kiểm thử trên iPhone trước khi quyết định phát hành.
- Kéo/thả icon tại đống lửa, snap, xác nhận hành động trên Core, công tắc Bật/Tắt trong menu GM là **giai đoạn chức năng tiếp theo**, chưa kích hoạt trong thay đổi tài nguyên này.
- Nếu cần rollback: bỏ commit PR #483 hoặc giữ chưa merge; Production không bị thay đổi.
