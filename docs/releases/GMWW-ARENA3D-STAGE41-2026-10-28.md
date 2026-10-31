# GMWW Arena 3D – Giai đoạn 41 (28/10/2026)

## Nội dung cập nhật
- Player Arena 3D tự hạ mật độ điểm ảnh GPU xuống tối đa 0,85 khi có từ 20 nhân vật, thay vì tối đa 1,1 với phòng nhỏ.
- Chỉ thay đổi độ phân giải framebuffer khi danh sách nhân vật cập nhật, tránh gọi WebGL resize mỗi khung hình.
- Khi phòng giảm dưới 20 nhân vật, trở về mức tối đa 1,1; giữ nguyên điều khiển camera, WebSocket, Core, lá bài riêng tư và Player Web.
- Bổ sung kiểm thử phạm vi GĐ41: độ phân giải crowd, không tác động Core, không gọi GM API.

## Điều kiện phát hành
- Chỉ STAGING/nhánh nghiên cứu, không phát hành Production hoặc IPA.
- Chưa khẳng định mức tăng FPS/nhiệt độ trên iPhone thật; cần kiểm tra thực tế 6–30 người.
- Chỉ đưa lên Production sau khi đạt kiểm thử gameplay parity, CI bắt buộc, iPhone FPS/nhiệt và rollback.

## Rollback
- Hoàn nguyên thay đổi GĐ41 trên nhánh nghiên cứu về commit GĐ40 `5c2dfac4d3e50fa426bdbd9e5d5b87da0da03bc2` (không rollback main).
