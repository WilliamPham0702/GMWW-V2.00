# GMWW Runtime V3.289 — PR #738 Player Web/Server đồng bộ

## Đã có trong bản này
- **PR #738** đã merge vào `main`: Player Web hiển thị icon hành động tại đống lửa gọn và đúng vị trí; Phù Thuỷ có đủ hai bình **Cứu/Giết**, nhận thông báo riêng ai bị Sói cắn từ bộ giải quyết đêm trên Server; kết quả Tiên Tri Hào Quang hiển thị chữ thay cho JSON; nhãn người đến lượt và mục tiêu cùng hiệu ứng với GM Server.
- Tăng đồng bộ Runtime `3.288 → 3.289` trên GM Web/Worker/manifest và kho phát hành. IPA gốc **V3.264** không thay đổi. Không điều chỉnh luật chơi hay dữ liệu.

## Kiểm thử & phát hành
- Required `CI Policy Gate` phải **SUCCESS** trên HEAD cuối. V3 Release Gate, test phiên bản, hồi quy Player Web, GM đồng bộ và Worker dry-run phải đạt; Production deployment kiểm chứng `/api/health`, `/api/update/manifest`, SHA và file Runtime.
- GitHub Releases phải có `GMWW-Runtime-V3.289.gmwwupdate` kèm `.gmwwupdate.sha256`, đúng checksum; không thông báo tải trước khi tài sản tồn tại.
- Worker/Player Web URL giữ nguyên `https://gamemasoi.pages.dev/` và `https://gmww-v2-00.williampham0702.workers.dev/`.

## Rollback
- Nếu kiểm tra fail, **không đưa phiên bản 3.289 lên Production hoặc quảng cáo OTA**; dùng Runtime V3.288 và Worker deployment trước phát hành, không xóa/phục hồi lại Durable Objects, tài khoản/phòng/dữ liệu, không động tới IPA.
- Đã quan sát monitor `/api/update/manifest` trả HTTP 503 ở V3.288; phải sửa/kiểm tra trong release validation trước khi tuyên bố V3.289 an toàn.
