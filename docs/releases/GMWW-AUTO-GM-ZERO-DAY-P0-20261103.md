# GMWW Auto GM – bản sửa thời gian 00:00 (03/11/2026)

## Lỗi tái hiện trên workerd thực
- V3.293 Worker sau PR #766 có thể tự chuyển hai lượt đêm bình thường.
- **FAIL tái hiện:** cấu hình `villageDiscussionSec:0` làm Auto GM dừng ở `morning-1` mãi dù đồng hồ 00:00; `dayDeadlineAt` rỗng và `autoAdvanceDue()` trả `0`, khiến Durable Object không có lịch chuyển ngày.

## Cách sửa
- Tính thời điểm hết hạn từ `cycleStartedAt + duration` kể cả khi `durationSec===0`; Auto GM bật sẽ đi tiếp ở callback alarm.
- Không đổi cấu hình thời gian đang lưu, không thay Player Web, ba chức năng đã ĐẠT, IPA, DNS, Cloudflare B hoặc dữ liệu thật.
- Bài kiểm thử E2E tạo phòng/ván giả trên **workerd cục bộ**, dùng heartbeat thực, kiểm tra Server tự chuyển 2 lượt đêm và chuyển ngày 0 giây **không cần GM đọc trạng thái**.

## Phát hành / rollback
- Chỉ merge & phát hành Worker-only sau khi CI required SUCCESS trên HEAD cuối và E2E mới PASS.
- Nếu bất thường, rollback về Worker version trước hotfix theo pipeline có snapshot; không reset phòng hay xóa dữ liệu.
