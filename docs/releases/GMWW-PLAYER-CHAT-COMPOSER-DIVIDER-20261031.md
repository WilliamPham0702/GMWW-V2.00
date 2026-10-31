# Player Web Online – Phân cách vùng nhập Chat (31/10/2026)

## Thay đổi
- Thêm đường kẻ ngang 1px, màu trắng mờ (48% độ đục) ngay trên ô nhập “Chạm để chat…” khi Chat Làng mở.
- Đường kẻ phân biệt khu vực hiển thị tin nhắn và ô nhập liệu; không thay đổi kích thước, nội dung, nút Gửi hay quyền chat.
- Chỉ cập nhật nguồn Player Web, bản script được đóng gói và bài test giao diện tương ứng.

## Nghiệm thu trước phát hành
- Chạy `node --test tests/player-chat-composer-divider.test.mjs`.
- Chạy `node .github/scripts/assemble-player-web.mjs --verify`.
- Kiểm tra mở/đóng khung Chat và bật bàn phím iPhone Safari: đường kẻ hiển thị phía trên ô nhập, không che tin nhắn/nút Gửi.
- Chỉ merge khi required CI SUCCESS và được phê duyệt; Production/IPA/dữ liệu không thay đổi trong PR.

## Rollback
- Revert commit/PR này nếu đường kẻ ảnh hưởng giao diện; phát hành lại Worker/Player Web sau kiểm thử tương ứng. Không khôi phục hay xóa dữ liệu người chơi.
