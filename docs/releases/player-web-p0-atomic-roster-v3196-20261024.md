# GMWW V3.196 Player Web — hotfix P0 (24/10/2026)

## Thực trạng đã xác minh
- PR #436, #437 và #438 đã được merge trong khi Chrome/Edge E2E còn đỏ. Chốt `Deploy Production` theo Browser CI ở #437/438 đã chặn các lần deploy sau đó.
- Server lưu đủ Chrome và Edge nhưng Edge có lúc chỉ thấy một thành viên.
- Khi GM phát vai, Server trả về `role_delivery` và có lá Vai Trò, nhưng Player Web đôi khi vẫn ở lobby hoặc không cho mở lá.
- Nhiều yêu cầu tự di chuyển và `move/complete` (409) làm nhiễu luồng cập nhật; bước cài WebKit trong CI kéo dài nhưng đây không phải nguyên nhân duy nhất của lỗi game.

## Thay đổi trên nhánh hotfix
1. API `/api/rooms/:code/join` trả thêm **danh sách công khai đầy đủ** cùng phản hồi vào phòng, để người chơi thấy ngay cả đội thay vì chỉ thấy chính mình. Không chứa thông tin vai trò của người khác.
2. Player Web lấy roster đó ngay khi join, đồng thời chủ động đối chiếu trạng thái public room khi mới chỉ hiện một người. Khi room tiến pha sang `role_delivery`, đồng bộ pha từ Server ngay cả khi có WS movement chen ngang.
3. Ngừng di chuyển ngẫu nhiên khi đã phát Vai Trò; từ lúc đó Server cũng không nhận thêm move mới. Điều này giảm lượng request hoàn tất move 409 và tránh cạnh tranh giữa cập nhật di chuyển với cập nhật Vai Trò.
4. Kịch bản Chrome/Edge mô phỏng phát vai, nhận Artifact, đề cử, phiếu 👍/👎 và reload trong điều kiện nhân vật đứng yên để kiểm tra chính xác luồng đồng bộ; kiểm thử stress 30 người vẫn riêng.
5. Thêm hồi quy kiểm tra JavaScript sau ghép, snapshot public, pha phát vai và quy tắc ngừng di chuyển.
6. Khi phản hồi `/me` đã có Vai Trò/Artifact nhưng luồng áp dụng UI thông thường bị kẹt ở `lobby`, dùng cơ chế dự phòng có xác thực theo đúng tài khoản và phòng hiện tại để cập nhật `state.room`, Vai Trò, Artifact, hiển thị lá và chuyển giao diện ngay. Không phát dữ liệu cá nhân qua public roster.

## Điều kiện nghiệm thu / phát hành
- Cả Chrome và Edge hiện đủ thành viên không cần refresh và ngay sau join, kể cả qua lượt phát vai.
- Role và Artifact mở được ngay lần chạm đầu, phiếu đề cử/👍/👎 được gửi/đồng bộ.
- Reload/reconnect không mất vai, Artifact, người chơi hay lịch sử.
- Check Player Web Worker, Browser, Check P0 Chrome Edge Realtime, Check 30-Player Realtime, Backup và build IPA đều SUCCESS.
- Không tự merge, không triển khai Production khi CI còn đỏ hoặc chưa được nghiệm thu.

## Bảo toàn & rollback
Giữ dữ liệu Durable Object, phòng, vai trò, lịch sử, cấu hình, và bản IPA hiện có; không reset/di chuyển dữ liệu. Nếu cần rollback, sử dụng deployment trước đã xác minh thành công và bản commit tương ứng; không tự xóa dữ liệu. Đây là bản Server + Player Web, không sửa phần native.

## Bổ sung xử lý PR #440 ngày 24/10/2026
- Khắc phục bài E2E so khớp tên Bảo Vật có phân biệt chữ hoa/chữ thường; xác nhận đúng Bảo Vật riêng của Chrome/Edge thay vì so chữ hoa-cố định.
- Mang trở lại bản sửa đã xác minh từ PR #439: loại bỏ hai lời gọi `handleSeatSwapRequests(d?.swapRequests)` đã bị loại bỏ khỏi Player Web, tránh lỗi ReferenceError làm dừng luồng khôi phục/phát Vai.
- Yêu cầu kiểm thử riêng: join/roster 2 thành viên, phát/nhận/mở Role + Artifact, refresh/reconnect, cấm move mới sau phát vai, đề cử và 👍/👎 chỉ nếu luồng đồng bộ/ứng xử thay đổi.
- Không tự chạy kiểm thử hình nền, seat 30, animation nhân vật hay DEMO rules không liên quan để xác nhận bản sửa P0. Bộ kiểm thử release toàn diện, nếu cần, là cổng riêng trước Production.
- Chưa xác nhận nhánh cũ đã đồng bộ với `main` mới nhất. Không merge trước khi đối chiếu/rebase, CI đúng phạm vi SUCCESS và người dùng nghiệm thu.
