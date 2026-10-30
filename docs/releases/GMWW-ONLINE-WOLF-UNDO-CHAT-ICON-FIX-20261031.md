# GMWW Online — Vá lỗi Sói Cắn, Khôi phục, icon, Chat GM và thông báo (31/10/2026)

## Release notes tiếng Việt — bản ứng viên, chưa phát hành

1. **Sói Cắn:** bảo đảm icon Sói Cắn có hình chính thức dự phòng khi thư viện icon trên iPhone chưa tải, chưa đồng bộ hoặc cấu hình cũ không ánh xạ. Không mở rộng quyền hành động của người chơi; quyền vẫn do Server xác thực.
2. **Khôi phục:** sau khi GM xác nhận Sói Cắn (hoặc hành động đêm khác) và timeline tự chuyển lượt, Server cho phép hoàn tác *chính hành động cuối cùng* trong cùng đêm, chỉ khi dữ liệu đã xác nhận chưa bị một thao tác tiếp theo thay đổi. Khôi phục ledger và điều hướng về lượt gốc. Chặn hoàn tác khác ván, khác đêm hoặc khi có thay đổi trạng thái.
3. **iCon hành động:** các icon xuất hiện từ tọa độ đống lửa thực tế đang hiển thị thay vì phía trên menu dưới, vẫn kéo thả tự do, giữ logic hít Character và vùng thao tác độc lập.
4. **Chat GM:** biểu tượng 🦩 mở bảng Chat GM xác thực ngay khi tập hợp/xếp Seat; dùng chung dữ liệu Chat Online và chức năng trả lời sẵn có. Không thay đổi quyền đọc Chat của Player và không công khai nội dung bí mật ra WebSocket.
5. **Thông báo hành động:** khung kết quả được neo ngay dưới menu điều khiển GM phía trên theo vị trí hiển thị thực tế, có giới hạn màn hình iPhone.

## Kiểm thử trong phạm vi
- `tests/online-wolf-undo-gm-chat-notices-20261031.test.mjs`: hồi quy 7 tình huống, gồm chính sách an toàn Undo.
- `tests/gmww-action-icons-in-battle.test.mjs`: icon và thao tác kéo-thả.
- `tests/gmww-v3228-battle-icons-footer.test.mjs`: điều chỉnh assertion điểm xuất phát theo yêu cầu mới.
- `tests/v399-group-actions-undo.test.mjs`: giao dịch xác nhận/khôi phục.
- `tests/gm-admin-top-chat-20261028.test.mjs`: bảng Chat GM không mất chức năng.
- `node .github/scripts/assemble-gm-app.mjs --verify`, `node --check src/index.js`, `node --check server-game/current/app.js`.

## Điều kiện phát hành và rollback
- Bản vá nằm trên PR riêng; **chưa merge, chưa deploy Production, chưa phát hành .gmwwupdate** khi chưa đạt CI required checks và nghiệm thu.
- Không sửa IPA, Oracle, dữ liệu Production, schema hay Durable Object namespace.
- Nếu nghiệm thu sau triển khai phát hiện hồi quy: revert PR và khôi phục Runtime/Worker từ bản phát hành đã xác minh trước đó. Không xóa lịch sử trận hoặc chat.
