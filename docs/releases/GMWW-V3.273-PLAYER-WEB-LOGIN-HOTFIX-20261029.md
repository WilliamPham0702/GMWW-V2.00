# GMWW V3.273 — Sửa lỗi Player Web không đăng nhập được (29/10/2026)

## Nguyên nhân đã tái hiện
- HTTP GET `/gmww-members-live.js` gọi `patchPrivatePlayerCards(gmwwMembersLiveScript)` trước khi gửi JavaScript.
- Sau khi V3.273 thêm `renderPlayerTimeline`, `state.onlineActions` và `renderOnlineActionDock` vào luồng khôi phục phòng Online, điểm chèn trong `src/gmww-player-private-card-patch.js` vẫn dò chuỗi cũ.
- Bộ ghép ném lỗi `Offline private-card policy drift`, có thể khiến trang login hiển thị nhưng nút ĐĂNG NHẬP không hoạt động vì mã trang không tải được.

## Phát hiện bổ sung khi kiểm tra Chrome/Edge
- Kiểm thử trình duyệt ghi nhận `ReferenceError: room is not defined` trong `updatePlayerTopMenu()`, gây gián đoạn hiển thị sau đăng nhập/reconnect. Chuyển sang `playerScenePolicy(state.room)` và bổ sung bài test thực thi hàm với mô phỏng menu đang hoạt động.

## Điều chỉnh
- Đồng bộ đúng điểm chèn cho cả chuỗi nguồn và chuỗi đã được biến đổi; không thay đổi thuật toán xác thực, token, phòng, vai trò hoặc quyền riêng tư.
- Giữ nguyên cập nhật roster khi reconnect, Timeline, các hành động Online, Chat và DEMO.
- Bổ sung kiểm thử hồi quy buộc việc ghép JavaScript phải thành công, JavaScript phải biên dịch, `window.login=login` còn tồn tại, Online hooks không bị mất.

## Phạm vi kiểm chứng
- `node --test tests/player-web-receipt-patch-hotfix.test.mjs`
- `node .github/scripts/assemble-player-web.mjs --verify`
- `node --check src/index.js`
- `npx wrangler deploy --dry-run`
- Khi được phép triển khai: xác nhận GET `/gmww-members-live.js` trả HTTP 200, JavaScript `node --check` PASS, GET `/api/health` OK và kiểm tra đăng nhập/khôi phục bằng tài khoản thử an toàn.
- Không thử nghiệm các bộ gameplay, Seat, Character, Native/IPA không liên quan.

## Phát hành và rollback
- Worker/Player Web-only; giữ nguyên V3.273, Runtime OTA và IPA hiện có. Không thay đổi Durable Objects, dữ liệu, phòng, lịch sử hay cấu trúc tài khoản.
- Phát hành sau khi CI liên quan SUCCESS và được chủ dự án phê duyệt. Lưu Worker deployment/version đang Production ngay trước khi deploy.
- Nếu smoke sau triển khai thất bại, chuyển 100% traffic về Worker version đã lưu, không xóa dữ liệu DO.
