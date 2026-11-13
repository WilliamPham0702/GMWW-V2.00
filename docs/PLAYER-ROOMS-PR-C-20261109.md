# Phòng online do người chơi tạo — PR-C: chủ phòng set-up và chia vai phía server (09/11/2026)

Phạm vi: chỉ Worker, chỉ phòng người chơi. Phòng GM, offline, DEMO không đổi.

## API chủ phòng (`Authorization: Bearer <ownerToken>`)
| Gọi | Việc |
|---|---|
| `GET /api/player-rooms/templates` | Danh sách Ván Mẫu do GM đã đăng (cần đăng nhập) |
| `GET  /api/player-rooms/:mã/owner/state` | Phòng, người chơi, bộ bài (tên vai + số lượng). Không có phân vai |
| `POST /api/player-rooms/:mã/owner/template` `{templateId}` | Nạp Ván Mẫu: cấu hình + thẻ vai từ kho mẫu |
| `POST .../owner/room-settings` | Chỉ `roomName`, `seatCount`, `seatMoveMode`; không đổi được chế độ/demo |
| `POST .../owner/seats-randomize`, `.../owner/seat-lock` | Xếp ghế còn lại ngẫu nhiên, chốt/mở chốt ghế |
| `POST .../owner/kick` `{loginId}` | Mời người ra (không tự kick được) |
| `POST .../owner/start` | Chia vai ngẫu nhiên, bắt đầu ván và đêm 1 |

## Đảm bảo
- Quyền chủ phòng kiểm tra trong chính Durable Object (hash `ownerToken`); token GM không dùng được ở đây, token chủ phòng không dùng được cho các hàm GM.
- Chủ phòng chỉ gọi được danh sách trên; các hàm GM (phân vai, cấu hình, kết thúc, reset…) không có đường vào.
- Chia vai bằng shuffle mật mã; mỗi người đúng một lá; số lá phải bằng số người ngồi. Phản hồi của `start` và `state` không chứa phân vai, nên chủ phòng không biết ai giữ vai nào.
- `start` chỉ chạy khi phòng ở lobby, ghế đã chốt, đã chọn Ván Mẫu và đủ thẻ vai; lỗi thì không thay đổi gì.
- Dùng đúng các hàm GM hiện có (`gmAssign`, `gmStart`, `applyCycle`) nên luật và dữ liệu giống ván do GM vận hành.

## Giới hạn của bản này
- **Chưa chia Artifact**: Ván Mẫu nạp vào phòng người chơi bị tắt Artifact; chỉ chơi bằng vai.
- Chưa tự kết thúc ván khi có phe thắng (PR-D).
- Chưa kiểm thử với dữ liệu Ván Mẫu thật trên STAGING.

## Kiểm thử
- `tests/player-room-owner-20261109.test.mjs` (19 test): chia vai, kiểm tra quyền, whitelist, không lộ vai/token, từ chối trạng thái sai, Worker chỉ lộ đúng các hành động của chủ phòng.
- Hồi quy liên quan GM handlers: 24 file + 3 file phòng người chơi, 331 test, 0 FAIL.
