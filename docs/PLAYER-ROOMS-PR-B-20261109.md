# Phòng online do người chơi tạo — PR-B: phòng trống 30 phút tự xoá (09/11/2026)

Phạm vi: chỉ Worker, chỉ phòng người chơi (`meta.playerRoom`). Phòng GM và offline không đổi (vẫn hết hạn sau 72 giờ không dùng).

## Quy tắc
- "Có người" = ít nhất một người chơi có heartbeat trong 70 giây (cùng chuẩn `publicPlayer().online`). Ghế của người offline vẫn được giữ, chỉ việc cả phòng không còn ai mới bắt đầu tính giờ.
- Không còn ai → ghi `meta.emptySince`. Có người quay lại → xoá mốc này.
- Trống đủ **30 phút** → phòng bị xoá (cùng đường xoá hiện có: dọn dữ liệu, đóng websocket) và bản ghi trong danh sách phòng bị gỡ.
- Phòng mới tạo tính là trống từ lúc tạo: không ai vào trong 30 phút thì tự xoá.
- Alarm của phòng người chơi lấy mẫu hiện diện tối đa mỗi 5 phút, nên thời điểm xoá thực tế là 30–35 phút sau khi trống.
- Ván đang chạy bằng AutoGM không giữ phòng trống sống lâu hơn: khi đã hết hạn, alarm bỏ qua bước tự chạy tiếp và xoá phòng.

## Dọn dẹp
- Khi phòng hết hạn: xoá `roomdir:` của phòng khỏi danh sách; `playerroom:` (chủ phòng) bị xoá cùng.
- Khi danh sách phòng tự dọn bản ghi quá hạn: xoá luôn `playerroom:` tương ứng.

## Không đổi
- Phòng GM, offline, DEMO: không thay đổi hành vi hay trường dữ liệu.

## Kiểm thử
- `tests/player-room-expiry-20261109.test.mjs`: chính sách hiện diện/đồng hồ trống, các phương thức DO thật, wiring alarm.
- Hồi quy liên quan alarm/hết hạn/directory: 22 file, 189 test, 0 FAIL.
