# GMWW Runtime V3.284 — ỨNG VIÊN TÍCH HỢP PR #654 + #659 (CHƯA PHÁT HÀNH)

Ngày 31/10/2026. Đây là nhánh thử nghiệm, không merge/deploy Production tự động.

## Phạm vi
- Giữ nguyên mã Audio Tên/Full, Play/Thay thế/Xóa an toàn từ PR #654, QA V3.283.
- Tích hợp PR #659: khi Runtime mới hơn Server, cảnh báo LỆCH PHIÊN BẢN thay vì ĐÃ ĐỒNG BỘ; HEALTHY CHECK yêu cầu cả ba phiên bản khớp.
- Chặn Runtime OTA cũ/bằng phiên bản đang chạy, không tự hạ cấp.
- Đồng bộ VERSION V3.284 tại Worker, GM, HTML, package/lock và ghi chú OTA.
- Không sửa IPA native, Oracle, Durable Objects, dữ liệu, luật chơi hoặc Player Web.

## Nguồn gốc SHA
- File V3.283 người dùng đã gửi: f89328760f9b0bfd0238d8324518618884588d412e62cb872f163429e624de67.
- GitHub Actions QA #13026290815: fea3820fc5c2ed0f6b0efe99c08afc8989a083f64a2bcb81f187979d387c9633.
- 276/276 thành phần trong hai file khớp nội dung; chỉ khác metadata văn bản manifest.
- Chưa có gói V3.284 hoặc checksum phát hành, không dùng lại checksum V3.283.

## Điều kiện bắt buộc
1. Kiểm thử audio PR #654 và drift PR #659; bundle 7 modules byte-for-byte, Worker/version, OTA.
2. Required CI SUCCESS tại HEAD tích hợp; không né full suite khi ngoài phạm vi whitelist.
3. Preview QA trên iPhone Safari/Chrome/Edge, xác nhận Update Manager, HEALTHY CHECK, audio và hành vi không hạ cấp.
4. Sau nghiệm thu tạo gói .gmwwupdate, SHA-256, release notes tiếng Việt và rollback đã xác minh; mới được merge/deploy.
5. Không trùng tag V3.283, không làm Runtime máy người dùng hạ về V3.280.

## Rollback
- Duy trì Production V3.280 và giữ nguyên các bản gốc V3.280/V3.283. Không tự hạ cấp Runtime đang chạy V3.283.
- Nếu thử nghiệm lỗi, dừng phát hành, quay lại commit đã nghiệm thu phù hợp và không reset DO/dữ liệu/IPA.
