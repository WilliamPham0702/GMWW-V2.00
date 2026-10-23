# GMWW — DEMO giữ sáng màn hình iPhone (PR chờ nghiệm thu)

Ngày: 23/10/2026. Phạm vi: IPA native shell và runtime DEMO, không thay Cloudflare/Production.

## Nội dung thay đổi
- Trong DEMO đang chơi, IPA tắt tính năng Auto-Lock hệ thống bằng UIKit idle-timer API, nhưng không thay độ sáng màn hình.
- Trả lại Auto-Lock khi tạm dừng, DEMO kết thúc/lỗi, đổi phòng, thoát giao diện trận, app ra background, WebView tải lại hoặc gặp lỗi.
- Chỉ gửi lệnh khi trạng thái thay đổi và chỉ nhận lệnh từ main frame. Không polling, camera, Face ID, nhận diện ánh nhìn hay xử lý ảnh.
- IPA cũ hoặc trình duyệt Player Web không có cầu nối native thì giữ tự khóa theo iOS như trước.
- Không sửa luật game, server DEMO, database, phòng chơi, member/seat, audio hay Player Web.

## Kiểm thử và nghiệm thu
- Có kiểm thử Node cho chạy/tạm dừng/rời phòng/ẩn app/tải lại, tính tương thích với IPA cũ, và nhận lệnh iOS từ main frame.
- Chạy CI PR. Chỉ xác nhận Xcode build hoặc kiểm thử iPhone thật khi có kết quả thực tế; CI Node không thay thế nghiệm thu thiết bị.
- Khi được phê duyệt, cần IPA shell mới: bản cập nhật runtime OTA không thể tự điều khiển Auto-Lock ở IPA cũ.
- Kiểm thử iPhone: Chạy DEMO >30 giây không chạm -> màn hình vẫn sáng; tạm dừng -> màn hình tự khóa sau thời gian người dùng cài; tiếp tục -> giữ sáng; rời phòng, chuyển app ra nền, tắt DEMO và khởi động lại app -> khôi phục Auto-Lock.

## Tiết kiệm pin và an toàn phát hành
- Chỉ sử dụng idle timer mặc định UIKit, không tăng độ sáng, không bật camera/CPU polling. iPhone có thể hao pin nếu giữ màn hình sáng nhiều giờ; người dùng giảm độ sáng thủ công khi cần.
- Chưa merge vào main, không tạo IPA Production và không tự deploy. Chỉ merge sau CI SUCCESS và nghiệm thu của chủ dự án.
- Rollback: revert PR/sửa IPA ở bản phát hành tiếp theo; cài IPA đã nghiệm thu trước đó nếu cần. Không xóa dữ liệu, không thay đổi Cloudflare hay bất kỳ tài nguyên Production nào.
