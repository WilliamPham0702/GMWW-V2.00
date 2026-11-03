# GMWW V3.293 – Auto GM Worker hotfix (03/11/2026)

## Thay đổi
- Khắc phục gốc: heartbeat của người chơi từng đặt báo thức dọn phòng, ghi đè lịch chuyển vai Auto GM; các thao tác phụ khi phòng đang chơi cũng được chuyển sang bộ hẹn ưu tiên deadline.
- GET trạng thái GM đã xác thực sẽ kiểm tra lịch hẹn đang tồn tại: nếu trễ/mất thì đặt lại; nếu đã đến hạn thì DO tự chuyển lượt.
- Thêm kiểm thử thực thi hàm scheduler có mô phỏng DO storage.
- Giữ nguyên các chức năng đã nghiệm thu ĐẠT: Sát Thủ 👍👎, realtime GM và vòng ⭐🔥.

## Phạm vi và an toàn
Chỉ thay Worker, không thay đổi Player Web, IPA, Runtime, URL, DNS, Cloudflare B, dữ liệu thật, hành động vai trò và quyền riêng tư.

## Triển khai
Chỉ merge khi required CI SUCCESS trên HEAD cuối; sau đó phát hành Worker Production qua pipeline hiện hành và kiểm tra trực tiếp phòng thử: Auto GM qua 2 lượt, 0 giây, bật/tắt, kết nối lại.

## Rollback
Phục hồi bản Worker Production trước hotfix qua quy trình phát hành; không reset phòng, không xóa lịch sử hoặc thay đổi IPA.
