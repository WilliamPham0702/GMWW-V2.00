# GMWW GIAI ĐOẠN 2 — NATIVE OTA GITHUB-FIRST, CLOUDFLARE FALLBACK
Ngày: 29/10/2026 — trạng thái: **PR STAGING / IPA ứng viên, chưa phát hành Production**

## Phạm vi triển khai

- Native `GameView.swift` hỗ trợ khám phá bản Runtime từ GitHub Releases của `WilliamPham0702/GMWW-V2.00`, tag bất biến theo version `gmww-runtime-vX.Y`; từ chối release draft/prerelease, URL ngoài repository và downgrade.
- Ưu tiên tải `GMWW-Runtime-VX.Y.gmwwupdate` từ GitHub qua HTTPS; lấy `.sha256` cùng tag, kiểm toàn bộ file tải và từng file trong container. Giới hạn 515 MiB cho gói, 512 MiB dữ liệu file, 16 MiB/file, header 2 MiB; từ chối đường dẫn, file trùng, thiếu entry, file bị cắt, lệnh xóa.
- Sau khi kiểm chứng mới gọi trình cài Runtime đang có: **staging → atomic move → giữ Runtime trước**. Nếu lỗi, giữ nguyên Runtime và dữ liệu; rollback qua cầu nối Native.
- Giao diện TỰ ĐỘNG trên GM iPhone kiểm tra GitHub trước; khi GitHub không phản hồi hoặc không có release hợp lệ, dùng Cloudflare manifest hiện tại làm kênh dự phòng. Sai hash hoặc sai cấu trúc là lỗi toàn vẹn và không được bỏ qua bằng fallback.
- Nút THỦ CÔNG, cập nhật Player Web, GM Online, luật, IPA đang phát hành và dữ liệu Durable Objects không thay đổi.
- Tách phạm vi CI Native; chặn workflow IPA tự công bố/ghi đè release do các commit `push` thông thường. Cần `workflow_dispatch` có `publish_ipa=true`, kết quả CI đúng SHA trên main và phiên bản IPA chưa tồn tại.

## Kiểm thử bắt buộc trước phát hành

1. `Check Native GitHub-first OTA Stage 2` SUCCESS, `Check Player Web Worker` SUCCESS đúng phạm vi, và Xcode build Native IPA ứng viên trên macOS SUCCESS.
2. Dùng TestFlight / iPhone thử GitHub sẵn sàng, GitHub mất mạng, chỉ có Cloudflare, cả hai kênh mất mạng, SHA sai, gói thiếu file, bản trùng/cũ, shell IPA không tương thích, thiếu bộ nhớ và đóng ứng dụng giữa chừng.
3. Xác minh cập nhật Runtime xong khởi động lại, vào ván được, dữ liệu phòng và lịch sử giữ nguyên; rollback về Runtime trước không làm mất dữ liệu.
4. Bản IPA mới phát hành Production **chỉ sau khi nghiệm thu trên thiết bị**; mã phiên bản phải mới so với IPA hiện có, SHA-256 và ghi chú tiếng Việt đầy đủ. Không tự phát hành IPA từ PR hoặc push.

## Giới hạn cần công bố rõ

- Kiểm tra SHA-256 có thể phát hiện file bị lỗi hoặc bị thay đổi **so với checksum của GitHub Release**, nhưng bản này **chưa có chữ ký mật mã với khoá riêng tách biệt GitHub**. Cần thêm khóa ký và quy trình quản trị khóa trước khi tuyên bố manifest được *ký số*.
- GitHub độc lập Cloudflare trong tải và cài **Runtime**; Server Online và Player Web vẫn cần backend Cloudflare cho tới khi có hạ tầng backend dự phòng riêng.
- Đây là code + CI ứng viên, chưa có bằng chứng chạy thực tế trên iPhone và chưa phát hành IPA Production.
