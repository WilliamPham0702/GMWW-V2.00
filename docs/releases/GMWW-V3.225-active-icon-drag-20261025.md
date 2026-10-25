# GMWW Runtime V3.225 – Sửa icon hành động trong trận (25/10/2026)

## Lỗi trước khi sửa
- Thư viện 49 icon đã có nhưng trên iPhone icon có thể không xuất hiện tại đống lửa: file thư viện nạp sau GM app, bản cấu hình V5 trên iPhone có thể thiếu icon mặc định; khi GM đang đồng bộ/đang xử lý, thanh icon bị ẩn hoàn toàn.
- Vị trí icon không có fallback khi vùng đống lửa chưa tính kích thước hoặc Safari đổi viewport; drag xác nhận mục tiêu có thể lấy mục tiêu cũ thay vì nơi thả cuối.
- Hành động không mục tiêu và hướng Yêu Tinh cần tiếp tục tuân theo cơ chế Core đặc thù.

## Nội dung sửa
- Nạp `action-icon-library.js` **trước** `app.js` trong WKWebView. Thêm tín hiệu sẵn sàng để dựng lại dock khi thư viện tải xong.
- Khi dữ liệu Icon V5 lưu cục bộ cũ thiếu một bản ghi, **chỉ khi không có icon tuỳ chỉnh khớp** mới tra cứu các ánh xạ mặc định đã được kiểm toán; không thay đổi dữ liệu đã lưu.
- Icon hành động hợp lệ xuất hiện tại đống lửa khi trận đang chạy. Đang gửi/đồng bộ Server thì nút mờ và không thể thao tác, **không tự biến mất**. Không hiện icon cho chức năng bị khóa bởi Core hoặc đã hết lượt.
- Neo dock theo 🔥 hiện hành và giới hạn trong viewport iPhone; có vị trí dự phòng nếu đang tái dựng giao diện; tăng lớp nổi để không bị HUD che.
- Kéo thả: tính mục tiêu từ **tọa độ pointerup cuối cùng**, chỉ chốt khi `targetAllowed` của Core trả về hợp lệ; hành động nhiều mục tiêu theo `targetCount`. Hành động không mục tiêu cần xác nhận GM. Yêu Tinh, Sát Thủ theo quy trình xác nhận đặc biệt đang có; không thay đổi luật chơi.
- Hủy kéo/xoá mục tiêu xử lý ghost và vùng hút. Giữ menu `ICON: BẬT/TẮT` trong GM và nút Khôi phục sẵn có.
- Không sửa Gameplay Core, Player Web, quyền, phòng chơi, dữ liệu Durable Objects hoặc IPA Native.

## Chốt kiểm thử
- `node --test tests/gmww-action-icons-in-battle.test.mjs` (mô phỏng pointer iPhone, 7/7 PASS).
- `node --test tests/action-icon-library.test.mjs tests/action-icon-card-clean.test.mjs` (độ toàn vẹn và ánh xạ icon).
- `node .github/scripts/assemble-gm-app.mjs --verify`, `node .github/scripts/verify-gmww-versions.mjs`.
- `node .github/scripts/prepare-update-channel.mjs runtime`, `node .github/scripts/verify-prepared-runtime.mjs 3.225`, xác minh SHA-256.
- Nghiệm thu iPhone thật chưa thể tự chứng minh chỉ bằng CI; sau deploy GM cần quan sát một lượt Role/Artifact trên iPhone.

## Phục hồi
Khôi phục Worker/OTA V3.224 từ manifest và SHA-256 phát hành trước đó. Không động chạm IPA, dữ liệu người chơi, phòng hoặc ván.
