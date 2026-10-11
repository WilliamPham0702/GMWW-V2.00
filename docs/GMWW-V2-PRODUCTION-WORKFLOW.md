# Quy trình làm việc GMWW V2.00 — yêu cầu → Production → GM test

**Quyết định trực tiếp của GM ngày 2026-10-11.** Đây là quy trình mặc định khi xử lý các yêu cầu tiếp theo.

## Thứ tự chuẩn — giữ đúng nguyên văn ý GM

1. **ChatGPT nhận yêu cầu.** GM gửi mô tả hoặc ảnh màn hình.
2. **ChatGPT thực hiện task.** Đọc main mới nhất, sửa đúng yêu cầu, hoàn thiện chức năng, không tự mở rộng ngoài phạm vi.
3. **ChatGPT trả kết quả lên Server và Cloudflare Production.** Commit main, đóng gói Runtime/OTA nếu thay đổi phần ứng dụng, chạy kiểm tra kỹ thuật tối thiểu và xác minh deploy đã chạy; không nói đã cập nhật khi chỉ mới sửa GitHub hoặc server không có phiên bản mới.
4. **GM TEST VÀ PHẢN HỒI.** GM tự chơi bản Production mới trên IPA/Player Web, tự quyết định đạt hay chưa; không yêu cầu GM nghiệm thu staging hoặc nhánh thử.
5. **ChatGPT sửa tiếp** từ lỗi và yêu cầu mới, rồi tiếp tục chu kỳ.

**Không tạo nhánh test riêng; không trì hoãn release chỉ để chờ nghiệm thu thủ công.**

## Điều kiện bắt buộc khi cập nhật

- Bảo toàn dữ liệu game, trận đang chạy, LocalStorage, IndexedDB, Vai Trò, Artifact, Artwork, Ván Mẫu và cấu hình.
- Không reset database, không ghi đè nhánh code cũ lên main, không rollback runtime hay OTA, không làm gián đoạn những tính năng ngoài phạm vi.
- Mỗi thay đổi ở giao diện GM/IPA phải tăng và đồng bộ Runtime release version, gói OTA có SHA và ghi chú cụ thể. Khắc phục trường hợp cloud deploy thành công nhưng IPA báo 'không có gì mới' vì phiên bản không tăng.
- Không lược bỏ kiểm tra tối thiểu chống build lỗi, nguồn sai hoặc mất dữ liệu. Không gọi task hoàn thành khi chức năng chưa được lập trình hoặc chưa thật sự nằm trên Production.
- Báo cáo gọn: đã sửa gì, Runtime/commit, trạng thái Production xác minh, link test và hạng mục chưa có nếu cần.
