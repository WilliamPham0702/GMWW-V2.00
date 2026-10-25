# GMWW Arena 3D — Giai đoạn 10 (nghiên cứu)

## Đã triển khai
- Nhánh nghiên cứu kế thừa GĐ9; không thay đổi Production, 2D, IPA hoặc dữ liệu.
- Thư viện hoạt ảnh 9 nhóm: đũa phép, tiên tri soi xét, đầu sói linh hồn, khiên, hồi phục, tấn công, bỏ phiếu, trinh sát và nguyền rủa; ánh xạ hơn 30 tên/biến thể vai trò để dùng chung motion.
- Character 3D có đũa phép vẫy, đầu sói 3D bay từ người thi triển tới mục tiêu, mái vòm khiên ở mục tiêu, biểu cảm tay theo nhóm và giới hạn tối đa 5 mục tiêu.
- ID âm thanh theo từng nhóm để gắn với Thư viện Âm thanh khi có file được tải lên; **không tạo hoặc giả lập file audio không tồn tại**.
- Chỉ lấy thông tin role/action từ cue riêng do Core trả cho GM hợp lệ; viewer công khai không nhận metadata vai trò bí mật. Nếu Core chưa cung cấp roleId/actionId thì chỉ phát animation mặc định theo loại tác động, không đoán vai trò.
- Giảm chuyển động và tối ưu low-power; mesh 3D dùng hình học nhỏ, giải phóng GPU resource khi đóng cảnh.

## Chưa được coi là hoàn tất
- Cần kiểm toán toàn bộ catalog vai trò/artifact thực tế của GMWW và ghép chính xác từng hành động, không coi nhóm alias là danh sách đầy đủ.
- Cần tích hợp file audio thật vào thư viện và xác minh đồng bộ cue theo quyền.
- Cần kiểm thử tương tác nhiều client / Core thật và đánh giá pin/nhiệt trên iPhone thật. Chỉ yêu cầu nghiệm thu toàn bộ GĐ10 sau khi đạt các bước này.
- CI chỉ kiểm thử mã Stage10 và các phụ thuộc Stage8/9 cần thiết, không chạy kiểm thử 2D/OTA/IPA ngoài phạm vi.
