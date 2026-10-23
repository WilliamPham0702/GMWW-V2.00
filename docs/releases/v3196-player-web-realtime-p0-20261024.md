# GMWW V3.196 Player Web P0 hotfix — Chrome/Edge (24/10/2026)

## Báo lỗi người dùng, chưa nghiệm thu
1. Chrome và Edge đã nhận Vai Trò/Artifact nhưng chạm không mở cho đến khi refresh trang.
2. Danh sách người chơi trong phòng có lúc đủ thành viên, có lúc chỉ còn bản thân.
3. GM mở Đề Cử hoặc Bỏ Phiếu 👍/👎 nhưng Player Web không hiển thị được để tham gia.

## Nguyên nhân và xử lý
- **Luồng sự kiện Player Web:** các sự kiện dịch chuyển thành viên/room-state có thể đến theo thứ tự bất kỳ, dữ liệu players không đảm bảo là roster hoàn chỉnh. Chuyển sang bộ đồng bộ roster duy nhất, merge bản cập nhật từng người; chỉ chấp nhận thu nhỏ roster sau khi HTTP Server xác minh hai lần trùng khớp. Không xóa phiên người chơi vì một snapshot thiếu chính họ; đối chiếu /me có token trước khi quyết định mất thành viên.
- **Vai Trò/Artifact:** bỏ yêu cầu hai lần chạm vào lá bài nằm phía sau. Chạm lần đầu mở trực tiếp lá đã phát; giữ cửa sổ đọc khi Server chuyển bước phát vai → vào trận. Các yêu cầu lấy lá bài riêng dùng chung /me và khôi phục khi thiếu; không đổi quyền riêng tư.
- **Đề cử/bỏ phiếu:** Server gửi kèm pha phòng được xác nhận trong tất cả các broadcast `gallows_updated` (auto, GM, Player). Player cập nhật phòng và phiếu nguyên tử ngay từ WebSocket. Mỗi HTTP /me được gắn thời điểm bắt đầu; phản hồi cũ không ghi đè ballot mới hoặc trạng thái phòng mới. Nếu HTTP công khai đến trễ, vẫn làm mới dữ liệu riêng và ballot thay vì bỏ qua hoàn toàn.
- **Bảo toàn:** Không sửa bảng người chơi, Durable Objects, lịch sử trận, quyền truy cập Role/Artifact, luật Lên Giàn, hành động GM, cách tính phiếu, IPA native hay cơ chế phát hành Runtime OTA.

## Kiểm thử bắt buộc
- CI Worker, Browser Cards Chrome/Edge/WebKit, 30-player Realtime, Backup Integrity đạt SUCCESS.
- Khởi chạy 2 hoặc nhiều Chrome/Edge đồng thời: GM phát vai từ trạng thái chưa phát, mở lá bằng một lần chạm; đổi lượt không đóng viewer đang mở.
- 6–30 người: cập nhật di chuyển, reconnect và các snapshot đến trễ; roster không nhấp nháy/thu về một người; khi Leave/Kick thật thì danh sách chính xác sau xác minh.
- GM mở đề cử/bỏ phiếu auto: UI Player xuất hiện ngay không refresh, người chơi gửi phiếu bằng token, Server đếm và hai phía thấy kết quả 👍/👎.
- Kiểm thử ngắt/kết nối lại mạng, mở lại trang khi vai trò/phiếu đang có hiệu lực; không làm mất vai hay dữ liệu.

## Phát hành / rollback
- Chỉ triển khai sau CI SUCCESS và chủ dự án merge thủ công.
- Đây là hotfix **Worker + Player Web**. IPA V3.196 đang cài giữ nguyên; không yêu cầu tải hoặc cài IPA mới nếu mã native không thay đổi.
- Nếu có lỗi nghiêm trọng, rollback Worker/Player Web tới deployment đã xác minh. Không tự xóa phòng/Preview, không thay đổi phiên bản OTA hay data.
- Không đóng task cho đến khi người dùng xác nhận mục phát vai, đề cử/bỏ phiếu, refresh/reconnect trên trình duyệt thực tế.
