# GMWW — CẢNH BÁO LỆCH PHIÊN BẢN RUNTIME / SERVER (PR #659)

## Sự cố đã xác nhận (31/10/2026)
- iPhone chụp màn hình: IPA V3.275, Game Runtime V3.283, Server V3.280 nhưng báo “ĐÃ ĐỒNG BỘ”.
- GitHub main V3.280; hai tag GitHub Releases chính thức mới nhất đều là V3.280.
- Cloudflare Worker deployment 31/10/2026 00:39 UTC đã nhận 100% lưu lượng, khớp bản phát hành V3.280.
- Đã nhận tệp V3.283 do người dùng cung cấp và đối chiếu với QA artifact #13026290815: 276/276 tệp Runtime giống hệt; chỉ hai trường văn bản manifest khác nhau. Đây là bằng chứng của gói được gửi, không phải phép đo trực tiếp bytes đã cài trong iPhone. Chưa kết luận tương thích Production, không hạ cấp.

## Đối chiếu SHA-256 và gói QA (31/10/2026)
- Gói do người dùng tải lên `GMWW-Runtime-V3.283(1).gmwwupdate`: 134588335 byte; SHA-256 `f89328760f9b0bfd0238d8324518618884588d412e62cb872f163429e624de67`.
- QA artifact GitHub Actions #13026290815 chứa `GMWW-Runtime-V3.283.gmwwupdate`: 134588345 byte; SHA-256 `fea3820fc5c2ed0f6b0efe99c08afc8989a083f64a2bcb81f187979d387c9633` (đã tự tính lại và khớp checksum kèm artifact).
- Hai gói `GMWWRUNTIME2` có 276/276 đường dẫn và dung lượng thành phần trùng nhau. Toàn bộ 276/276 SHA-256 thành phần khớp nhau và khớp manifest tương ứng. Không có khác biệt mã game, HTML, CSS, ảnh và tài nguyên Runtime.
- Chỉ khác `manifest.message` và `manifest.releaseNotes[0]`; không dùng checksum QA để xác thực cả gói người dùng vì hash tổng thể khác.
- Manifest hai gói khai báo `serverVersion: 3.283`: chỉ là metadata dự kiến của gói, không phải bằng chứng Production đang là V3.283 (Production xác nhận V3.280).
- Trong binary V3.283 có `VERSION='3.283'`, vẫn còn `if(!newer)` báo sai đồng bộ, HEALTHY CHECK bỏ Runtime và chưa chặn cập nhật OTA tự động xuống phiên bản cũ. PR #659 xử lý đúng nguyên nhân.
- QA chưa phải GitHub Release Production. Chỉ phát hành phiên bản trên V3.283 sau khi hợp nhất thay đổi PR #654 và #659, required CI SUCCESS tại HEAD, iPhone QA, SHA-256 và rollback; giữ nguyên IPA, Oracle, dữ liệu.

## Sửa lỗi
- So sánh cả ba giá trị: Runtime đang chạy, Server đang hoạt động và manifest phát hành.
- Khi Runtime mới hơn Server: cảnh báo rõ LỆCH PHIÊN BẢN, không còn báo “ĐÃ ĐỒNG BỘ” hoặc “phiên bản mới nhất”.
- Chặn cập nhật Runtime tự động sang gói bằng hoặc cũ hơn Runtime hiện có.
- HEALTHY CHECK chỉ báo đồng bộ khi Runtime, Server và manifest đều cùng phiên bản.
- Bao gồm hồi quy V3.283/V3.280 và kiểm tra nguồn GM bundle khớp mã ghép.

## Phạm vi và nghiệm thu
- Chỉ sửa GM Update Manager, HEALTHY CHECK, test/CI giới hạn. Không thay luật chơi, Worker Core, Player Web, IPA, Oracle, Durable Objects hay dữ liệu.
- CI phải SUCCESS cho required checks và kiểm thử tập trung; không bỏ qua an toàn/kiểm thử.
- Nghiệm thu thực tế iPhone phải xác nhận giao diện hiển thị cảnh báo đúng trước khi phát hành.
- Không phát hành V3.280 để hạ Runtime V3.283; bản Runtime tiếp theo cần bản gốc, checksum và phiên bản tăng có kiểm soát.

## SHA-256 & rollback
- Bản Runtime chính thức V3.280 (đã phát hành trước PR #659):
  `cc4f397ee8513daabbee690d2f5d25a3f2d6c3522faa64d5c23a21801ff56bab`.
- Bản V3.279 lưu làm mốc rollback đã ký:
  `afb2204f9bfd90e1e66b1ace1418323c0fcc4e12d158d7844ecb2c94bc35a413`.
- Không áp dụng rollback sang phiên bản cũ hơn V3.283 khi chưa có chứng cứ tương thích; bảo toàn dữ liệu và lịch sử.
- PR này chưa tạo Runtime OTA Production mới; sẽ có file `.gmwwupdate`, SHA-256 và hướng dẫn rollback riêng nếu đủ điều kiện phát hành.

> Tích hợp vào ứng viên Runtime V3.286 cùng DEMO Online trên main; thay thế phát hành cũ và chỉ phát hành khi đủ CI, iPhone QA, SHA-256, rollback.
