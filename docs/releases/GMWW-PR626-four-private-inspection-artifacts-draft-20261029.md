# GHI CHÚ PHÁT HÀNH — GMWW 4 ARTIFACT SOI (DỰ THẢO, CHƯA PHÁT HÀNH)

**Ngày chuẩn bị:** 29/10/2026
**Nguồn:** [PR #626](https://github.com/WilliamPham0702/GMWW-V2.00/pull/626), trích từ [PR #584](https://github.com/WilliamPham0702/GMWW-V2.00/pull/584) qua tracker #623.
**Trạng thái:** Chưa merge; chưa phát hành Production hay Runtime OTA. Không được dùng tệp này để khẳng định đã cập nhật.

## Phạm vi chức năng
- **#09 Vạc Ma Thuật:** xác nhận chính xác một mục tiêu có là Dân Làng thông thường.
- **#24 Sương Hào Quang:** xác nhận một mục tiêu có thuộc Phe Ba hay không.
- **#29 Nhẫn Sự Thật:** kiểm tra một mục tiêu có thuộc Phe Sói không.
- **#39 Trượng Tiên Tri:** tiết lộ Vai Trò thật của một mục tiêu **chỉ cho chủ sở hữu/GM**, không phát tán trên trạng thái phòng.
- **GM:** nhận kết quả trực tiếp ở popup; phát audio kết quả ĐÚNG/KHÔNG ĐÚNG hoặc clip tên Vai Trò, không đọc tên vai nhầm.
- **Player Web:** nhận kết quả riêng tư qua API `/me` đã xác thực, hiển thị trên màn hình, tự ẩn sau 12 giây; reconnect có receipt; WS chỉ gửi tín hiệu chung không chứa kết quả.
- **DEMO:** tự xử lý lượt ngày qua executor thật, không tái sử dụng Artifact đã hết lượt, chỉ GM nhận đầy đủ manh mối của bot.
- **Undo:** GM hoàn tác lần soi gần nhất trong cùng Ngày, khôi phục quota/receipt/kết quả riêng tư, có kiểm soát tranh chấp và idempotency. Kết quả người đã đọc không thể bị xóa khỏi trí nhớ.

## Nghiệm thu trước khi phát hành
- Unit planner; thử thay đổi Role/Phe sau chuyển hóa/hoán đổi; thử UI Player/GM và audio; DEMO dùng đúng lượt.
- E2E HTTP/SQLite/Worker thật: quyền GM, chủ Artifact, đúng đáp án, quota, retry, private reconnect, không lộ public, undo, Player Online thực hiện lần mới sau undo.
- Kiểm tra đồng bộ đóng gói từ source GM/Player, syntax, CI Policy, Stability, Preview và mọi required checks trên commit chốt.

## Điều kiện phát hành và khôi phục
- Chỉ merge khi nghiệm thu đủ và required CI thành công, không có lỗi liên quan tồn đọng.
- Sau merge mới thực hiện Runtime OTA GitHub-first (Cloudflare fallback theo cấu hình hiện hành), không thay IPA, không sửa dữ liệu hoặc lịch sử.
- Phiên bản Runtime: **CHƯA PHÁT HÀNH**.
- SHA-256 file `.gmwwupdate`: **CHƯA CÓ — bắt buộc tính từ tệp phát hành thật và đối chiếu GitHub Release trước khi công bố**.
- Rollback: giữ SHA merge/manifest trước khi phát hành, xác minh khả năng quay lại Runtime cũ; nếu Worker cần hoàn tác, revert commit phát hành theo CI, không xóa dữ liệu.
