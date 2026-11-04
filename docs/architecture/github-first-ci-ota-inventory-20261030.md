# Kiểm kê CI/OTA và rủi ro deploy ngoài phạm vi — 2026-10-30

## Đã xác minh trên main
- Có 58 workflow trong `.github/workflows`; không tạo workflow OTA/Preview trùng lặp.
- `github-runtime-ota.yml`: workflow_run theo **Check Player Web Worker**, đóng gói `.gmwwupdate`, xác minh SHA-256, phát hành GitHub Releases; PR validation không publish.
- `check-native-github-ota.yml`: kiểm tra GitHub-first OTA stage 2 và fallback Cloudflare.
- `check-pr-preview-github.yml`: validate bằng GitHub Actions, nhưng job publish-preview vẫn gọi `wrangler preview` và cần Cloudflare token/account. Không được tuyên bố Preview độc lập hoàn toàn Cloudflare.
- `deploy-production.yml`: workflow_run tự kích hoạt sau main CI SUCCESS, có phân loại file thay đổi. Danh sách file CI-only không bao gồm `docs/architecture/github-first-dual-server-phase1-3.md` hoặc tài liệu kiểm toán này. **Rủi ro:** merge docs-only có thể kích hoạt deploy Worker/Runtime ngoài phạm vi; không merge PR tài liệu trước khi có guard CI-only/docs-only đã kiểm thử.
- Không đọc được `branches/main/protection` qua GitHub integration (403); chưa xác minh required checks từ branch protection. Không suy đoán trạng thái SUCCESS.

## Việc tiếp theo, theo PR riêng
1. PR guard: thêm kiểm thử regression cho docs-only scope và chỉnh `deploy-production.yml` để tài liệu kiến trúc không gây Worker/OTA deploy; không thay đổi logic game. Chạy kiểm thử đúng phạm vi, xác minh required checks trước merge.
2. Sau guard mới xem xét merge PR #635 (rebase nếu cần). Giữ draft cho đến lúc xác minh.
3. PR GitHub-first manifest: tận dụng workflow OTA hiện có; không nhân đôi. Kiểm tra release manifest và commit SHA chung cho hai backend.
4. PR chia sẻ link: giữ URL cũ; chỉ enable URL mới sau DNS/TLS/Cloudflare host routing xác minh. Link picker không đổi backend.

## Không thực hiện
- Không deploy Production, không thay đổi IPA, Runtime OTA, Durable Objects, dữ liệu, namespace hoặc DNS.
- Không coi `gamemasoi.duckdns.org` là tên miền đã đăng ký.
