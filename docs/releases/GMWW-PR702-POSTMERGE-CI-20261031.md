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
