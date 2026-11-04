# GMWW — Bảo mật Thông cáo Làng trên Player Web (03/11/2026)

## Phạm vi phát hành
Worker/Player Web **duy nhất**, không thay đổi IPA, Runtime OTA, URL, Durable Objects, dữ liệu phòng hay lịch sử.

## Sửa lỗi
- Player Web tiếp tục hiển thị thông cáo khi người chơi bị đánh dấu, chọn đúng/sai, sống/chết.
- Không đưa **tên người thực hiện, danh tính Sát Thủ, vai trò ẩn, dấu 👍👎 của GM** vào thông cáo công khai.
- Bịt dữ liệu sự kiện phản hồi trên WebSocket công khai: chỉ còn ID sự kiện, người phản hồi và trạng thái đã trả lời; không phát tên vai/loại hành động/kết quả riêng lên socket.
- Phản hồi riêng qua API đã xác thực tiếp tục cho đúng người chơi; GM vẫn lưu sự kiện gốc phục vụ điều hành.

## Kiểm thử / nghiệm thu
- Chạy `tests/assassin-player-public-privacy-20261103.test.mjs` bằng dữ liệu tổng hợp, xác minh đủ ba kết quả đánh dấu/chọn đúng/chọn sai.
- Kiểm tra lại `tests/player-v3-village-status-daychat-20261102.test.mjs`, `tests/online-chat-authority.test.mjs`, quyền chat và thông báo hiển thị của người đã chết.
- GitHub required checks và Worker dry-run phải SUCCESS trên SHA phát hành; smoke Production xác minh đúng nguồn, không đụng phòng thật.
- Dùng tình huống giả lập có hai người chơi để bảo đảm người ngoài không thấy tên/role Sát Thủ từ thông cáo hoặc socket.

## Rollback
Nếu Production smoke FAIL, tự phục hồi Worker tới Cloudflare version 100% trước phát hành (deployment snapshot). Không rollback dữ liệu/IPA/Runtime. Giữ nguyên URL `https://gamemasoi.pages.dev/`.
