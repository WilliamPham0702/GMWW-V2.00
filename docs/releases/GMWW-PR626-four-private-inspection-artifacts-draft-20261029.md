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

## Kiểm toán chốt phát hành — cập nhật 29/10/2026
- HEAD kiểm toán của `main`: `125ef56a04082bddf079d37460097360f6201ebb`, đã chuyển sang Runtime V3.275 trong khi nhánh PR #626 xuất phát từ Runtime V3.274. **Không được chép đè file Worker/GM ở PR lên main cũ hơn hoặc ghi đè release V3.274 đã tồn tại.**
- Workflow `Check RULE split planners (focused)`: SUCCESS, gồm unit GM/Player/DEMO/audio và Worker/SQLite E2E với private/reconnect/undo/human online; `CI Policy Gate`, `CI Stability Gate` và GitHub Preview SUCCESS ở commit `da66aeab94152f15e1c7e17664ecdd83c4df8101`.
- Workflow `Check Player Web Worker` vẫn FAIL vì suite rộng (nhiều kiểm tra lịch sử không tương ứng phạm vi bốn lá). GitHub-only Runtime OTA **bắt buộc** Check Player Web Worker chạy push trên đúng `main` SHA và đạt SUCCESS. Không bỏ test hay giả định cổng này đã đạt.
- CI tự động còn các lỗi do Drunk, Lên Giàn, năm icon, GM markers, trình duyệt và IPA ngoài phạm vi; yêu cầu xác minh nền `main` trước khi phân loại chính thức là lỗi có sẵn.
- **QUYẾT ĐỊNH: HOLD — CHƯA MERGE/DEPLOY/GITHUB RELEASE** cho đến khi đồng bộ main hiện tại, chứng minh CI liên quan chính xác bằng scoped guard fail-closed, có phiên bản Runtime mới chưa được phát hành và manifest/SHA-256 từ tệp thật.
- IPA shell phải giữ `NATIVE_SHELL_VERSION=3.264`; không chuyển tiếp cập nhật IPA dù build test tự kích hoạt. Dữ liệu Production giữ nguyên.
