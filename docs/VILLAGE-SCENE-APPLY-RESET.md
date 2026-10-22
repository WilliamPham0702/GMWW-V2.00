# GMWW — Đơn giản hóa thao tác hình nền Làng Ngày/Đêm

Trạng thái: thay đổi trên nhánh PR, **chưa phát hành Production/IPA**.

## Thay đổi
- Cài đặt > Chủ đề > Bối cảnh Làng: bỏ **XEM TRƯỚC** vì iPhone IPA không hỗ trợ popup.
- Đổi **XUẤT BẢN** thành **ÁP DỤNG**. Có thể cập nhật ảnh Ngày, ảnh Đêm hoặc cả hai; ảnh không chọn vẫn giữ nguyên.
- Đổi **KHÔI PHỤC BẢN TRƯỚC** thành **KHÔI PHỤC MẶC ĐỊNH**: đưa cả Ngày/Đêm về bối cảnh có sẵn trong runtime, không phụ thuộc lịch sử.
- Giao diện không hiển thị revision. Bộ đếm revision nội bộ vẫn tăng để làm mới cache và đồng bộ Player Web.
- Cloudflare Durable Object chỉ giữ tối đa **2 ảnh tùy chỉnh đang sử dụng** sau khi ÁP DỤNG thành công. Dọn dữ liệu ảnh của các lần ÁP DỤNG trước và xóa metadata lịch sử; không động tới dữ liệu phòng, nhân vật, seat, vai trò.
- Sau khi khôi phục mặc định, xóa ảnh tùy chỉnh không còn cần thiết. Các bản ảnh Làng gốc trong GitHub/Runtime vẫn được giữ nguyên.

## Tương thích, kiểm thử & phát hành
- API GET /api/village-scene và /api/village-scene/image/:phase giữ nguyên cấu trúc. Chỉ GM được quyền gọi PUT /api/gm/village-scene và POST /api/gm/village-scene/reset.
- API rollback cũ trả 409 USE_RESET_TO_DEFAULT; OTA GM mới phải triển khai đồng bộ với Worker mới.
- Kiểm thử: chọn 2 ảnh > ÁP DỤNG; chỉ thay Ngày hoặc Đêm; thay liên tiếp; về mặc định; áp dụng lại; kiểm tra Web Player chuyển Ngày/Đêm, không phủ Character, 6–30 seat và không mất dữ liệu ván.
- Chỉ xét merge và Production khi CI SUCCESS và nghiệm thu trên iPhone/Player Web. Có rollback bằng revert code/Worker, giữ snapshot dữ liệu nếu cần.
