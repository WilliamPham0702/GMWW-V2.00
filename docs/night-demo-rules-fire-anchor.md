# Chờ phát hành — sửa luật đêm, DEMO và điểm đống lửa

- Các hành động gây chết trong lượt ban đêm được ghi nhận chờ xử lý; người bị tác động vẫn được hành động trong đêm. Đến sáng mới chuyển trạng thái chết. Giữ kiểm tra bất tử ban đêm, hạn mức dùng và hoàn tác.
- DEMO: Phù Thủy không dùng bình Giết đêm 1; từ đêm 2 giữ lựa chọn hợp lệ. Bảo Vệ ưu tiên bản thân nếu luật cho phép.
- Yêu tinh DEMO chỉ chọn Trái/Phải; lịch sử lấy người nhận vết cắn thực tế từ kết quả server.
- DEMO phát audio hành động theo mã hành động; chống phát lại kết quả soi do phản hồi lặp/đảo thứ tự. Dừng nguồn audio cũ khi phát nguồn mới, kể cả WebAudio và giọng đọc.
- Hồi sinh bị vô hiệu hóa khi chưa có người chết (hành động vai trò ban đêm và nút can thiệp GM).
- Menu GM có **Đặt vị trí đống lửa**: chạm chính giữa lửa trên hình đang dùng. Lưu tọa độ phần trăm riêng Ngày/Đêm, đồng bộ và lưu local cùng ảnh. Thay ảnh sẽ bỏ điểm cũ của ảnh đó; khôi phục mặc định bỏ cả hai điểm. Từ chối lưu nếu hình nền đã đổi trong lúc chọn.

## Kiểm tra

- Toàn bộ npm test và Worker dry-run; kiểm tra cú pháp, đồng nhất source/assembled app và phiên bản.
- Regression: chết chờ sáng; dawn lặp không nhân đôi; không tác động ván/đêm khác; miễn nhiễm; Bảo Vệ tự bảo vệ; chính sách Phù Thủy đêm 1; mục tiêu Yêu tinh; chống phát lại soi; lưu điểm đống lửa, thay ảnh và sửa trên revision cũ.
- Chưa kiểm thử audio và chạm chọn đống lửa trên iPhone thật. Chưa phát hành runtime/IPA và chưa triển khai Production.

## Nghiệm thu sau triển khai

1. Cho Phù Thủy giết Thợ Săn trước lượt Thợ Săn: Thợ Săn vẫn hành động; sáng mới chết.
2. DEMO qua đêm 1–2: kiểm tra bình Giết, bảo vệ, hướng dịch và người nhận trong lịch sử.
3. Bật audio trên iPhone: hành động phát đúng; kết quả Tiên Tri không chồng tiếng khi polling lại.
4. Không ai chết: Hồi Sinh không bấm được; sau khi có người chết: mở lại nếu còn lượt.
5. Với mỗi ảnh Ngày/Đêm: menu GM → Đặt vị trí đống lửa → chạm vào lửa; mở lại app và kiểm tra trên kích thước màn hình khác.

Rollback: revert commit của PR; không có migration phá hủy dữ liệu. Nếu rollback giữa đêm có pendingDeath, cần hoàn tất chuyển sáng trên bản mới trước để giải quyết các tác động đang chờ.
