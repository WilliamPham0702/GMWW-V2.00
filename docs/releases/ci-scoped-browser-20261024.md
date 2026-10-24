# GMWW — CI có chọn lọc theo phạm vi lỗi (24/10/2026)

## Nguyên nhân thời gian CI kéo dài
Trong các workflow cũ, thay đổi bất kỳ vị trí nào trong `src/index.js` hoặc `server-game/current/app.js` đều kích hoạt mọi bài browser của Chrome/Edge/WebKit, kể cả DEMO, Role/Artifact, 30 nhân vật và ghế. Task kết thúc ván không yêu cầu tất cả các bài này.

## Thay đổi
- Bổ sung `.github/scripts/ci-browser-scope.mjs` kiểm tra **nội dung thực sự thay đổi** so với SHA nền của PR, không chỉ tên tệp.
- Nếu thay đổi chỉ nằm ở luồng hoàn thành ván: chạy `match-completion*.test.mjs` và `forced-end-game.test.mjs`; bỏ qua nhóm browser, P0 realtime và bài 30 người không liên quan trong PR.
- Nếu nội dung khác phạm vi được nhận diện, thiếu SHA nền, đổi file không nhận diện hoặc sửa quy trình CI: **chạy đầy đủ**, không được âm thầm lược test.
- Check Player Web Worker (`npm test`) và kiểm thử/đóng gói IPA vẫn giữ nguyên.
- Push `main`, chạy thủ công (`workflow_dispatch`) và cổng kiểm thử trước Production vẫn phải chạy **đầy đủ** Chrome/Edge/WebKit; không nới gate an toàn phát hành.

## Giới hạn
Phiên bản đầu tiên nhận diện an toàn scope `postgame`/kết thúc ván; các loại task khác chưa chứng minh được phạm vi vẫn chạy full mặc định. Mở rộng lựa chọn chỉ sau khi có mapping và test đối chiếu cụ thể. Không dùng heuristic tìm từ khóa mơ hồ để bỏ test.

## Kiểm thử
`node --test tests/ci-browser-scope.test.mjs`: trường hợp chỉ thay đổi kết thúc ván được nhận diện; sửa đổi Worker ngoài `gmConfig`, thay đổi publicRoom liên quan seat, thay đổi UI ngoài completion, workflow/tests browser, xoá/đổi tên file phải chạy full.

## Rollback
Revert PR; không liên quan schema, runtime, IPA hoặc dữ liệu phòng. Không tự merge hoặc deploy Production.
