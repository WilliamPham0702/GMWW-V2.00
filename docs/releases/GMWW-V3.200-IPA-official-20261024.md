# GMWW — IPA V3.200 chính thức (24/10/2026)

## File phát hành có thật

- GitHub Release: https://github.com/WilliamPham0702/GMWW-V2.00/releases/tag/gmww-v3.200
- Tệp tải IPA: https://github.com/WilliamPham0702/GMWW-V2.00/releases/download/gmww-v3.200/GMWW-V3.200.ipa
- Tệp checksum: https://github.com/WilliamPham0702/GMWW-V2.00/releases/download/gmww-v3.200/GMWW-V3.200.ipa.sha256
- Kích thước IPA (API GitHub Releases): **136086393 bytes**.
- SHA-256 IPA (GitHub Releases asset.digest): **974cefca2dbff129d0f6c4bf50505f883814a9b9813b08199238f8bb4a2f4aa6**.
- Build GitHub Actions SUCCESS: https://github.com/WilliamPham0702/GMWW-V2.00/actions/runs/40070511661
- Source commit: `d2c8135df443d3e7ad00cb44c5b89a525dcb5018`.

## Nội dung

Đóng gói ứng dụng iOS từ mã nguồn chính thức GMWW Runtime V3.200. Bao gồm thiết kế lại Lên Giàn Online/Offline/DEMO, chọn Tự động/GM Thủ công, thống kê và tỷ lệ đề cử, số phiếu Cứu/Giết, cấm đề cử/cấm bỏ phiếu và Artifact, kết luận cùng các ID âm thanh chờ chủ dự án tải file lên. Kế thừa các sửa lỗi giao diện/đồng bộ V3.198–V3.199 đã phát hành.

## Hiển thị trên Server

Chứng nhận tại `update-system/published-ipa.json` được cập nhật từ file IPA **có thật** và digest GitHub. Manifest OTA Runtime V3.200 cần tiếp tục phát hành `releaseType: runtime`, `runtimeVersion: 3.200`, shell OTA nền V3.110, trường `ipa.version: 3.200` và URL IPA nêu trên.

## An toàn và rollback

Không ghi đè file IPA cũ hoặc bytes OTA V3.200. Giữ nguyên dữ liệu, phòng, lịch sử, Durable Objects, phiên bản Runtime và dữ liệu 3D nghiên cứu. Nếu Production không xác minh được SHA-256/manifest hoặc browser CI thất bại, giữ phiên bản đang chạy và khắc phục trong PR tiếp theo. Hệ thống có thể rollback Worker về deployment Production trước đó; không hạ phiên bản OTA đã phát hành.
