# GMWW Runtime V3.184 — Release notes

**Ngày:** 22/10/2026  
**Loại phát hành:** Runtime OTA; **không xuất IPA mới**  
**Nguồn:** PR #404 (đã merge main) và PR phát hành V3.184.  
**Bản Production trước phát hành:** V3.183.  
**Ứng dụng iPhone:** tiếp tục dùng IPA đã cài, không thay đổi native shell V3.110.

## Có gì mới

- Cài đặt → Chủ Đề → Bối cảnh Làng: **bỏ XEM TRƯỚC** do cửa sổ xem trước không hỗ trợ trong IPA.
- Nút **ÁP DỤNG** thay cho XUẤT BẢN; áp dụng ảnh Ngày hoặc Đêm riêng lẻ, hoặc cả cặp. Ảnh còn lại được giữ nguyên.
- Nút **KHÔI PHỤC MẶC ĐỊNH** thay cho KHÔI PHỤC BẢN TRƯỚC; trở lại ảnh nền gốc có sẵn trong Runtime cho cả Ngày/Đêm.
- Số revision chỉ dùng để cache-bust, không còn hiển thị. Cloudflare Durable Objects chỉ giữ tối đa 2 ảnh tùy chỉnh đang sử dụng sau ÁP DỤNG, dọn dữ liệu ảnh lịch sử cũ.
- Người chơi trên Player Web tự đồng bộ nền đang áp dụng. Không thay đổi phân bố Seat hình tròn / thoi / chữ nhật 6–30 người và không thay đổi Character, luật, phòng hay dữ liệu ván.

## Nguyên nhân cần bump từ V3.183

Deploy Production cho PR #404 bị chặn tại guard: `Runtime source changed but candidate releaseVersion 3.183 does not advance beyond Production 3.183`. V3.184 tăng version đúng quy tắc OTA và bổ sung ghi chú để màn hình Cài Đặt hiện “Có gì mới”.

## Gate phát hành & nghiệm thu

- Chỉ merge khi CI Worker, WebKit/Browser, 30 Player, Character và Backup đều SUCCESS.
- Deploy Production phải SUCCESS; kiểm tra `/api/health`, `/api/update/manifest` trả về V3.184 và checksum tài nguyên Runtime.
- Kiểm tra **iPhone thật**: Cài đặt → Cập Nhật Hệ Thống → Cập Nhật Runtime, xác nhận Runtime/Server **V3.184** và ghi chú thay đổi.
- Kiểm thử ÁP DỤNG ảnh Ngày/Đêm và KHÔI PHỤC MẶC ĐỊNH trên GM IPA và Player Web; kiểm tra 6–30 Seat, Character không bị che và dữ liệu ván không đổi.
- Nếu CI hoặc deploy không đạt, không công bố đã phát hành; dùng quy trình rollback Worker/OTA với phiên bản và SHA đã xác minh.
