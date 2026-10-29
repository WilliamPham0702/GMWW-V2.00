# GMWW Player Web — Tối ưu tác vụ nền (29/10/2026)

## Thay đổi

- Dừng vòng đo FPS của Làng khi Player Web chuyển sang nền; tự tiếp tục đúng một vòng khi người chơi quay lại.
- Không gọi đồng bộ ảnh nền Làng, presence/heartbeat và kiểm tra cập nhật định kỳ khi trang đang ẩn.
- Khi trang hiện lại, giữ nguyên cơ chế đồng bộ tức thời hiện có để cập nhật trạng thái phòng, vai trò và phiên bản mới.

## Phạm vi bảo toàn

- Không thay đổi luật game, giao diện, chất lượng hình ảnh, WebSocket realtime, Durable Objects, phòng hoặc lịch sử.
- Không thay đổi IPA và Runtime OTA.

## Kiểm thử đúng phạm vi

- Vòng FPS dừng khi ẩn, tiếp tục đúng một vòng khi hiện lại.
- Các poll mạng nền có visibility guard.
- Bundle Player Web tái tạo đúng từ source part và JavaScript hợp lệ.

## Rollback

Hoàn nguyên commit tối ưu Player Web này và triển khai lại Worker/Player Web V3.273 đang chạy trước thay đổi. Không cần phục hồi dữ liệu vì thay đổi không sửa schema hoặc Durable Objects.
