# GMWW Arena 3D — GĐ19–21: đo hiệu năng thiết bị, phục hồi WebGL và kiểm thử dài phiên

Ngày: 25/10/2026. Thay đổi trên PR Draft #487; Worker STAGING và DO **riêng biệt**; không merge, deploy Production hoặc thay đổi Core gameplay, 2D, IPA, Runtime OTA, dữ liệu người chơi.

## GĐ19 — đo hiệu năng trực tiếp từ trình duyệt thiết bị
- Bổ sung bảng **📊 Đo hiệu năng iPhone** trên trang Arena 3D STAGING với nút Lấy kết quả, Sao chép báo cáo ẩn danh, Đo lại từ đầu.
- Tại thiết bị đang mở trang, thu thập tối đa 240 mẫu gần nhất: nhịp hình vẽ thực tế, khoảng thời gian giữa 2 khung, CPU xử lý việc vẽ, Draw Calls, Pixel Ratio, Character count, số lần mất/khôi phục WebGL.
- **Không đo được GPU render time chính xác, nhiệt độ máy, pin hao, độ trễ mạng qua bộ đo này.** Các trường nhiệt độ/pin được để null, không có bất kỳ giá trị bịa đặt hoặc suy luận nào.
- Dữ liệu chỉ tồn tại trong bộ nhớ tab; không gửi telemetry tới Worker hoặc dịch vụ thứ ba. Người dùng có thể tự sao chép JSON **không chứa** tên, mã phòng, token, vai trò, đích bí mật, URL hay dữ liệu tài khoản.

## GĐ20 — phục hồi đồ họa iPhone/Safari
- Khi trình duyệt phát tín hiệu `webglcontextlost`, tạm dừng dựng GPU, ghi nhận trạng thái và giữ nguyên Core/WebSocket và trạng thái phòng.
- Khi `webglcontextrestored`, yêu cầu vẽ lại cảnh trên renderer Three.js đã khôi phục tài nguyên; không reset ghế, vai, quyền GM hoặc lưu trữ phòng.
- Khi app vào nền/ra nền, loại bỏ khoảng dừng khỏi các số đo FPS để tránh đánh giá sai; đưa nhịp vẽ về trạng thái bình thường mà không can thiệp đồng bộ Core.

## GĐ21 — bằng chứng QA và CI
- Unit test GĐ19–21: thống kê phân vị, giới hạn mẫu trong bộ nhớ, chống báo cáo chứa dữ liệu riêng, cảnh ẩn, mất/khôi phục WebGL.
- Browser smoke Chrome + WebKit giả lập iPhone: 6–30 Character, bảng đo và số liệu chính xác theo renderer đang hoạt động, cùng các test Core/vai trò/Artifact liên quan từ GĐ16.
- CI/GitHub và phiên bản Worker STAGING chỉ ghi nhận **thành công sau khi thực sự xác minh kết quả workflow**; chưa thể kết luận iPhone thực sự mát hơn, tiết kiệm pin hơn hay đạt FPS mong muốn trước khi đo trên iPhone thật.
- Bảng đo hỗ trợ nghiệm thu iPhone vật lý nhưng **không tự động hoàn tất nghiệm thu máy thật**.

## Rollback
- Hoàn nguyên các commit GĐ19–21 trên PR Draft #487; hoặc phát hành lại phiên bản Worker STAGING GĐ18: `9dcd0697-06a1-4ebe-bf8e-73e82132ddab`.
- Production và dữ liệu phòng thật không bị sửa đổi. Không chạy kiểm thử game 2D, Chrome Player Card, Seat hoặc OTA/IPA vì không thuộc phạm vi thay đổi.
