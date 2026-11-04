# GMWW Runtime V3.300 — Đổi chế độ phòng sau Tập hợp

Ngày: 04/11/2026

## Lỗi đã sửa
- Gọi người vào làng và Chốt vị trí xong thì nút Chế độ bị khóa, không đổi được Online/Offline/Demo.
- Phòng vừa chơi xong (hoặc vào lại phòng cũ đang ở DEMO) báo "Để đổi sang hoặc rời DEMO…" nên bị kẹt ở chế độ cũ.

## Nguyên nhân gốc
- Server chỉ cho đổi DEMO khi phòng trống, chưa Chốt và chưa từng bắt đầu ván.
- GM Runtime khóa nút Chế độ khi `seatsLocked`.

## Thay đổi
- Server: chỉ khóa đổi DEMO khi ván đang diễn ra hoặc đã Phân Vai mà chưa kết thúc; khi đổi thì xóa demoLease/demoClock/demoPlan cũ.
- GM: nút Chế độ chỉ khóa khi ván đang chạy.
- Không đổi IPA, DO, URL, dữ liệu người chơi, lịch sử ván.

## Rollback
- Khôi phục Runtime V3.299 từ GitHub Releases và Worker version trước; không xóa dữ liệu.
