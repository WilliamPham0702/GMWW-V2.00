# GMWW — PR #648: giảm vòng lặp đo FPS trên iPhone (31/10/2026)

## Thay đổi
- Trong chế độ thông thường, Village/Player Web **không tạo vòng requestAnimationFrame 60Hz chỉ để đo FPS**. FPS telemetry là `null` khi chưa bật chẩn đoán, không bịa số.
- Chỉ bật đo FPS khi URL của Village có `gmwwPerf=1`; khi trang chạy nền sẽ tạm ngừng đo và chỉ tiếp tục khi quay lại.
- Vẫn gửi các số liệu giám sát hiện hữu theo chu kỳ; không thay đổi hành động game, WebSocket, đồng bộ realtime, IPA, Oracle hoặc dữ liệu.
- Bổ sung kiểm thử FPS bật/tắt, ẩn/hiện trang, telemetry, cleanup và CI phân loại chính xác. Workflow candidate OTA V3.238 cũ không chạy đối với thay đổi chẩn đoán này.

## Giới hạn & nghiệm thu trước phát hành
- Đây là biện pháp loại bỏ tải CPU/đồ họa không cần thiết, **không phải kết quả đo nhiệt độ thực tế**.
- Cần xác minh trên iPhone Safari, Chrome, Edge: đăng nhập, đồng bộ tức thì, reconnect, đưa app ra nền/quay lại; so sánh độ nóng ở cùng điều kiện trước/sau bản vá.
- Chỉ merge khi required checks trên HEAD cuối cùng SUCCESS và nghiệm thu trên máy đạt; sau đó mới phát hành theo quy trình an toàn, có rollback và kiểm tra Production.
- Không tăng phiên bản Runtime OTA, không phát hành IPA mới trong PR này. Nếu phát hành có Runtime OTA, tạo phiên bản tiếp theo kèm SHA-256 thực tế.
