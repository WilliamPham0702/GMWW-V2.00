# GMWW V3.197 — Đưa IPA V3.196 vào mục Tải file IPA (23/10/2026)

## Hiện trạng
- GitHub Release `gmww-v3.196` đã có IPA từ build main [39987895041](https://github.com/WilliamPham0702/GMWW-V2.00/actions/runs/39987895041).
- Sau khi PR #433/#434 được merge, tệp `update-system/published-ipa.json` vẫn ghi V3.179. Đây là lý do `manifest.ipa` và nút TẢI FILE IPA của GM vẫn chỉ chọn V3.179.
- Đối chiếu GitHub asset: `GMWW-V3.196.ipa`, dung lượng **136084529** bytes, SHA-256 **5e8b18d118a83357759fbc90430e0d943dac2b1f67b5d4d224dfeffec8a5da33**; build SHA `9bd006732876c607fc6ccd3ad145edebc3f8c354` tương ứng tệp mới nhất sau khi release upload lại.

## Thay đổi
- Cập nhật chứng cứ phát hành `published-ipa.json` để Runtime chọn đúng IPA V3.196.
- Tăng Runtime lên V3.197 (Worker, IPA Web runtime, HTML, package/lockfile, cache-bust và revision kênh) để triển khai OTA có phiên bản mới, tránh thay đổi ngầm manifest V3.196.
- Giữ nguyên IPA shell Xcode V3.110. Chỉ siêu dữ liệu nút tải thay đổi; **không phát hành IPA V3.197**, không thêm camera, không thay dữ liệu game.
- Bổ sung kiểm thử hồi quy: tải đúng tên/url/SHA/size V3.196, không hạ phiên bản hoặc nâng điều kiện minimum shell.

## Kiểm thử / quy trình
- Chạy kiểm thử Node, version guard, Worker dry-run và CI PR.
- Không merge hoặc triển khai Production trong PR này khi chưa được chủ dự án phê duyệt.
- Khi merge được phê duyệt và CI SUCCESS: cần Production V3.197 trả `/api/update/manifest` với `ipa.version:3.196`, `ipa.sha256` đúng; kiểm tra trên GM iPhone mục tải và thao tác tải.
- **IPA V3.196 unsigned** ở pipeline hiện tại. Muốn cài trên iPhone thật cần quy trình ký ứng dụng hợp lệ; tệp tải không đồng nghĩa đã cài được.

## Rollback
- Nếu lỗi OTA, giữ Production phiên bản trước và các dữ liệu phòng chơi; revert trên nhánh riêng và phát hành version tăng tiếp theo qua CI. Không xóa dữ liệu, phòng, storage Cloudflare.
