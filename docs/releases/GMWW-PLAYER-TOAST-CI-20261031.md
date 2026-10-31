# GMWW — BỘ CHỌN CI RIÊNG CHO THÔNG BÁO PLAYER WEB (31/10/2026)

- Chỉ sửa chính sách CI cho PR #702 (thông báo Player Web nằm dưới menu trên, tránh Chat che khuất).
- Lỗi gốc: `check-player-web.yml` coi thay đổi `src/gmww-members-live.js` là không xác định và tự chạy `npm run check` với nhiều kiểm thử legacy ngoài phạm vi; CI tổng hợp báo FAIL không liên quan đến ba kiểm thử notice đã PASS.
- Đã bổ sung bộ chọn fail-closed, xác minh **chính xác 3 file** gồm source toast, bundle đã đóng gói và bài test, bảo đảm các byte ngoài hàm toast bất biến. Kiểm tra bundle khớp đúng phép thay và không thay đổi Chat hay gameplay.
- PR sửa routing chỉ chứa đúng selector, workflow, test CI và ghi chú này, không có Worker Production, dữ liệu phòng, IPA, OTA hay thay phiên bản.
- Chạy kiểm thử giao diện thông báo, Player Online Village và Chat footer; các thay đổi thêm vào gameplay/Worker không được dùng scope hẹp.
- **Production/merge:** vẫn phải được chủ dự án chấp thuận; không chạy deploy tự động từ PR này.
- **Rollback:** revert PR CI này; workflow quay về cơ chế định tuyến trước đó. Không cần khôi phục dữ liệu.
