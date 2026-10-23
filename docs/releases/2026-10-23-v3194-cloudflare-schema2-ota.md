# GMWW Runtime V3.194 — Hotfix báo cáo Cloudflare schema 2 (23/10/2026)

## Nguyên nhân phát hành V3.193 bị chặn
PR #428 đã merge và CI thành công; workflow Deploy Production từ commit `6cd47b3` bị khóa tại `verify-ota-version-advance.mjs`: mã Runtime mới vẫn quảng bá `3.193`, trùng với Production. Không có bước deploy Production nào chạy trong workflow thất bại.

## Nội dung Runtime V3.194
- Giữ toàn bộ sửa lỗi PR #428: GM Server iPhone và giao diện Cloudflare công khai chấp nhận status schema 1 hoặc 2.
- Vẫn chỉ hiển thị `ĐÃ KIỂM TOÁN` khi số lượng hợp lệ và `productionProtected === true`; không coi lỗi schema là lỗi mạng.
- Đồng bộ phiên bản Worker `V3.194`, `app.js` `3.194`, GM HTML, package/lock và bản phát hành OTA, giữ IPA shell `V3.110`.
- Cập nhật `releaseNotes` cho người sử dụng và đặt `UPDATE_CHANNEL_REV=runtime-3194`.

## Giới hạn và an toàn
- **Không đổi** rule game, cơ chế realtime, cấu trúc Durable Object, namespace, dữ liệu phòng chơi, tên Worker hay binding Production.
- **Không cho phép** xóa tự động các Preview chưa xác minh; lệnh bảo trì và tình trạng giữ lại tài nguyên không thay đổi.
- Giữ nguyên điều kiện kiểm tra tăng phiên bản OTA, SHA-256 tài nguyên, kiểm thử CI và smoke test Production.
- Tránh cài lại IPA: V3.194 được phân phối bằng kênh Runtime OTA cho IPA shell hiện hữu V3.110; chỉ cần cập nhật Runtime trong ứng dụng nếu thiết bị nhận được manifest.

## Nghiệm thu và rollback
1. Chỉ merge nếu CI SUCCESS và bản manifest thử nghiệm vượt phiên bản Production.
2. Quan sát workflow Deploy Production trên main và xác minh health Worker, manifest OTA và SHA-256.
3. Kiểm tra trong iPhone thật: Cài đặt > Cloudflare > Làm mới, phải hiện `ĐÃ KIỂM TOÁN`. Việc này phải được xác nhận từ thiết bị, không suy đoán từ CI.
4. Nếu cần rollback, **không hạ phiên bản đang được quảng bá**: tạm dừng phát hành mới, revert mã trong nhánh phục hồi với version OTA cao hơn, kiểm thử và phát hành lại sau phê duyệt. Không xóa dữ liệu.
