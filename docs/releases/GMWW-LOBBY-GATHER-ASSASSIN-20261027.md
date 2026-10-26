# GMWW — Luồng Sảnh chờ/Tập hợp & menu Sát thủ
Ngày 27/10/2026. Trạng thái PR Draft; chưa Production.

- Bỏ màn Tạo phòng khỏi 6 bước GM; phục hồi phòng cũ hợp lệ hoặc tự tạo phòng ngầm trong Tập Hợp.
- Room/GM token/Durable Object/lịch sử/ván cũ trên Server vẫn giữ nguyên; không migration hoặc xóa DO.
- Online/Offline/DEMO chuyển sang thanh Tập Hợp, vẫn nhấn luân phiên, dùng API room-settings và các bảo vệ Demo đang có.
- Sát thủ: 👍 👎 OK trên một hàng; luật lựa chọn bí mật và xác nhận không đổi.
- Có bài test riêng tests/lobby-gather-mode-assassin-20261027.test.mjs và kiểm tra parity app lắp ráp. Không kiểm thử Chrome Card, 30 Seat, IPA, 3D ngoài phạm vi.
- Rollback: revert commit Runtime này, bảo toàn DO/schema và lịch sử. Chỉ merge/deploy sau CI bắt buộc SUCCESS và phê duyệt.
