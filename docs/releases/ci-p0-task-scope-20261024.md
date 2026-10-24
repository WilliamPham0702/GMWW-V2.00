# CI GMWW — chỉ test phần liên quan trực tiếp lỗi P0 (24/10/2026)

## Yêu cầu bắt buộc
Một task lỗi phải có bài test tái hiện vấn đề, xác nhận đã sửa và hồi quy các chức năng trực tiếp chịu ảnh hưởng. Không tự chạy bộ Chrome/seat 30/nhân vật/DEMO nếu task không thay đổi các phần này.

## Thay đổi
- Bộ phân loại diff thêm scope **p0-roster**, chỉ chấp nhận các thay đổi thật sự nằm trong `RoomDurableObject.playerMove`, `join`, đoạn Player Web roster/Role/Artifact recovery và hai file test trực tiếp liên quan. Cơ chế fail-closed: bất kỳ thay đổi nào ngoài phạm vi đều chạy full.
- Khi PR được xác định p0-roster: **Check P0 Chrome Edge Realtime** chạy kịch bản nhận roster → GM Phát Vai → mở Role/Artifact → đề cử/👍👎 → refresh. `Check Player Card Browsers` bỏ qua bộ ghép DEMO/UI/30 nhân vật. `Check 30-Player Realtime` và Character Engine/V4 bỏ qua kiểm thử riêng không liên quan.
- `Check Player Web Worker` trên PR scope P0 chỉ chạy unit regression `player-web-p0-atomic-roster-role-release` và `player-web-resume-receipt-runtime`; Worker compilation/version/syntax vẫn kiểm tra.
- Giữ `npm test`, đầy đủ web browser/Character/seat trên `main`, `workflow_dispatch` hoặc khi thay đổi không đủ điều kiện thu gọn. Cổng phát hành Production vẫn yêu cầu Browser CI full trên chính commit main.
- PR chỉ thay đổi tests không tác động Native IPA; bỏ `tests/**` khỏi trigger build IPA (Native build vẫn chạy khi mã Native/GM thay đổi).

## Nghiệm thu CI
- PR #449 gồm đúng các file P0 được phân loại thành `p0-roster`; chỉ chạy Chrome/Edge P0 + Worker test liên quan, không yêu cầu screenshot DEMO/seat.
- Test giả thay đổi chung trong `src/index.js`, public card renderer hoặc workflow phải quay về `full`.
- Main/release: giữ toàn bộ kiểm tra, không nới điều kiện bảo vệ Production.

## An toàn / rollback
Thay đổi này chỉ tác động workflow, không đổi server runtime, IPA, schema, DO, phòng chơi hoặc lịch sử. Revert PR nếu bộ phân loại có vấn đề. Không tự merge/deploy Production.
