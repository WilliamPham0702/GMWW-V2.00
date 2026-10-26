# GMWW Runtime V3.238 — đồng bộ toàn bộ nút Menu GM (26/10/2026)

- **Tất cả box Menu GM** cùng kích thước, phông chữ và trạng thái như **Vai Trò / Artifact**. ON: chữ trắng in đậm, nền ngọc đậm và viền xanh nổi sáng; OFF: nền tối, chữ mờ, không phát sáng.
- Đổi nhãn cố định: **Menu, iCon, Người Chết, Đặt Menu, Đặt ⚖️, Rung**. Các nút Audio và Auto GM hiển thị tên ngắn cố định; Hồi Sinh, Giết, Thoát, Kết Thúc bỏ ký hiệu thừa để nhất quán.
- Các trạng thái bật/tắt lấy từ dữ liệu thực (menu trên/dưới, icon hành động, ẩn người chết, tên vai/artifact/người chơi, audio, rung, Auto GM); không thay tên nút mỗi khi đổi trạng thái. Nút Menu ON khi thanh đang hiển thị, OFF khi bị ẩn. Áp dụng cả Setup và Trong Trận.
- Các hành động một lần như **Đặt Menu, Đặt ⚖️, Thoát, Kết Thúc** chỉ có phản hồi khi nhấn; không gắn trạng thái ON giả sau khi thao tác.
- **Không thay đổi luật Core, Player Web, DO, dữ liệu, IPA hoặc gameplay.**
- **Kiểm thử:** nút GM, các trạng thái, bản app ghép sáu module, manifest SHA-256, CI đúng phạm vi, phát hành Production sau chốt thành công.
- **Rollback:** Runtime V3.237 đang ổn định, không ghi/xóa dữ liệu phòng và không đổi IPA.
