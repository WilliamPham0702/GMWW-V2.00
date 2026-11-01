# GMWW AUTO-DELIVERY V3.0 — CHÍNH SÁCH VẬN HÀNH MẶC ĐỊNH

**Phê duyệt:** Chủ dự án đã nghiệm thu task mẫu Player Web V3.0 trên iPhone: ĐẠT (01/11/2026). Từ nay mọi task mới GMWW vận hành theo AUTO-DELIVERY V3.0. V3.0 là tên QUY TRÌNH, không phải Runtime/IPA version.

## Thay thế quy trình giao nhận cũ

1. Một task = một nhánh, một PR, một phạm vi và test tái hiện. Nếu bế tắc trên 5 phút, đổi phương pháp trong cùng nhánh; muốn thay PR thì bảo toàn commit và đối chiếu thành quả trước khi đóng PR cũ.
2. Scope Gate tự phân loại Worker/Player Web, Runtime/GM, Pages gateway, CI/docs-only hoặc HOLD đối với Native/3D/DO/data/config đặc biệt. Không suy đoán phạm vi chưa biết: BLOCK.
3. CI hai tầng: bài test đúng lỗi + kiểm tra source/bundle/Worker dry-run; với engine/quyền/trạng thái/Runtime phải chạy thêm bài tích hợp và an toàn. Required CI Policy Gate trên HEAD cuối cùng luôn SUCCESS, không bỏ qua để phát hành.
4. STAGING có dữ liệu và Durable Objects tách biệt. Không tự xóa Preview hay Production storage để giải phóng hạn mức. Không cần một Preview mới cho tất cả thay đổi nếu đã đủ điều kiện nghiệm thu riêng và không yêu cầu riêng.
5. Phát hành theo tác động:
   - Server/Player Web thay đổi: Worker-only, kiểm tra live HTTP health và JS, lưu phiên bản rollback; KHÔNG phát hành lại file .gmwwupdate không đổi.
   - Runtime GM thật mới: tăng phiên bản Runtime, chuẩn bị .gmwwupdate + SHA-256 + release notes tiếng Việt + rollback; xác minh GitHub Releases chứa binary mới nhất đúng SHA; không đổi IPA.
   - Pages: chỉ đổi gateway gamemasoi.pages.dev, giữ nguyên URL hiển thị; Worker và dữ liệu không đổi.
   - Native/IPA, DO migrations, xóa dữ liệu, bảo mật đặc biệt, thay đổi nguồn gốc hosting: HOLD và duyệt riêng.
6. Đối chiếu kết quả thực: PR, HEAD SHA, required CI, Worker live health, Player Web JavaScript, Pages nếu liên quan, tài sản GitHub Release, SHA-256, rollback. Không báo “hoàn thành” chỉ vì tạo PR.
7. Ưu tiên GitHub-first miễn phí; chỉ dùng Cloudflare STAGING có giới hạn an toàn. Không tự chuyển server khi đang chơi.
8. 5-minute recovery không có nghĩa được phép bỏ CI, xóa code hoặc lặp vô hạn PR. Từ chối thay đổi rủi ro không chứng minh được an toàn.
9. Một kho GitHub Releases cho Runtime và SHA-256, không nhân đôi binary giống hệt; giữ bản đang vận hành và bản rollback cần thiết.
10. Bảo toàn Production, IPA, URL, dữ liệu, DO, lịch sử, nhánh cũ và PR #581 đã đóng băng.

## Cơ chế kỹ thuật

- Phân loại dựa trên path: .github/scripts/v3-delivery-plan.mjs, có bài test tests/v3-delivery-plan.test.mjs.
- Điều phối V3: .github/workflows/gmww-auto-delivery-v3.yml, chạy trên PR và sau Check Player Web Worker SUCCESS ở main.
- Branch protection hiện hành: CI Policy Gate. Giữ nguyên tên required check và bảo vệ main.
- Các workflow chuyên biệt cũ trở thành lớp test/rollback phụ trợ trong chuyển đổi, **không được tắt trước khi có kiểm thử release thay thế**. Chuyển đường phát hành qua V3 theo PR riêng; đóng task không đồng nghĩa xóa workflow.
- Công cụ GitHub Actions không tự viết mã nguồn, tự sửa bug hay nghiệm thu trên iPhone; tác nhân được cấp quyền phải thực hiện các bước đó. AUTO chỉ tự động hóa kiểm thử/điều phối/phát hành khi đã có code, PR và các điều kiện cần.

## Kiểm kê và đóng task cơ chế cũ

Kiểm kê ngày 01/11/2026: GitHub không còn PR/issue mở thuộc cơ chế cũ. Mục duy nhất đang mở là PR #581 Arena 3D Draft, đã đóng băng, cần giữ nguyên. Bảo toàn mọi PR đã đóng, Git branch, commit, artifact, release, dữ liệu.

## Hiệu lực

Áp dụng chính sách V3 cho task mới ngay sau khi merge PR chính sách và CI SUCCESS. Chuyển đổi release trigger và ngừng workflow phát hành trùng lặp là bước vận hành tiếp theo, phải được chứng minh thành công trước khi tuyên bố thay thế hoàn toàn về kỹ thuật.
