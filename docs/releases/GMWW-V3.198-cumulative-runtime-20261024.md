# GMWW Runtime V3.198 — ứng viên phát hành (24/10/2026)

**TRẠNG THÁI:** Chỉ chuẩn bị trên nhánh riêng; không merge main, không deploy Production, không xuất IPA.

## Các thay đổi từ sau phiên bản V3.197

- **PR #443**: Sửa kết quả ván cũ tự xuất hiện khi chọn lại phòng và Phát Vai; lịch sử ván cũ vẫn được giữ.
- **PR #445**: Gắn menu GM và vùng chạm theo vị trí đống lửa đúng của từng nền Ngày/Đêm.
- **PR #447**: Thêm giao diện DỌN RÁC SERVER có số liệu kiểm toán; không xóa tài nguyên chưa đối chiếu.
- **PR #449** (thay thế PR #440 không merge): Trả roster công khai đầy đủ, chặn di chuyển tự động lúc phát vai, phục hồi nhận/mở lá Vai Trò và Artifact trên Chrome/Edge; giữ các sửa đổi PR #439.
- **PR #446/#448/#450**: Quy tắc chạy test đúng lỗi và phạm vi thay đổi; Production giữ đầy đủ cổng an toàn.

## Manifest OTA và xác minh an toàn

- Runtime **V3.198**, native shell vẫn **V3.110**; chỉ OTA, không cần cài đặt lại IPA.
- Không tự gán giá trị SHA-256. Dùng `prepare-update-channel.mjs runtime` trên CI từ source và bộ ảnh chuẩn đã cố định SHA-256, sau đó đọc từng file đối chiếu `sha256` trong `manifest.runtime.files`.
- Xuất hai bản manifest ứng viên cùng báo cáo SHA-256 thành GitHub Actions artifact **GMWW-V3.198-OTA-CANDIDATE-SHA256-NO-DEPLOY**.
- Chặn việc phát hành thêm byte Runtime mới dưới **cùng phiên bản** bằng so sánh danh mục hash ứng viên với manifest đang chạy ở Production, không chỉ dựa trên file thuộc commit merge cuối.
- Repository `assets/updates/latest.json` là đầu vào cũ cho build và được tạo lại tại CI/release; không thay manifest trong Git khi chưa có byte gốc và SHA-256 thực.

## Kiểm thử đúng phạm vi

- Phiên bản đồng bộ và shell giữ nguyên;
- Regression OTA cùng phiên bản khác byte, tích lũy qua nhiều PR merge, so sánh đúng bản kê SHA-256;
- Sinh manifest và kiểm tra tất cả đường dẫn, SHA-256, file bắt buộc, metadata;
- Để nguyên bộ test toàn diện trên main trước Production; không chạy riêng những bài 30 seat, rule DEMO, hình nền để nghiệm thu task phát hành.

## Bảo vệ dữ liệu, rollback

Không thay schema DO, không đụng phòng chơi, lịch sử, Seat, tài khoản, Artifact hoặc ảnh Production. Khi chưa merge: đóng PR hoặc revert nhánh ứng viên. Khi triển khai sau khi được người dùng duyệt: lưu bản Worker deployment cũ để có thể rollback **cả Worker và OTA manifest/assets** về phiên bản hợp lệ V3.197, giữ nguyên dữ liệu; không phát hành gói thiếu checksum.

**Chờ phê duyệt riêng** sau khi CI và bằng chứng SHA-256 thành công.