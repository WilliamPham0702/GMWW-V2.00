# Release notes — CI Policy Gate (29/10/2026)

## Thay đổi
- Bổ sung kiểm tra CI ổn định tên `CI Policy Gate` cho mọi pull request vào main, kể cả PR chỉ thay đổi tài liệu.
- Kiểm tra cú pháp bộ chọn phạm vi và toàn bộ bộ unit test lựa chọn phạm vi.
- Bảo đảm tình huống không nhận diện được phạm vi phải chuyển sang chế độ kiểm thử đầy đủ (fail-closed), không bỏ qua bảo vệ.
- Runner Ubuntu, Node 22, giới hạn 8 phút, không cài thư viện không cần thiết, hủy bản chạy cũ cùng PR.

## Phạm vi
- Chỉ CI GitHub Actions; không thay đổi Worker Production, Player Web, IPA, Runtime OTA, game rule hay dữ liệu.
- Không tự kích hoạt deploy.

## Kiểm chứng và yêu cầu trước merge
- `node --check .github/scripts/ci-browser-scope.mjs`
- `node --test tests/ci-browser-scope.test.mjs`
- Chỉ hợp nhất sau khi các required checks có kết luận SUCCESS.
- Để kích hoạt branch protection, quản trị viên cần thêm đúng tên check `CI Policy Gate` vào required status checks của nhánh main.
- Rollback: revert commit workflow mới.
