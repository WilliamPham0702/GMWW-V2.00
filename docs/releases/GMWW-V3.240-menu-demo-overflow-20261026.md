# GMWW Runtime V3.240 — sửa Menu GM bị kéo dài do DEMO (26/10/2026)

**Nguồn lỗi đã xác minh:** Trong màn Setup/Sảnh chờ, panel trạng thái DEMO bên trong Menu GM vẫn được CSS hiển thị khi Demo báo `Đã xác định phe thắng`. Vì nó bị nhét vào hàng lướt ngang của nút, text vỡ thành một cột dọc và menu cao bất thường.

## Thay đổi
- Panel thông báo DEMO cũ luôn được ẩn khỏi hàng nút GM dù mã JS đặt nó ở trạng thái mở. Các thông báo của DEMO và điều khiển 🐦‍🔥 độc lập vẫn giữ nguyên.
- Menu GM là **một hàng ngang**, chiều cao **78px** gồm tay nắm và nút **44px**; cuộn ngang nếu có nhiều nút, không cho chữ chia từng ký tự, không cho phần tử ngoài phạm vi làm cao/đè menu.
- Áp dụng cả Setup/Sảnh chờ và Vào Trận. Không đổi vị trí đống lửa, hành vi nhấn mở/chạm ngoài đóng, trạng thái ON/OFF và các icon đã duyệt.

## Phát hành
- Chỉ GM Runtime UI CSS, phiên bản/gói OTA. Không thay luật Core, Server API, Player Web, iOS IPA, dữ liệu, DO.
- Kiểm thử chỉ giao diện menu, đóng gói từ 6 module, phiên bản và OTA SHA-256; CI bắt buộc SUCCESS trước Production.
- **Rollback V3.239** giữ bản Cloudflare deployment trước phát hành và toàn bộ dữ liệu/IPA.
