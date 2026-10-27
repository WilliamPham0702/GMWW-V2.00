# PR #565 — Khôi phục chốt phát hành Runtime V3.258 (27/10/2026)

## Nội dung cập nhật
- Bổ sung điều kiện phát hành cộng dồn hai PR đã merge: Audio #563 và UI GM #565.
- Giữ nguyên ba sửa đổi GM: ẩn thông báo riêng Vết Cắn · Phù Thủy (vẫn giữ MỤC TIÊU), số phiếu đỏ nảy nhẹ, emoji 👍👎 không khung.
- Chỉ xác minh các test bắt buộc thuộc phạm vi Audio và ba thay đổi GM; kiểm tra cú pháp JavaScript, đồng bộ phiên bản Worker/GM và toàn vẹn bundle.
- Cần kết quả **SUCCESS của workflow GMWW PR565 — GM vote markers (focused) trên đúng SHA main** để mở chốt phát hành.
- Những workflow cũ kiểm thử phiên bản V3.238 hoặc chức năng không liên quan được tách khỏi chốt của task này; các bước kiểm tra manifest, hash, rollback của deploy Production vẫn giữ.

## Bảo toàn và phát hành
- Đối tượng: **Runtime OTA V3.258**, không xây IPA, không thay Swift/Xcode hay Native shell V3.257.
- Giữ nguyên Durable Objects, người chơi, phòng, lịch sử, Player Web Core.
- Vẫn phải chạy pipeline Production chính thức, xác minh SHA-256 của toàn bộ file và gói `.gmwwupdate`, release notes tiếng Việt và trạng thái Worker / manifest thực tế. Không coi merge là phát hành.
- Rollback: deployment Worker/Runtime trước đó (V3.257) và gói Runtime trước; không xóa DO, không chỉnh dữ liệu.
- Thay đổi PR này chỉ nằm trong định tuyến CI và release notes; code runtime đã nằm trong main từ PR #563/#565.
