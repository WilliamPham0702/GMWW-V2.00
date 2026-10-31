# GMWW Runtime V3.284 — ỨNG VIÊN TÍCH HỢP PR #654 + #659

## Nội dung
- Audio Vai Trò: Play Tên/Full riêng, thay thế và liên kết file độc lập, xóa có xác nhận + Thùng rác, không xóa dữ liệu gốc khi hủy.
- Khắc phục Runtime V3.283 cao hơn Server V3.280 nhưng hiển thị ĐÃ ĐỒNG BỘ: cảnh báo LỆCH PHIÊN BẢN, không đề nghị IPA, không downgrade.
- HEALTHY CHECK đồng bộ chỉ khi ba phiên bản Runtime / Server / release manifest trùng nhau.
- GitHub-first OTA: bảo toàn bản cùng tag (SHA-256 bất biến); chặn publish bản trùng, thấp hơn bản chính thức mới nhất.

## Điều kiện phát hành
1. GitHub CI cần đạt SUCCESS tại đúng HEAD đã tích hợp, không được bỏ required checks.
2. Nghiệm thu Preview bằng iPhone thật Safari, Chrome, Edge và trong IPA với Runtime V3.283 QA.
3. Xác minh checksum của file .gmwwupdate V3.284 được đóng gói; GitHub Releases không có tag trùng/phiên bản cao hơn.
4. Kiểm thử reconnect/online Audio và trạng thái phiên bản; chỉ merge/deploy khi an toàn.
5. Bảo toàn IPA hiện có, Oracle, Durable Objects, data, lịch sử và Worker production cho đến release gate.

## Tài nguyên và rollback
- GitHub Production Runtime V3.280 hiện có SHA-256 `cc4f397ee8513daabbee690d2f5d25a3f2d6c3522faa64d5c23a21801ff56bab`.
- Runtime V3.283 từ PR654 hiện chỉ là GitHub Actions QA artifact #13026290815; không coi là Release, không xác nhận checksum của iPhone.
- Rollback chỉ theo bản đã xác minh tương thích, không tự hạ cấp V3.283 đang cài; không đụng dữ liệu/phòng.
- Đây là ứng viên **chưa phát hành**. Không làm IPA mới.
