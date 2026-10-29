# GMWW — PHÁT HÀNH RUNTIME THỦ CÔNG TRÊN GITHUB, ĐỘC LẬP CLOUDFLARE (29/10/2026)

## Giai đoạn 1 — Phát hành GitHub Releases

- Bổ sung `.github/workflows/github-runtime-ota.yml`. Khi PR thay đổi workflow này, GitHub Actions chỉ **kiểm thử và đóng gói**, không tạo Release, không dùng Cloudflare token, không deploy Worker/Preview/Production.
- Khi workflow **Check Player Web Worker** hoàn tất SUCCESS trên `main`, hoặc được phát hành thủ công từ `main`, hệ thống phải xác nhận **đúng SHA main và lần chạy CI push SUCCESS cùng SHA** trước khi cho phát hành.
- Khôi phục 63 lá Vai Trò gốc từ GitHub Release `legacy-assets-v252` (SHA-256 đã ghim), chạy kiểm thử đúng phạm vi, tái sử dụng `prepare-update-channel.mjs runtime` và `build-manual-runtime.mjs`.
- Kiểm toán offline file `.gmwwupdate`: định dạng `GMWWRUNTIME2`, manifest, đường dẫn, bytes SHA-256 của từng file, SHA-256 toàn gói và chặn thao tác xóa. Không dùng API Cloudflare, không Wrangler deploy.
- Lưu kết quả vào GitHub Actions Artifacts và công bố **tag phiên bản riêng** `gmww-runtime-vX.Y` trên GitHub Releases. Nếu tag đã có, chỉ xác nhận bản phát hành hiện hữu có cùng checksum, **không clobber**, nếu checksum khác phải tăng version.
- Release có `GMWW-Runtime-VX.Y.gmwwupdate`, `.sha256`, `manual-manifest.json`, ghi chú tiếng Việt. Gói thủ công dùng nút **THỦ CÔNG** trên iPhone; kiểm tra SHA-256 và backup Runtime trước khi cài theo bridge Native đang có.
- Giữ nguyên mã gameplay, Player Web, Runtime đang chạy ở Cloudflare, IPA, dữ liệu phòng, Durable Objects và cơ chế rollback. Các URL Cloudflare trong manifest hiện tại là yêu cầu tương thích Native khi đọc gói **tại máy**; không có thao tác tải Cloudflare khi cài gói thủ công.
- Kênh phát hành này **không khẳng định OTA tự động trên IPA hiện tại đã độc lập Cloudflare**. Nếu Server Online dùng Cloudflare hết hạn mức Requests, phát hành GitHub không thể sửa kết nối gameplay.

## Nghiệm thu giai đoạn 1

1. PR GitHub-only: CI chuyên biệt SUCCESS, không có release hoặc request deploy từ PR.
2. Lấy đúng commit có CI SUCCESS; kiểm tra nếu SHA main đã thay đổi thì từ chối phát hành.
3. Thử package V3.274, đối chiếu byte-to-byte với manifest và SHA-256. Test sửa một byte, sửa URL, lệnh delete, sửa checksum đều bị chặn.
4. GitHub Releases phải có đủ hai file `.gmwwupdate` và `.sha256`, không đổi file đã phát hành cùng version.
5. Cài qua THỦ CÔNG trên IPA hiện có; khởi động lại Runtime, kiểm tra version, giao diện Artifact/Vai Trò và rollback. Kiểm thử iPhone thực tế mới được đánh dấu nghiệm thu cuối.

## Giai đoạn 2 — Thiết kế OTA GitHub-first (CHƯA triển khai IPA)

1. Native IPA bản tiếp theo hỗ trợ tải **manifest phiên bản cố định được ký/kiểm chứng**, ưu tiên GitHub Release/Pages cho file Runtime; Cloudflare chỉ làm fallback khi GitHub lỗi. URL giới hạn vào repository/đường dẫn phát hành chính thức.
2. Dùng một manifest cập nhật ổn định có version tăng đơn điệu, revision, shell tối thiểu, SHA-256 từng tài nguyên, SHA-256 toàn gói. Không dùng URL `releases/latest` không ràng buộc version; chống downgrade và replay.
3. Native thực hiện tải về staging, so hash, giải nén an toàn, cài nguyên tử, giữ Runtime trước để rollback nếu có lỗi. Không ghi đè dữ liệu của game.
4. Thử trên STAGING: không có Cloudflare, mất GitHub, checksum sai, mất mạng, OTA trùng version, ROM/dung lượng nhỏ, iPhone Safari/Native. Chỉ phát hành IPA mới khi CI, xác minh OTA/rollback trên iPhone đạt và có release notes tiếng Việt.

**Trạng thái:** Giai đoạn 1 là PR độc lập với Cloudflare. Giai đoạn 2 mới là tài liệu thiết kế, chưa thay IPA hay Production.
