# GMWW Runtime V3.274 — Sửa checkout lịch sử cho Production (29/10/2026)

## Nguyên nhân
Workflow Production của commit `eed003a3` dừng tại bước xác minh merge #613 vì job `deploy-scope` checkout Git chỉ 2 commit (`fetch-depth: 2`), khiến Git không tìm thấy commit gốc `2171214c`. Lỗi này không thuộc artwork, Vai Trò, Worker hay gói OTA.

## Khắc phục
- Checkout đủ lịch sử (`fetch-depth: 0`) cho **riêng job xác minh deploy-scope** để Git kiểm tra được merge #613.
- Chỉ nhận diện 4 file CI, kiểm thử và release notes; từ chối bất kỳ mã game hoặc ảnh nào thay đổi.
- Tiếp tục xác minh chính xác Worker, Artifact, CI Stability trên SHA `main`; đối chiếu Role Card và Artifact SUCCESS trên commit PR #613.
- Đóng gói Runtime OTA V3.274 với manifest SHA-256 và file cập nhật thủ công, xác minh Production trước khi báo phát hành.

## Không thay đổi và rollback
- Không cập nhật IPA V3.264, Player Web logic, executor, audio, Durable Objects, dữ liệu phòng hoặc lịch sử.
- Nếu bất kỳ chốt CI, hash hoặc Production thất bại: không công bố phát hành; rollback Runtime về manifest V3.273 đã xác minh nếu cần.
