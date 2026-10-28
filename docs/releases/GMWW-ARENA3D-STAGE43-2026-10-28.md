# GMWW Arena 3D — GĐ43: Giảm tải GPU cho GM (28/10/2026)

## Nội dung cập nhật
- GM Arena 3D giới hạn độ phân giải dựng hình theo số lượng nhân vật: 6–12 giữ nguyên; 20 nhân vật tối đa 1,0; 24–30 tối đa 0,85, kể cả khi bật chế độ Mượt.
- Không thay đổi Vai Trò, Artifact, Core, Player Web, quyền GM, việc đồng bộ WebSocket, số Seat, hiệu ứng chức năng, animation hoặc các điều kiện thắng.
- Kiểm thử mới GĐ43: chính sách framebuffer 6/12/20/24/30 và giữ nguyên các bộ phận quan trọng. Mở rộng kiểm thử Chromium và WebKit thật ở mức 20 và 30 người trên Worker STAGING.
- GĐ41–42 trước đó: Player 3D 30 người đã xác minh framebuffer 0,85; kiểm thử full Core reconnect và kết thúc đạt trên STAGING.

## Xác minh và giới hạn
- CI và browser GĐ43 chỉ được xác nhận SUCCESS khi workflow chạy xong; không xem commit thành kết quả kiểm thử.
- Firefox/Chrome headless và WebKit giả lập không đại diện cho hiệu suất hoặc nhiệt độ/pin của iPhone vật lý; cần nghiệm thu riêng trước Production.
- Phạm vi: STAGING riêng; không triển khai Runtime OTA Production hay IPA.

## Rollback
- Nếu giảm chất lượng không đạt, hoàn nguyên thay đổi GĐ43 trong `assets/village/arena-3d/stage7-expression-motion.mjs` và kiểm thử liên quan. Worker STAGING có thể quay về bản `3670cdd2-b658-4b42-8216-a2765145e8ad` đã PASS; Production 2D và IPA không tham gia.
