# GMWW — Ngừng tự chạy 4 workflow deploy một lần (04/11/2026)

**Phạm vi:** chỉ CI. Không đổi Worker, Runtime, IPA, dữ liệu, URL.

## Lý do
4 workflow deploy viết riêng cho các PR đã merge vẫn tự chạy sau mỗi lần push `main`:
`deploy-pr743-chat-worker`, `deploy-demo-transport-677`, `deploy-player-receipt-hotfix`, `deploy-player-web-login-v3273`.
Cổng khóa đúng phạm vi PR cũ không còn khớp `main`, nên chúng **chưa từng deploy chồng** lên Production.
Tuy vậy, chúng chạy thừa và báo đỏ liên tục: trong 20 lần gần nhất, PR743 fail 11 lần, V3.273 login fail 20/20.

## Thay đổi
- Trigger chuyển sang chỉ `workflow_dispatch`. File và các cổng an toàn được giữ nguyên để tra lịch sử.
- Đường deploy Production còn lại, cùng nhóm `gmww-production`:
  - **GMWW V3 Worker and Player Web Delivery** cho thay đổi Worker và Player Web.
  - **Deploy Production** cho Runtime.
  - `deploy-village-legacy-online-pr612`
- `tests/demo-transport-677-release.test.mjs`: kiểm trigger chỉ chạy tay, vẫn giữ kiểm các cổng phát hành.

## Rollback
Revert PR.
