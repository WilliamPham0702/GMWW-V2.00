# Quy trình làm việc GMWW V2.00 — GM trực tiếp nghiệm thu Production

**Quyết định của GM (2026-10-11):** Áp dụng quy trình phát triển trực tiếp và phản hồi liên tục cho mọi yêu cầu chỉnh sửa GMWW V2.00.

## Chu trình mặc định

1. GM vào game, gửi yêu cầu thay đổi hoặc ảnh chụp màn hình.
2. Kỹ sư đọc **main mới nhất**, thay đổi đúng phần được yêu cầu, không tự mở rộng phạm vi.
3. Commit trực tiếp **main**, không lập nhánh thử nghiệm hoặc đòi GM phê duyệt PR cho từng sửa đổi.
4. Chạy kiểm tra kỹ thuật tối thiểu tự động để không đưa code lỗi hoặc bản build hỏng lên server; không trì hoãn nhiều vòng chỉ để mô phỏng nghiệm thu của GM.
5. Triển khai Cloudflare Production và phiên bản server GM; kiểm tra kết quả deploy, thông báo đúng trạng thái.
6. **GM tự kiểm thử trên game Production**, gửi nhận xét/lỗi; kỹ sư sửa và lặp lại từ bước 2. Không yêu cầu GM test staging riêng.

## Bảo vệ dữ liệu không được bỏ qua

- Không xóa/reset/migrate phá hủy dữ liệu Production, phiên đang chơi, Player Web, LocalStorage/IndexedDB, Ván Mẫu, Vai Trò, Artifact, Artwork, cài đặt và phiên bản IPA.
- Không hạ phiên bản Runtime, không ghi đè các cập nhật khác từ nhánh cũ lên main, không bỏ qua cảnh báo phá dữ liệu hoặc sai chữ ký OTA.
- Khi người dùng nói “cưỡng ép đẩy lên Production”, ưu tiên phát hành **các thay đổi thực sự đã được viết**; không báo tính năng chưa xây dựng là hoàn tất.
- Nếu deploy không thành công, báo rõ lỗi và khắc phục; không báo SUCCESS khi chưa được GitHub Actions/Cloudflare xác nhận.
- Các chức năng mới chưa hoàn chỉnh phải được ghi rõ để GM biết phạm vi có thể test, nhưng không lấy đó làm lý do giữ tất cả thay đổi khác trên nhánh thử nghiệm.

## Báo cáo ngắn gọn

Thông báo cho GM: (1) sửa gì, (2) commit/runtime, (3) trạng thái Production đã xác minh, (4) link Production để vào thử, (5) phần nào chưa có.
