# Release notes — CI Policy Gate (29/10/2026)

## Thay đổi
- Bổ sung kiểm tra CI ổn định tên `CI Policy Gate` cho mọi pull request vào main, kể cả PR chỉ thay đổi tài liệu.
- Kiểm tra cú pháp bộ chọn phạm vi và các unit test bất biến an toàn của bộ chọn phạm vi (những kỳ vọng lịch sử đã lỗi thời không được dùng để ép bộ chọn bỏ qua kiểm thử).
- Bảo đảm tình huống không nhận diện được phạm vi phải chuyển sang chế độ kiểm thử đầy đủ (fail-closed), không bỏ qua bảo vệ.
- Runner Ubuntu, Node 22, giới hạn 8 phút, không cài thư viện không cần thiết, hủy bản chạy cũ cùng PR.

## Phạm vi
- Chỉ CI GitHub Actions; không thay đổi Worker Production, Player Web, IPA, Runtime OTA, game rule hay dữ liệu.
- Đồng bộ chốt chặn Production để commit chỉ gồm workflow CI, bộ test chính sách và release notes không tự phát hành Worker/IPA/OTA.
- Cloudflare preview trigger nhánh CI báo build `skipped`; không phải lỗi biên dịch Worker và không thuộc required checks.

## Kiểm chứng và yêu cầu trước merge
- `node --check .github/scripts/ci-browser-scope.mjs`
- `node --test tests/ci-browser-scope.test.mjs`
- Chỉ hợp nhất sau khi các required checks có kết luận SUCCESS.
- Để kích hoạt branch protection, quản trị viên cần thêm đúng tên check `CI Policy Gate` vào required status checks của nhánh main.
- Rollback: revert commit workflow mới.
