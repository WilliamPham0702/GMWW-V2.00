# GMWW Runtime V3.249 — Phù Thuỷ, Say Rượu và Nhân Bản
Ngày phát hành ứng viên: 27/10/2026.

## Nội dung cập nhật
- **Phù Thuỷ:** thông báo vết Sói Cắn cuối cùng sau Yêu Tinh; hiển thị MỤC TIÊU trên nhân vật kể cả người đã được Bảo Vệ hoặc có Bất Tử Ban Đêm. Không có thông báo khi Sói Trùm bị Đóng Băng hoặc Đuổi làm vết Cắn vô hiệu. Mỗi bình Cứu/Giết dùng tối đa một lần/ván; được dùng cả hai trong một đêm, không tự động chuyển lượt khi dùng bình đầu.
- **Say Rượu:** đêm 1–2 không gọi, đêm 3 chỉ một lần thức trước Phù Thuỷ Già để nhận một vai đã chết; không có ai chết sẽ thành Dân Làng không năng lực. Vai và phe chuyển theo vai đã bốc. Khi bốc Sói, tính vào quyền bầy và hành động theo timeline đã chốt.
- **Nhân Bản:** đêm 1 chọn một người sống khác bản thân; khi mục tiêu chết, nhận vai/phe/năng lực từ đêm kế tiếp; khi chưa chết vẫn là Dân. Giữ nhân vật và Artifact cá nhân.
- Đồng bộ cấu hình lá vai hiện có, bảo toàn artwork/audio. Phát lá mới bằng private delivery snapshot, không lộ thông tin phe/vai lên kênh công khai.

## Kiểm thử và phát hành
- Kiểm thử thuộc phạm vi: `node --test tests/witch-drunk-clone-20261027.test.mjs tests/gmww-wolf-night-resolution.test.mjs tests/night02-pack-snow-guard-fairy.test.mjs tests/v389-night-runtime-integration.test.mjs`.
- CI Worker và gói GM đúng cùng commit; phát hành khi các kiểm thử bắt buộc SUCCESS.
- Gói Runtime OTA phải xác minh manifest, SHA-256 từng file, health API và kênh cập nhật.
- Giữ IPA shell V3.110, không migration/xóa tài khoản, Durable Objects, phòng hoặc lịch sử.
- Rollback: Worker/Runtime Production V3.248 (phiên bản Cloudflare đã xác minh trước phát hành), không downgrade hoặc xoá dữ liệu.

## Tình trạng
Ứng viên; chỉ thay thành ĐÃ PHÁT HÀNH khi xác minh Production và OTA thực tế thành công.
