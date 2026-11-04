# GMWW — Player Web: dọn giao diện mẫu và kiểm soát hiển thị từ lúc tải trang (29/10/2026)

**Trạng thái:** ứng viên PR, chưa merge hoặc triển khai Production. Không đổi phiên bản IPA, dữ liệu game, Runtime OTA hay Durable Objects.

## Thay đổi
- Loại bỏ hai phòng và thông tin người chơi giả được nhúng sẵn trong màn hình Chọn Phòng Online. Danh sách phòng chỉ được dựng từ API sau khi đăng nhập.
- Xóa ảnh lá Vai Trò Tiên Tri demo và thông tin Vai Trò/Phe mẫu trong HTML. Giữ nguyên cấu trúc thẻ để dữ liệu riêng được hiển thị qua logic đã có.
- Thêm CSS chặn hiển thị ở HTML ban đầu trước first paint, có trạng thái tải trung tính. Chỉ mở màn hình sau khi ứng dụng xác định Login, Profile hoặc Làng thật.
- Tắt các thành phần game cũ (đầu trang, tab Làng/Vai Trò, thông báo trạng thái mẫu) ngay từ CSS đầu trang, không chờ script chạy.
- Đồng bộ bản đóng gói Player Web từ các phần mã nguồn chuẩn (7 phần).

## Kiểm thử đúng phạm vi
- `node --test tests/player-web-first-paint-cleanup.test.mjs`
- `node --test tests/player-web-online-village-20261028.test.mjs tests/player-web-remove-redundant-stage-tabs.test.mjs tests/player-web-receipt-patch-hotfix.test.mjs`
- `node .github/scripts/assemble-player-web.mjs --verify`
- `node --check src/index.js && node --check src/gmww-members-live.js`
- Build Worker `npx wrangler deploy --dry-run` (không phát hành).

## Kiểm tra khi nghiệm thu trên iPhone
1. Mở mới Player Web khi chưa đăng nhập → hiển thị Login thật, không chớp phòng/nhân vật mẫu.
2. Đăng nhập rồi Refresh liên tiếp → trung gian chỉ là trạng thái tải, sau đó về Làng đang chơi; không hiện màn hình vai trò giả.
3. Vào Phòng Online/DEMO, nhận vai trò và Artifact, chuyển trạng thái Đêm/Ngày → thẻ riêng chỉ xuất hiện đúng thời điểm.
4. Thoát tài khoản, tải lại → trả về Login; không hiển thị phòng hoặc thẻ của phiên trước.

## Rollback
Revert PR nếu phát hiện lỗi hiển thị; không cần migration dữ liệu hay khôi phục IPA.
