# GMWW V3.180 — Bàn giao bối cảnh 2.5D Ngày/Đêm
## Tài nguyên đã thiết kế (chưa có trong GitHub/Production)
- GMWW_Village_25D_Server_Player_Assets.zip — file đã tạo trong cuộc trò chuyện
- gmww-approved-village-day.webp (941×1672, SHA256 a2fc272c3f72db8af2fada36c52e53307e6667d17ad8c236952bd3b1afcbdefe)
- gmww-approved-village-night.webp (941×1672, SHA256 a9c16f92b1c7a9ee9522340650b609b4a7f720fceaa733b50915737029429992)
- 30 Seat preview dùng đúng tọa độ Rectangle(30) và footprint 56×74px từ CSS GMWW; ảnh preview không phải ảnh Character thật.
## Điều kiện phát hành
- Không commit ảnh có nút hoặc chữ mockup vào nền. Lớp UI dùng các điều khiển HTML/CSS đã triển khai.
- Cần CI SUCCESS, backup, regression WebKit/Worker và phương án rollback.
- GM được xác thực chọn hai WebP trong Cài đặt > Chủ đề > Bối cảnh làng 2D > XUẤT BẢN.
- Khi có revision mới, GET /api/village-scene trả URL Ngày/Đêm, từng URL ảnh phải 200 + content-type ảnh. Player Web tự preload ảnh trước khi thay màn hình, tối đa chu kỳ 5s.
- Kiểm tra cùng lúc Server GM và Player Web trên iPhone; đủ 8–30 người, chuyển ngày/đêm, Seat, thao tác kéo, FPS/nhiệt máy và UI chạm.
- Nếu ảnh mới không đạt thì KHÔI PHỤC BẢN TRƯỚC, không xoá dữ liệu Durable Objects. Giữ nguyên IPA shell.
## Lưu ý
PR này triển khai cải thiện đồng bộ và camera, **không tự xuất bản dữ liệu ảnh mới** nếu chưa có phiên GM đã xác thực. Không tuyên bố ảnh mới đang ở Production khi chưa xác minh revision.
