# GMWW Runtime V3.292 — đồng hồ lượt và gửi thoại có xác nhận

Ngày: 02/11/2026. Phạm vi: GM Runtime / Worker / Player Web, không thay IPA.

## Thay đổi
- Player Web hiển thị đồng hồ đếm ngược cho lượt hoạt động ban đêm bằng dữ liệu thời hạn do Server trả qua API /me có xác thực. Đồng bộ lệch đồng hồ, không lộ danh tính vai hay mục tiêu bí mật. Lượt ngày giữ đồng hồ cũ; khi Auto GM tạm dừng, đồng hồ hiển thị thời gian còn lại và ngừng đếm.
- GM và Player Web: bấm micro bắt đầu ghi; bấm nút dừng (hoặc hết 30 giây) chỉ tạo bản ghi nháp; **chỉ khi nhấn nút Send ↑** mới gửi lên kênh chat hiện tại. Nút Send trong lúc ghi cũng dừng ghi rồi gửi. Lỗi mạng giữ nháp để gửi lại.
- Không giữ micro hoạt động khi không ghi; thu hồi stream sau khi dừng ghi. Quyền microphone ở iOS WKWebView thuộc native; nếu iOS tiếp tục hỏi lại khi chuyển trang cần xử lý riêng WKUIDelegate và phát hành IPA mới, không thể bảo đảm bằng Runtime OTA này.
- Giữ nguyên phiên bản IPA 3.264, domain https://gamemasoi.pages.dev/, phòng, Durable Objects, tin nhắn, dữ liệu và lịch sử.

## Điều kiện phát hành
- CI Policy Gate và các required checks phải SUCCESS trên commit PR HEAD mới nhất. Kiểm tra node --test tests/online-turn-clock-voice-send-20261102.test.mjs, đồng bộ nguồn/bundle và Worker dry run.
- Worker + Player Web: smoke live phải thành công, xác minh phiên bản V3.292 trước công bố.
- Runtime OTA: file GMWW-Runtime-V3.292.gmwwupdate, SHA-256 và manifest cùng phiên bản trong GitHub Releases. Không công bố nếu chưa kiểm định.
- Nghiệm thu iPhone: đồng hồ ban đêm giảm đều khi có Auto GM; gửi thoại chỉ khi bấm ↑; nhận và phát lại từ GM/Player.

## Rollback
- Worker: dùng lại version Production được xác minh trước triển khai; không tác động DO và dữ liệu.
- Runtime: dùng Runtime V3.291 từ kho GitHub Releases nếu cơ chế rollback/phiên bản cho phép. Không gỡ IPA và không xóa phòng, cache hay tài khoản.