# GMWW — Ghi chú thay đổi chức năng Lên Giàn (PR #457 — chưa phát hành)

Ngày chuẩn bị: 24/10/2026. Phạm vi: Online / Offline / DEMO dùng chung Core Server.

## Những gì được thay đổi

1. Kết quả đề cử và bỏ phiếu được tính tại Core Server, không tự cộng từ màn hình GM. Snapshot `gallows_updated` có thêm `rosterStats` cho mỗi người đủ điều kiện, gồm số đề cử và tỷ lệ, số phiếu Cứu/Giết, cấm đề cử và cấm vote (kể cả cấm bởi Artifact).
2. Bảng GM Lên Giàn bằng chiều ngang menu trên, nền trong, danh sách tất cả người đủ điều kiện sắp giảm theo số đề cử, cho xem thống kê ngay từng người.
3. Chọn chế độ TỰ ĐỘNG / GM THỦ CÔNG trong hộp mở rộng thu gọn. Chỉ hiện người lên giàn khi chế độ cần GM chọn, các hành động và kết luận tiếp tục dùng server có sẵn.
4. Khôi phục phiếu/ván trong phạm vi Lên Giàn; hỏi xác nhận khi khôi phục một kết quả đã chốt. Không tự xóa hiệu ứng từ Vai Trò khác.
5. Ba vị trí audio kết luận có sẵn trong **Thư viện → Âm thanh → Hệ thống** được liên kết với nút điều hướng từ Lên Giàn:
   - `audio_system_gallows_vote_result` — công bố số phiếu.
   - `audio_system_gallows_result_dead` — người lên giàn chết.
   - `audio_system_gallows_result_saved` — người lên giàn sống.

Các audio chưa có file phải được tải lên các vị trí tương ứng. **Hiện thao tác “Thay thế” trong thư viện lưu tệp qua IndexedDB của thiết bị, không phải tự động upload lên Cloudflare/Production.** Không tạo URL upload giả; cần công việc riêng nếu muốn lưu audio thực sự trên server dùng chung nhiều thiết bị.

## Ranh giới và bảo toàn
- Không thay schema Durable Object, không chỉnh dữ liệu phòng hoặc ván đang chơi.
- Không tự merge/triển khai Production. Runtime/IPA hiện có giữ nguyên.
- Core Server tiếp tục xác minh GM/member, giới hạn phiếu, áp dụng Artifact cấm vote và chỉ phát thông báo realtime `gallows_updated` theo trạng thái được lưu.
- Rollback: revert PR #457 trước đợt phát hành; client cũ bỏ qua thuộc tính `rosterStats` nên tương thích.

## Kiểm thử đúng phạm vi
- `node --test tests/gallows-statistics.test.mjs tests/gallows-redesign-live.test.mjs tests/v3189-fire-gallows-voting.test.mjs tests/v3192-gallows-dual-mode.test.mjs tests/v3148-gallows-integrity.test.mjs`
- `node --test tests/gmww-gm-app-source-modules.test.mjs` cho toàn vẹn bundle; `node --check server-game/current/app.js` cho cú pháp.
- Chỉ kết luận PASS khi workflow/test có bằng chứng chạy thành công. Không tính Chrome role-card, seat 30, hình nền là nghiệm thu Lên Giàn.
