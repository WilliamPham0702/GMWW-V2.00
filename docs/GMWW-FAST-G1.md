# GMWW FAST — Giai đoạn 1: CI và phát hành theo phạm vi

> Nhánh PR độc lập. Không đổi source runtime đang chạy, không merge, không deploy.

## Điều chỉnh trong PR
- Bảo toàn kiểm thử bắt buộc của `Check Player Web Worker`: npm test, Worker dry run, phiên bản, syntax, Durable Object/private delivery.
- `Check Character Engine` chỉ kích hoạt khi renderer/engine hoặc bài kiểm thử Character thay đổi; chỉnh UI chung trong `app.js`/`GMWW.html` vẫn đi qua toàn bộ unit/regression của Player Web.
- Các kiểm tra asset 3D của Character Lab V4/V5 khi deploy chỉ chạy nếu nội dung lab, Worker routing, cấu hình Wrangler hay chính workflow deploy thay đổi. Không rõ phạm vi hoặc chạy thủ công thì kiểm tra đầy đủ.
- Các kiểm tra SHA-256, OTA manifest, runtime/IPA compatibility, rollback, GM/Player Web và game data **không bị bỏ qua**.
- Thay kiểm thử OTA so khớp chuỗi phiên bản cứng bằng kiểm thử hành vi fallback thực, bao gồm SHA, tệp battle-controls và chặn shell không tương thích.
- Dùng npm ci và npm cache cho Worker/Production để cài phụ thuộc ổn định, không ghi lại package-lock.

## Định hướng tái cấu trúc có chọn lọc sau khi nghiệm thu
1. Giai đoạn 2: gom bộ phát hành OTA theo manifest sinh tự động, loại danh sách phiên bản lịch sử thủ công; phải có golden test V3.110 IPA.
2. Giai đoạn 3: chia `server-game/current/app.js`, `src/index.js`, `src/gmww-members-page.js` thành module có boundaries; giữ schema và storage namespace.
3. Giai đoạn 4: chạy Lab đa đêm và kiểm thử iPhone OTA trên staging trước Production.

## Nghiệm thu PR
- [ ] Các GitHub Actions bắt buộc trong PR là SUCCESS.
- [ ] Thử thay đổi UI nhỏ: không chạy screenshot Character Engine chuyên sâu khi renderer không đổi.
- [ ] Kiểm thử source OTA recovery không còn phụ thuộc danh sách phiên bản viết cứng.
- [ ] Không có bất kỳ deploy Production hoặc thay đổi dữ liệu game nào trước phê duyệt merge.
