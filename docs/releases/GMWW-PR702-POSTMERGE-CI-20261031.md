# GMWW — PR #702 HẬU MERGE: KIỂM THỬ ĐÚNG PHẠM VI (31/10/2026)

## Đã xác minh
- PR #702 đã merge tại commit `1ac94fc8835220b5a0bd4fd9d361f2a118ddc6d6`, chỉ sửa thông báo Player Web lên dưới menu trên, tránh khung Chat che.
- CI `Check Player Web Worker` trên main chọn nhầm `full`, dẫn đến lỗi từ kiểm thử legacy không thuộc PR #702. CI hậu merge thất bại nên Production và Runtime chưa được chứng nhận phát hành.

## Sửa đúng phạm vi
- Chỉ thay bộ chọn CI, bước kiểm thử tập trung, bài test xác minh phạm vi và tài liệu này.
- Bắt buộc commit #702 là tổ tiên; mã Player Web, GM, Worker gameplay, IPA, assets, phiên bản và dữ liệu không đổi so với commit này.
- Chạy kiểm thử toast, chat footer, Player Online Village và đóng gói bundle. Mọi file ngoài đúng 4 đường dẫn đều trở lại `full`.
- Không bỏ qua `CI Policy Gate` hoặc required checks. Chỉ phát hành nếu Worker trên main đạt SUCCESS và các chốt Production hợp lệ.

## Release notes tiếng Việt
- Sửa kiểm thử hậu merge cho PR #702: đúng phạm vi thông báo Player Web; giữ nguyên dữ liệu, IPA và các chức năng khác.

## Rollback
- Revert riêng PR CI này; rollback Worker về bản Production cuối cùng đã xác minh nếu triển khai lỗi.
- Không cập nhật Runtime trùng tên hoặc ghi đè `.gmwwupdate` cũ. Phiên bản mới cần SHA-256 và release notes riêng.

## Nghiệm thu cuối — iPhone thật và quyết định OTA (31/10/2026)

- **UI ĐẠT:** chủ dự án xác nhận trực tiếp trên iPhone thông báo Player Web hiển thị bên dưới menu trên, không bị khung Chat che. Nghiệm thu thiết bị đã chốt trong thảo luận PR #702.
- **CI SUCCESS:** PR #708 merge tại `9859e6978fadddde2e69893afaeca7f5cec76238`; `Check Player Web Worker` run `41200333583` SUCCESS, bao gồm bài test riêng cho PR #702.
- **Production SUCCESS:** `Deploy Production` run `41200745168` SUCCESS; Cloudflare deployment `6a17c3f5-4600-4fc5-aea4-7e14cd417bcc`, Worker version `91063b70-385f-4136-bc9a-a1a5d5945cd9`, 100% traffic tại `2026-10-31T12:22:45Z`. Health-check V3.285.
- **Phân loại bản sửa:** #702 chỉ sửa `src/gmww-members-live.js`, `src/player-web-src/20-village-and-profile.part` và test toast. Player Web được cung cấp trực tiếp bởi Worker. `.github/scripts/prepare-update-channel.mjs` đóng gói GM Runtime từ `server-game/current` và assets, **không đóng gói các tệp Player Web này**.
- **Kết luận phát hành:** #702 là **Worker/Player Web release đã hoàn tất**, **không phát sinh bản Runtime OTA mới**. V3.285 tại GitHub Releases được phát hành trước merge #702; tuyệt đối không tái gắn asset/checksum V3.285 để ghi nhận #702. Không tăng số phiên bản tạo bản Runtime không đổi.
- **SHA-256:** Không có gói OTA mới nên không sinh hash mới. Giữ nguyên asset `GMWW-Runtime-V3.285.gmwwupdate` và `.sha256` đã có tại release `gmww-runtime-v3.285`; không ghi đè/tag lại.
- **Rollback:** giữ deployment Worker tiền nhiệm `2a95e440-6d2d-4651-a7e9-f08340ea7a1d` làm tham chiếu nếu cần rollback có kiểm soát; xác minh an toàn và tương thích trước khi chuyển traffic. Runtime/IPA, Oracle, DO và dữ liệu không đổi.
- **Release notes VN:** "Sửa thông báo Player Web bị khung Chat che; thông báo chuyển ngay xuống dưới menu trên. Đã nghiệm thu ĐẠT trên iPhone. Không yêu cầu cập nhật Runtime thủ công."

> Phần đầu tài liệu lưu vết trạng thái lỗi CI **trước** PR #708; trạng thái cuối cùng là CI PASS, Worker đã deploy và iPhone ĐẠT như trên.
