# GMWW Runtime V3.288 — Player Web và luật Bầy Sói (PR #726)

Ngày 01/11/2026. Nguồn: PR #726 đã merge vào main sau PR #728 sửa CI, 26/26 workflows trên HEAD đã kiểm thử SUCCESS.

## Thay đổi
- Player Web: icon Vai Trò/Artifact xuất hiện trên đống lửa khi đến lượt; kéo thả vào mục tiêu; Khôi phục theo đúng người, lượt và đêm, không ghi đè hành động mới.
- Bầy Sói: mỗi Sói có lựa chọn Cắn riêng. Sói Trùm chốt mục tiêu cuối nếu tự Cắn; nếu không, chọn người bị Sói thường Cắn nhiều nhất; phiếu hòa không tự xác định nạn nhân.
- Giữ quy tắc đóng băng và đuổi Sói Trùm, Sói Tuyết, Bảo Vệ, Yêu Tinh và Phù Thủy theo nguồn đã merge.

## An toàn phát hành
- Chỉ tăng phiên bản Runtime/Worker/GM và metadata từ V3.287 lên V3.288; không thêm chức năng ngoài PR #726.
- Không sửa IPA Native, tên miền https://gamemasoi.pages.dev/, Durable Objects hoặc dữ liệu Production.
- Required CI Policy Gate và Worker CI SUCCESS trên HEAD cuối; GitHub Actions đóng gói từ chính source SHA của main. Tải .gmwwupdate và .sha256 ở GitHub Releases sau khi pipeline phát hành báo SUCCESS.
- Xác minh SHA-256 trước khi cập nhật thủ công. Nghiệm thu Player Web, lựa chọn Sói Trùm, phiếu đa số và Khôi phục trên iPhone thật sau phát hành.

## Rollback
- Giữ nguyên bản GMWW Runtime V3.287 và SHA-256 ở GitHub Releases làm mốc khôi phục.
- Nếu gặp lỗi, dừng nhận ván mới; dùng cơ chế rollback Runtime của IPA và khôi phục Worker version Production trước triển khai, không xóa/ghi đè dữ liệu phòng.
- Không ép hạ cấp Runtime đã cài nếu cơ chế từ chối downgrade; khôi phục bằng bản cập nhật khắc phục có số phiên bản cao hơn.
