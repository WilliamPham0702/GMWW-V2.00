# Sửa Artifact ban đêm và Tráng Gương (07/11/2026)

## Triệu chứng
- Kéo Artifact vào người chơi ban đêm: lá bị tính là đã dùng nhưng không có tác dụng.
- Tráng Gương (và 8 lá khác): không sao chép được chức năng, không có lượt hoạt động thêm cho chủ lá.
- Player Web có thể đứng khi lời gọi hành động không trả về.

## Nguyên nhân gốc
- 9 Artifact cần xử lý lưu trữ (01, 03, 10, 16, 17, 23, 25, 31, 32) chỉ được xử lý ở nhánh BAN NGÀY (`gmDayAction` → `artifactStoragePlan`). Nhánh BAN ĐÊM (`gmBattleAction`) chỉ ghi một thông báo và trừ lượt.
- Hàng lượt đêm dựng một lần lúc bắt đầu đêm, nên không bao giờ có lượt "Tráng Gương".
- Lời gọi `/action` của Player Web không có thời hạn.

## Thay đổi
- Ban đêm dùng chung kế hoạch xử lý Artifact với ban ngày (`nightStorageArtifact`). Không hợp lệ thì hoàn lại lượt, không ghi gì.
- Tráng Gương mới (đã chốt 1B): chủ chọn một người ở lượt đầu ván; server lưu liên kết `mirrorLink`, chèn lượt "Tráng Gương" ngay sau lượt vai bị sao chép (đêm đó nếu lượt còn ở phía sau, và MỌI đêm sau). Chủ nhận các chức năng chủ động của vai đó (trừ Cắn của Bầy Sói). Vẫn được gọi khi chủ đã chết hoặc hết Artifact. Không sửa thẻ vai của chủ.
- Player Web: lời gọi hành động có thời hạn 20 giây, báo lỗi rõ và mở khoá giao diện.

## Kiểm thử
- Mới: `tests/artifact-night-storage-mirror-20261107.test.mjs` (7 test: tái hiện lỗi, dùng được ở lượt mới, các đêm sau, không trừ lượt khi lỗi, Hắc Ngọc Hủy Diệt ban đêm).
- Hồi quy đúng phạm vi: night runtime, artifacts batch A/B/C, night02, unified night artifacts, demo night, villager wakeup.
- Chưa kiểm: iPhone thật, Player Web trên trình duyệt thật.

## Phát hành và rollback
- Chỉ Worker/Player Web (không đổi Runtime/IPA, không migration DO, không xoá dữ liệu).
- Ván đang chạy trước bản này: Tráng Gương cũ đã sao chép vào thẻ vai sẽ không còn tác dụng; hãy bắt đầu ván mới.
- Rollback: revert PR rồi deploy lại Worker.
