# GMWW Runtime V3.261 — sửa nhân vật đến lượt chỉ đổi mặt, không đi

## Sửa
- Animation GM WAAPI dùng `translate` độc lập với `transform` căn Seat, để nhân vật thật sự rời vị trí khi đến lượt.
- Nhân vật dùng atlas Walk đi từ mọi góc tới điểm trống quanh vòng đống lửa, không đạp lên tâm lửa; tới nơi đứng Idle quay mặt vào lửa.
- Đổi lượt hoặc thời gian còn 0 thì dùng atlas Run về đúng Seat; không dịch chuyển tức thì.
- Mặc định bật hiệu ứng Đi bộ, tách key khỏi Bay/Chạy cũ; tôn trọng Reduce Motion và 15 FPS low-power, không thêm rAF/poll.

## Bảo toàn
- Tiếp tục đầy đủ Runtime V3.260 Say Rượu (ảnh lá gốc, overlay trong Game, xóa trạng thái tạm sau trận), lịch sử, tài khoản, Core, Player Web, Room/DO, bảng xếp hạng theo số ván.
- Chỉ OTA Runtime V3.261, giữ native IPA shell V3.257 và bản thủ công.

## Kiểm thử và phát hành
- Chỉ `tests/gm-fire-walk-position.test.mjs`, `tests/gm-turn-motion-lowheat.test.mjs`, bundle verify, JS syntax và Worker CI bắt buộc liên quan; STAGING độc lập.
- Chặn merge/Production nếu chưa SUCCESS. Xác minh `/api/health`, manifest OTA/Thủ Công, SHA-256 sau deploy.

## Rollback
- Khi OTA chưa áp dụng: giữ Production V3.260.
- Khi V3.261 đã cài trên thiết bị: phát hành bản khôi phục số phiên bản cao hơn, không ép downgrade và không sửa dữ liệu.
