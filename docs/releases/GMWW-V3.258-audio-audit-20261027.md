# GMWW Runtime V3.258 — Kiểm toán và sửa liên kết Audio chuẩn ID
Ngày 27/10/2026. Phạm vi chỉ GM Runtime OTA; giữ Player Web, Core, dữ liệu Durable Objects, các phòng và IPA.
- Chọn file âm thanh theo đúng category/target ID, không đoán theo tên trùng và metadata fileName.
- Duy trì ID của các clip GM từng nạp trong IndexedDB; xử lý file cũ đã decode trễ và điều chỉnh audio Phù Thuỷ Già (legacy source-18).
- Thư viện đối chiếu file thực, URL chưa thử, file thiếu. Không gắn cờ đủ chỉ vì có tên file.
- Chỉ đọc tên Vai Trò khi có mốc cắt được GM xác định; nếu chưa có mốc, không đọc nhầm 5 giây audio.
- Đêm → Ngày: Làng ơi dậy đi → số người chết → thông cáo tác động; “Ngày dài” chỉ ở sự kiện mở Chọn/Đề cử.
- Đọc kết quả Sát Thủ Player Web một lần sau khi có kết quả, không cắt ngang thông cáo sáng.
- Đồng hồ chạy tới 30 giây/Hết giờ, kể cả GM thủ công; tạm dừng thì không phát.
- Bỏ phiếu: công bố tổng Cứu/Giết, sau đó đúng Chốt Sống/Chết.
- Audio còn thiếu file trên iPhone thực cần nạp đúng file; không tự khẳng định đã có bộ âm thanh gốc.
- CI phạm vi Audio riêng; Worker CI cùng SHA; kiểm thử cú pháp, 6-part app, đồng bộ version, OTA SHA-256.
- Rollback: deployment V3.257 trước đó nếu lỗi, không thay dữ liệu phòng/lịch sử/người chơi; giữ IPA.
