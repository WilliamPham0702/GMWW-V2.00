# GMWW Runtime V3.279 — phát hành bản vá PR #648

Ngày: 31/10/2026

## Thay đổi
- Tối ưu Village/Player Web iPhone: bỏ vòng `requestAnimationFrame` 60Hz chỉ phục vụ đo FPS ở chế độ thông thường.
- Chỉ bật chẩn đoán FPS với `gmwwPerf=1`; vẫn duy trì telemetry theo chu kỳ và tạm dừng đo khi ứng dụng chạy nền.
- Không đổi luật chơi, WebSocket, realtime/reconnect, IPA, Oracle, Durable Objects hoặc dữ liệu.

## Nghiệm thu và chốt phát hành
- Người dùng xác nhận nghiệm thu iPhone Safari, Chrome, Edge, realtime, reconnect và tình trạng nóng máy đạt trên PR #648.
- PR #648 HEAD `8ae0ef3e0c922fb44a5b45bb22614f4068f7f36e` đã qua required CI Policy Gate, merge vào main `95b6e64b36a74301cd5adef001b5f68e70ff0851`.
- Phát hành GitHub Runtime mới V3.279, giữ nguyên V3.278 để rollback, không ghi đè release cũ.
- Chỉ công bố gói khi main CI trên SHA cuối cùng SUCCESS, gói `.gmwwupdate` + `.sha256` xác minh hợp lệ. Không phát hành IPA.

## Rollback
- Nếu phát hiện lỗi trên Runtime V3.279, ngừng cập nhật, giữ bản V3.278 và thực hiện rollback qua luồng khôi phục Runtime có sẵn; không xóa dữ liệu.
