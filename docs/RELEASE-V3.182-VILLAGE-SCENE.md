# GMWW Runtime V3.182 — Ghi chú phát hành

**Ngày:** 22/10/2026  
**Loại:** Runtime OTA (không phát hành IPA mới)  
**Phụ thuộc:** PR #400, đã merge vào main  
**IPA shell giữ nguyên:** V3.110

## Nội dung cập nhật
- Player Web: ảnh nền Ngày/Đêm được đặt ở **một lớp duy nhất dưới nhân vật**, bỏ ảnh `::before` trùng và bỏ ép `position:relative` làm hỏng vùng tọa độ của Character/Seat.
- GM Server: giữ lớp `#playPlayerRing` `position:absolute`, `z-index:3` khi bật nền tùy chỉnh.
- Làm mới phiên bản CSS trên iPhone để tránh dùng cache cũ, giữ không gian làng và đống lửa đúng bố cục.
- Đồng bộ version từ V3.181 → V3.182 ở Worker, Runtime app, HTML, package và OTA channel, kèm ghi chú hiển thị trong màn hình **Có gì mới**.
- Không thay Character40, sơ đồ ghế, luật chơi, dữ liệu phòng/Durable Objects, quyền người chơi hay cấu hình IPA.

## Nghiệm thu và phát hành
1. PR CI phải đạt SUCCESS: Worker, 30-Player realtime, Character Engine, WebKit (iPhone-size) + kiểm thử trường hợp ảnh Ngày/Đêm.
2. Pipeline Production phải tạo manifest **releaseType=runtime**, **releaseVersion=3.182**, **shellVersion=3.110**, SHA-256 hợp lệ và OTA vượt phiên bản đang chạy.
3. Chỉ xác nhận Production sau deploy SUCCESS và kiểm tra live `/api/health`, `/api/update/manifest` cùng file runtime.
4. Sau cập nhật OTA trên GM iPhone, nhập cặp `Ngay_Test.webp`, `Dem_Test.webp` của một phong cách, kiểm tra Server + Player Web với 8–30 nhân vật, vị trí ghế, thao tác chạm và đống lửa.
5. Nếu ảnh lỗi, dùng **Cài đặt → Chủ Đề → Bối cảnh Làng → Khôi phục bản trước**. Nếu Runtime lỗi, rollback Worker/OTA theo inventory SHA-256 của bản trước.

**Không được công bố hoàn tất** khi chưa có CI + Production success và chưa nghiệm thu trên thiết bị thật.
