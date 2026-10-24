# GMWW Task #444 — Đồng bộ menu GM với đống lửa Ngày và Đêm

## Phê duyệt
Người dùng: “Chuyển menu GM ra đống lửa ban ngày đồng bộ với hình làng ban đêm luôn” → “Tiếp tục triển khai > Đưa thành task để chọn”.

**Theo dõi:** https://github.com/WilliamPham0702/GMWW-V2.00/issues/444

## Thay đổi
- Menu Công cụ GM sử dụng cùng vùng chạm `play-core-pearl`/đống lửa trên cả bối cảnh Ngày và Đêm.
- Khi mở menu từ bất kỳ nơi nào trong giao diện trận (`renderPlayBattle`), đồng bộ lại vị trí đống lửa **theo pha hiện tại** trước khi đo vị trí thực tế và bố trí menu. Tránh đo sai điểm neo khi giao diện vừa đổi nền/pha hoặc phát sinh rerender độc lập.
- Tiếp tục dùng `villageScenePublished.fireAnchors.day` / `.night` có sẵn. Từng ảnh nền có tọa độ riêng; không ghi đè vị trí Đêm khi đặt vị trí Ngày.
- Không thay đổi các lựa chọn tác động GM, vùng vote, luật/nhân vật/Seat, lưu dữ liệu hay cơ chế kéo menu thủ công.
- Khi GM đã kéo menu, vị trí kéo được giữ trong cùng giai đoạn; chuyển Ngày↔Đêm reset về điểm neo của ảnh mới theo cơ chế hiện hành.
- Không thay đổi Player Web hoặc IPA shell.

## Kiểm thử
- `tests/task444-gm-day-night-fire-anchor.test.mjs`: nguồn ghép thành công, code đang chạy khớp source parts, vùng chạm đúng, có neo riêng từng ảnh và reset khi đổi pha.
- `tests/task444-gm-day-night-fire-webkit.mjs`: iPhone WebKit 390 × 844, chuỗi chuyển Ngày→Đêm→Ngày→Đêm→Ngày với 4 điểm neo khác nhau, không che đống lửa, menu nằm gần đống lửa và trong khung màn hình.
- Giữ các test hiện hữu `v3189-pirate-fire-webkit`, `v3190-fire-image-calibration-webkit` để không làm mất hiệu lực chức năng Đề Cử và ĐỊNH VỊ 🔥.
- Kiểm thử thủ công khi chưa có tọa độ đống lửa cho một ảnh tùy chỉnh: cần **ĐỊNH VỊ NỀN NGÀY/ĐÊM** cho từng ảnh một lần; không tự suy diễn vị trí lửa từ ảnh chưa hiệu chỉnh.

## Điều kiện phát hành
- CI SUCCESS gồm Worker, Browser WebKit, Backup Integrity; so sánh mã nguồn ghép `server-game/current/app.js` và `server-game/src/*.part`.
- Chỉ merge/triển khai Production khi chủ dự án chấp thuận và có bản Runtime với số phiên bản OTA tăng hợp lệ + release notes, checksum SHA-256.
- Nghiệm thu trên iPhone thực tế: chạm vào đống lửa **ban ngày** hiện menu GM đúng gần vị trí, chuyển **ban đêm** cũng đúng, đóng menu và mở lại; không tác động game đang chạy.
- Bảo toàn hoàn toàn Production, phòng, game history, Seat, vai trò và Artifact.

## Rollback
- Trước merge: đóng PR, không tác động Production.
- Sau phát hành: dùng deployment Worker trước đó đã xác minh; với máy đã nhận OTA, sửa bằng bản tiến tiếp, không phát hành đè cùng version.
