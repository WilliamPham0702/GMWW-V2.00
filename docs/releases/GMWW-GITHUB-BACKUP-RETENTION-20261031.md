# GMWW — SAO LƯU & DỌN RELEASES GITHUB (31/10/2026)

## Mục tiêu
Giảm các gói Runtime/IPA cũ lớn trên GitHub Releases; không thay đổi Git history,
Worker Production, Oracle, Player Web, IPA đã cài hoặc lịch sử/dữ liệu người chơi.

## Chính sách mặc định
- Giữ nguyên toàn bộ asset của **5 phiên bản Runtime mới nhất** và **3 phiên bản IPA mới nhất**, kể cả link Release kép của bản mới.
- Giữ cố định mốc **legacy-assets-v252**, **gmww-v3.17**, **gmww-v3.200** và các Release đang được mã nguồn/CI/OTA tham chiếu.
- Mỗi tháng phát sinh dọn, tạo **01 bản sao Runtime + 01 bản sao IPA** trong GitHub Release **gmww-backup-YYYY-MM**.
- Tải về, kiểm tra SHA-256 và kích thước, tải bản sao lên GitHub, rồi xác minh lại digest/size trên GitHub trước khi được dọn.
- Không xóa file mới phát hành dưới **14 ngày**; mỗi lần tối đa **25 file**.
- Chỉ dọn file nhị phân .gmwwupdate/.ipa quá hạn không thuộc diện bảo vệ; giữ lại tag, release notes, checksum, artwork, 3D, source và dữ liệu chơi.
- GitHub Releases là nơi backup lâu dài; không dùng Actions Artifacts có thời hạn.

## Tự động
Workflow: .github/workflows/github-release-backup-retention.yml
- Mỗi Chủ nhật 05:13 UTC: kiểm thử, tạo/kiểm chứng backup, dọn theo giới hạn trên main.
- Pull request: unit tests, không xóa/không backup.
- Chạy tay: mặc định preview, hoặc execute trên main.
- Fail closed nếu checksum, size, backup, quyền truy cập, branch, source hay release khác với kế hoạch.

## Phục hồi
1. GitHub Releases → gmww-backup-YYYY-MM.
2. Tải file Runtime/IPA trong backup và đối chiếu digest SHA-256 tại Release và backup-manifest tương ứng.
3. Runtime dùng cập nhật thủ công. Chỉ cài IPA khi có phê duyệt riêng.
4. Nếu cần bản phát hành cũ đã dọn, khôi phục từ các bản backup được giữ.
   **Giới hạn**: các phiên bản bị xóa nằm ngoài tập snapshot không có cam kết khôi phục đúng từng byte.

## Kiểm thử & rollback
- Chạy node --check .github/scripts/release-backup-retention.mjs
- Chạy node --test tests/release-backup-retention.test.mjs
- CI SUCCESS mới được merge.
- Revert PR hoặc tắt workflow để ngừng tự dọn. Không tự phục hồi file đã xóa.
