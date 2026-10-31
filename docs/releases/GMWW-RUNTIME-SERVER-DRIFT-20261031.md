# GMWW — CẢNH BÁO LỆCH PHIÊN BẢN RUNTIME / SERVER (PR #659)

## Sự cố đã xác nhận (31/10/2026)
- iPhone chụp màn hình: IPA V3.275, Game Runtime V3.283, Server V3.280 nhưng báo “ĐÃ ĐỒNG BỘ”.
- GitHub main V3.280; hai tag GitHub Releases chính thức mới nhất đều là V3.280.
- Cloudflare Worker deployment 31/10/2026 00:39 UTC đã nhận 100% lưu lượng, khớp bản phát hành V3.280.
- V3.283 trên thiết bị chưa được kiểm chứng nguồn gốc hoặc SHA-256. Không khẳng định tương thích và không tự động hạ cấp.

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
