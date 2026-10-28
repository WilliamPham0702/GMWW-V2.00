# GMWW Runtime OTA V3.266 – Online Chat theo lượt và audio hệ thống (28/10/2026)

## Đã thay đổi trên nhánh tính năng
- Chế độ Online sử dụng Chat văn bản trên Player Web và giao diện quản lý của GM, không thêm dịch vụ Chat thứ ba.
- Chat Ban Ngày: người còn sống, không bị đuổi hoặc cấm Chat, có thể gửi tin cho toàn Làng; người bị chặn vẫn có thể xem nội dung công khai.
- Chat Ban Đêm: chỉ các Vai Trò thực sự cùng nhóm trong *lượt hiện tại* nhận được nội dung riêng; màu tím phân biệt. Nhóm khác, người chết, bị đuổi không được nhận.
- Artifact Câm Lặng / trạng thái `mute` và cấm Chat của GM chặn quyền gửi ở cả hai giai đoạn, nhưng không đổi thời gian tác động của Artifact. Lệnh GM được lưu theo mã ván, không kéo sang ván tiếp theo.
- Tất cả nội dung bí mật chỉ đi qua API Player được xác thực; WebSocket chung chỉ thông báo `chat_tick`, tuyệt đối không phát nội dung tin nhắn bí mật.
- Player Web: nút Chat, nhập tin, tự đổi kênh, tiếp tục Chat sau reconnect, hiển thị tin an toàn qua `textContent`.
- GM: xem lịch sử Chat của ván và cấm/mở Chat từng người trong màn hình trận đấu.
- Audio hệ thống gọi tên Vai Trò / `Làng ơi dậy đi` trên Player Web dùng giọng đọc trình duyệt, có nút tắt riêng. GM tiếp tục dùng toàn bộ nguồn audio gọi Vai Trò và thông báo hiện có. Không xây gọi thoại giữa người chơi.
- Hạn chế chi phí: chỉ dùng Cloudflare Worker/DO hiện tại, không thêm LiveKit trong đợt này.

## Phạm vi không thay đổi
- Không đổi luật gốc, ghế, 2D/3D, dữ liệu trận cũ, IPA và dịch vụ Voice hai chiều.
- Hành động Vai Trò từ Player Web và hỗ trợ người chơi thật trong DEMO cần kiểm tra độc lập với nhánh RULE #584 / DEMO #587 trước khi có thể xác nhận Online trọn vẹn; PR này không tự tuyên bố hoàn tất các chức năng đó.

## Kiểm thử bắt buộc
- `tests/online-chat-authority.test.mjs`: Chat Ngày, Chat Sói, nhiều nhóm trong một lượt, mute/bị đuổi/chết/cấm GM, không phát tin nhắn riêng trên socket.
- `tests/audio-role-day-flow-20261027.test.mjs`: hệ thống audio GM gọi lượt / thông báo cũ không mất.
- Kiểm tra cú pháp Worker/Player, quyền riêng tư, đồng bộ nguồn GM/Player, Worker dry-run và CI chính thức.
- Chỉ phát hành khi CI liên quan + chốt bắt buộc đạt SUCCESS; thực hiện OTA SHA-256 và rollback trên đúng phiên bản Production.

## Rollback
- Bản gốc trước thay đổi: commit main `68b65011fc3aff327348ccd4898177ec23af71c1`.
- Khi phát hành OTA, giữ gói Runtime/manifest/sha256 của bản Production liền trước để quay lại mà không xóa Durable Object hoặc lịch sử ván.
- Bỏ thay đổi ở cấp Worker + Player Web + GM Runtime cùng một release nếu có lỗi quyền riêng tư Chat.
