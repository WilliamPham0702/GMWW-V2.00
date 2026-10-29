# Player Web Background Performance Design

## Intent

Giảm công việc nền và nhiệt trên iPhone khi GMWW đang mở nhưng không hiển thị, đồng thời giữ nguyên giao diện, luật game, dữ liệu, WebSocket và khả năng đồng bộ khi người chơi quay lại.

## Approach

Áp dụng cơ chế theo trạng thái hiển thị tại ba điểm đã xác minh: bộ đo hiệu năng của Làng, đồng bộ ảnh nền Làng và các nhịp presence/update của Player Web. Các nhịp nền bỏ qua công việc khi `document.hidden`; bộ đo FPS dừng `requestAnimationFrame` và tiếp tục khi trang hiện lại. Không đổi chất lượng ảnh, animation khi trang đang hiện, API, Durable Objects, IPA hoặc Runtime OTA.

## Alternatives considered

- Giảm cố định FPS/hiệu ứng: tiết kiệm nhiều hơn nhưng làm giảm chất lượng khi chơi, không chọn.
- Viết lại renderer: rủi ro hồi quy lớn và vượt phạm vi tối ưu nhanh, không chọn.
- Tạm dừng theo trạng thái hiển thị: tác động nhỏ, đo được, bảo toàn trải nghiệm; được chọn.

## Verification

Kiểm thử đúng phạm vi: bộ đo FPS dừng/tiếp tục theo visibility, các poll nền không gọi mạng khi ẩn, bundle Player Web được tái tạo đúng nguồn và JavaScript hợp lệ.
