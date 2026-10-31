# GMWW RUNTIME V3.286 — GM CHAT SAU KHÔI PHỤC (ỨNG VIÊN)

Ngày: 31/10/2026. Trạng thái: **chưa phát hành Production**; chỉ phát hành sau required CI SUCCESS trên HEAD cuối cùng và xác minh gói OTA.

## Thay đổi
- GM Server: chuyển icon **💬** vào ngay sau **Khôi phục** trong thanh điều khiển, chỉ hiển thị icon; giữ nhãn truy cập.
- Khung Chat GM gọn, nền mờ, cùng phong cách Player Web; nhấn ra ngoài để đóng; tin nhắn cuộn và ô nhập giữ hoạt động.
- Bảo toàn chính sách Chat mới từ PR #698 và cập nhật Player Web PR #699/#702 đã merge vào main. Không tự nhận có audio realtime PR #701 hay kéo trực tiếp lá Vai Trò/Artifact vì các thay đổi đó chưa merge.
- Tăng đồng bộ phiên bản Runtime, Worker, GM HTML, package lên V3.286 để tránh ghi đè tệp V3.285 đã phát hành.

## Điều kiện phát hành
1. Trước khi merge PR #700, chạy kiểm thử đúng phạm vi và required CI SUCCESS trên commit mới nhất; kiểm tra không xung đột main.
2. GitHub Actions xác minh bytes gói `.gmwwupdate`, SHA-256, metadata, đường tải Releases và rollback; không dùng cùng tag V3.285 cho nội dung mới.
3. Xác minh Worker Production/Runtime đã cùng V3.286; yêu cầu nghiệm thu thực tế trên iPhone sau phát hành. Không khẳng định kiểm thử iPhone nếu chưa thực hiện.

## Bảo toàn và rollback
- Không thay đổi IPA, Oracle STAGING, schema Durable Objects, dữ liệu phòng hoặc lịch sử.
- Rollback về Runtime V3.285 và phiên bản Worker Production liền trước nếu cần; không xóa dữ liệu. Khôi phục phải đối chiếu tương thích với dữ liệu đang có trước khi đổi Worker.
