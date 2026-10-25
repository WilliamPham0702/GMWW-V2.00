# GMWW Runtime V3.213 — 10 icon mới đợt 3 (25/10/2026)

- Bổ sung 10 ảnh PNG và 10 SVG *riêng biệt* cho hành động: Phong ấn, Cấm bỏ phiếu, Cấm đề cử, Nguyền rủa, Ban phước, Cướp Artifact, Phản đòn, Tàng hình, Đặt bẫy, Thanh tẩy.
- Thư viện Icon có 29 hình. Giữ thiết kế thẻ gọn gàng V3.212: chỉ ảnh, tên, Sửa/Xoá, không hiển thị mã actionId tiếng Anh hay dòng kéo thả.
- Chỉ tự gán các actionId hiện diện trong dữ liệu thiết bị GM khi *tên hành động chính xác* khớp bộ danh sách ngữ nghĩa. Không đoán ID hoặc thay đổi luật Core. Các chức năng khác tiếp tục xuất hiện trong danh sách chưa gán.
- Có công cụ sao chép danh sách hành động chưa gán gồm actionId/owner để đối chiếu thực tế và làm các đợt icon kế tiếp.
- Giữ nguyên 19 icon cũ, lịch sử/chỉnh sửa trên iPhone bằng cơ chế chuyển đổi V2→V3, không làm mất dữ liệu tự tạo.
- Chỉ nâng Runtime OTA V3.213, không phát hành IPA, giữ native shell V3.110, có SHA-256 và rollback Runtime V3.212 khi cần.

Kiểm thử đúng phạm vi: `node --test tests/action-icon-library.test.mjs tests/action-icon-card-clean.test.mjs`, kiểm tra 29 ảnh PNG/SVG và SHA-256, kiểm tra script cú pháp và số phiên bản đồng bộ; không kiểm tra Chrome Card, ghế, Demo và IPA ngoài phạm vi.
