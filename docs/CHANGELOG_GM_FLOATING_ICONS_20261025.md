# Ghi chú thay đổi — GMWW: icon nổi độc lập (25/10/2026)

**Phê duyệt phát hành:** chủ dự án đã duyệt bỏ nghiệm thu STAGING, ứng viên Runtime OTA **V3.224**, kế thừa V3.223 Arena 3D Home (không đổi IPA). Chỉ xem như Production đã phát hành sau khi có log triển khai và xác minh edge thực tế.

1. **Player Web:** đổi cờ đề cử sang emoji 🚩 (48 × 48 px, không khung); giữ cơ chế hút Character, xem trước, OK và Khôi phục. Không thay quyền đề cử hoặc phiếu Server.
2. **GM DEMO:** 📗 → 🐦‍🔥; icon đứng độc lập, có thể kéo/thả, mặc định thu gọn; chạm để mở bảng quan sát và lịch sử DEMO.
3. **GM thống kê phe:** ⚖️ → 🌈; tách khỏi thanh dưới; sửa vùng nhận chạm và khả năng mở bảng thống kê/dự báo từ dữ liệu GM.
4. **Thông cáo Làng:** biểu tượng 🏖️, lớp nổi có thể kéo/thả; giữ nội dung Thông cáo và audio.
5. **Lên Giàn:** biểu tượng ⛱️, lớp nổi có thể kéo/thả; giữ các bước đề cử, bỏ phiếu, chốt kết quả.

Các icon GM lưu tọa độ tương đối tại **localStorage của thiết bị**, không gửi lên Server; tự giới hạn trong viewport để tránh biến mất khỏi màn hình. Không thay đổi gameplay/DO/dữ liệu/IPA.

## Kiểm thử đúng phạm vi
- `node --test tests/gm-free-floating-shortcuts-20261025.test.mjs tests/gallows-flag-snap-v3206.test.mjs tests/gallows-pirate-ui-v3205.test.mjs`
- Xác nhận thủ công trên iPhone: chạm mở/đóng từng icon, kéo icon không kích hoạt nhầm, vị trí còn sau tải lại; thử 📗→🐦‍🔥 lúc DEMO; 🌈 mở số liệu phe; 🚩 kéo/OK/Khôi phục.

## Hoàn tác
Revert PR này để khôi phục UI trước đó. Khóa localStorage mới `gmww_battle_free_icons_v1` không ảnh hưởng trạng thái trận hoặc Server; có thể giữ nguyên khi rollback.
