# GMWW Player Web — Hotfix đăng nhập Online Chat (28/10/2026)

## Nguyên nhân
- Sau merge Chat V3.266 (#588), `patchPrivatePlayerCards(gmwwMembersLiveScript)` kiểm tra chuỗi của bản Player Web cũ.
- Hai chuỗi bị thay đổi do hook Chat trong luồng khôi phục phòng và sự kiện `room_cycle`. Bộ vá ném `Offline private-card policy drift`, dẫn đến endpoint `/gmww-members-live.js` lỗi 500; trang HTML đăng nhập vẫn hiển thị nhưng `window.login` không được đăng ký nên nhấn nút không phản hồi.

## Sửa lỗi
- Đồng bộ chính xác hai điểm ghép của bộ vá Player Web với Chat V3.266; giữ nguyên kiểm tra fail-closed cho những biến động không dự kiến.
- Không bỏ hook Chat, không thay đổi tài khoản, thông tin xác thực, phòng, vai trò, Artifact, lịch sử, chính sách Chat hay dữ liệu Durable Objects.
- Mở lại JavaScript Player Web để người chơi đăng nhập, nhận thông báo lỗi hợp lệ, tiếp tục phòng, Chat và nhận sự kiện đổi Đêm/Ngày.
- Chỉ cập nhật Player Web/Worker chứa JS; không thay đổi IPA hoặc Runtime OTA, không tăng phiên bản Runtime.

## Kiểm thử bắt buộc
- `node --test tests/player-web-receipt-patch-hotfix.test.mjs tests/player-web-resume-receipt-runtime.test.mjs`
- Endpoint `/gmww-members-live.js` phải trả 200, đúng MIME JavaScript, `node --check` PASS; mã phải chứa `window.login=login` và hai hook Chat.
- Không chạy thử không liên quan đến thay đổi: 3D, ghế 30, IPA, kiểm toán toàn bộ lá.

## Rollback
- Nếu phát hành có lỗi, quay lại Worker deployment liền trước trên Cloudflare và giữ nguyên Durable Object, tài khoản, dữ liệu lịch sử; không xóa namespace hoặc phòng.
- Baseline trước sửa: main `6247a47a2d7c53fad99e0910575ca8733b3e4405`, Worker deployment `54691738-2cdb-4833-bd28-93e9a3c98518`.
