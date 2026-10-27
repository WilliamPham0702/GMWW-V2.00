# GMWW Runtime V3.252 — 16 nút Kiểm tra & bảo trì cùng size Healthy Check

Ngày 27/10/2026.

## Nội dung thay đổi
- Chuyển **16 nút kiểm tra/bảo trì** và ô **Tự kiểm tra 2 phút** thành phần tử trực tiếp của **một lưới ba cột**, loại bỏ cấu trúc nhóm lồng nhau gây phình chiều cao hàng trên iPhone WebKit.
- Tất cả **16 nút đều có cùng kích thước Healthy Check**, chiều cao **76px**, cùng độ rộng theo cột, bo góc/viền/nền; Cloudflare cũng vậy, biểu tượng mây thu nhỏ 17px.
- Bảo toàn nguyên trạng từng button HTML, mã ID, event handler, thông báo hệ thống, thao tác Cloudflare, chức năng DO/Server/Chẩn đoán và bật/tắt kiểm tra 2 phút.
- Bảo toàn toàn bộ luật và cài đặt Vai Trò V3.250, Runtime V3.251 và dữ liệu GM/Player Web, phòng, lịch sử, DO. IPA V3.110 không đổi.
- Phát hành Runtime OTA V3.252, SHA-256; rollback V3.251 nếu phát sinh lỗi, không migration/xóa dữ liệu.

## Kiểm thử
- Kiểm 16 IDs và handler giữ nguyên, 17 phần tử trực tiếp của lưới, CSS chiều cao/độ rộng đồng nhất, hai breakpoint.
- Verify fail-closed đúng 14 tệp, nguồn app tái lập, phiên bản Worker/GM đồng bộ, same-SHA Worker CI, manifest và health Production.
