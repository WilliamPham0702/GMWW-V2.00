# GMWW P0 Player Web - sửa pha Phát Vai và CI nhanh (24/10/2026)

## Vì sao cần cập nhật
- PR #436 từng được merge/Production deploy khi Browser CI chưa SUCCESS.
- PR #437 sửa chốt phát hành, đã được merge, Production deploy bị chặn khi Browser CI FAIL.
- Kết quả CI Browser sau #437: Chrome/Edge lên phòng và cả hai Character hiện đầy đủ; khi GM phát vai trong lúc trình duyệt đang mở, nút Role vẫn bị ẩn sau 20–25 giây.

## Thay đổi ứng dụng
- Sự kiện WebSocket **di chuyển nhân vật** không được tính là một bản cập nhật pha phòng. Trước đó, khi nhân vật liên tục di chuyển, các phản hồi /me và polling bị xem là cũ dù chứa pha `role_delivery`.
- Giữ hàng rào chống phản hồi cũ ghi đè trạng thái đã xác nhận; đồng thời chấp nhận trạng thái tiến về phía trước cho cùng `matchId` (`lobby -> role_delivery -> running -> ended`). Không cho hồi quy pha `running -> role_delivery`.
- Bổ sung kiểm tra nhận lá bài qua `/me` độc lập từ nhịp GM-presence và nhịp room khi trang đang ở lobby hoặc Role chưa nhận, phòng trường hợp WebSocket bị nghẽn bởi các sự kiện di chuyển. Chỉ truy vấn dữ liệu riêng bằng session đã được xác thực, không đưa vai trò vào roster công khai.
- Bổ sung kiểm thử Node và CI trình duyệt Chrome/Edge theo luồng mở sẵn hai trang, GM phát vai, lá mở lần đầu, đề cử/vote, refresh. Khi nhận vai thất bại ghi lại `/me` Server và trạng thái UI.

## Điều kiện nghiệm thu trước khi merge
1. Hai người và thử tối thiểu 6–30 người: Chrome/Edge thấy cùng danh sách trên Server, không cần refresh.
2. GM phát vai, Player Web mở Role & Artifact ngay lần đầu, không bị ẩn.
3. GM mở đề cử, người chơi chọn được; khi mở bỏ phiếu tự động 👍/👎, Server đếm và Player Web thấy kết quả.
4. Sau refresh/mất mạng, giữ vai, Artifact, roster và pha.
5. Worker, backup, Browser Chrome/Edge/WebKit, CI realtime và build IPA SUCCESS; có link log và ảnh bằng chứng.

## An toàn dữ liệu và rollback
Thay đổi chỉ trong Worker Player Web JS runtime và hệ thống kiểm thử; không thay đổi schema, role assignments, luật game, dữ liệu phòng, lịch sử, IPA Native. PR không được tự merge hoặc deploy Production. Giữ chốt Browser CI đồng SHA trong `.github/workflows/deploy-production.yml`.
