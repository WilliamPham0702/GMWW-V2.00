# GMWW V3.245 — NIGHT-02 · Chuẩn hóa Sói Tuyết, Bảo Vệ, Bầy Sói, Yêu Tinh

Ngày phát hành ứng viên: 27/10/2026.

## Luồng Đêm authoritative
1. Artifact đầu ván — ART-01 nếu được bật, theo quy tắc sử dụng ưu tiên.
2. Bầy Sói nhận diện — WOLF-01 nếu từ 2 Sói còn sống hoặc có Sói mới.
3. Phù Thuỷ Già — WITCH-01, không phụ thuộc số thứ tự cấu hình.
4. Sói Tuyết — nếu ván có lá vai; ưu tiên Đóng Băng. Không đóng băng một người hai đêm liên tiếp.
5. Bảo Vệ — nếu ván có lá vai; Bảo Vệ chỉ chống Sói Cắn, không cùng mục tiêu hai đêm liên tiếp.
6. Bầy Sói Cắn — nếu trong ván có ít nhất một vai Phe Sói; tập hợp toàn bộ Sói sống, kể cả Sói Tuyết; chỉ một nút **Sói Cắn**. Bầy Sói chỉ được chốt 1 lượt Cắn trong cùng đêm.
7. Các vai Sói có chức năng riêng (Sói Tiên Tri, v.v.) theo order cấu hình, không lặp nút Sói Cắn. Sói Tuyết đã thức riêng ở bước 4.
8. Yêu Tinh — nếu ván có lá vai; xuất hiện sau khi hoàn thành mọi lượt Sói. Chọn Trái/Phải hoặc bỏ qua; nếu mục tiêu kề bên đã chết, bỏ qua người đã chết để tìm người hợp lệ kế tiếp. Không tự tạo vết cắn khi không có.
9. Các Vai Trò còn lại theo order cấu hình; Làng ơi dậy đi.

## Rule tác động
- Sói Tuyết chỉ được Sói Cắn khi là **Sói duy nhất còn sống**, kể cả không thể có 2 Sói Tuyết sống cùng làm trường hợp một mình. Vẫn có thể Đóng Băng trước lượt Bầy Sói.
- Sói Trùm bị Đóng Băng: lựa chọn Cắn vẫn ghi nhận, nhưng hiệu lực chết bằng không; không hiển thị nạn nhân vết Cắn cho Phù Thủy. Thứ tự xử lý giữ hiệu lực Đóng Băng đến hết bước xét vết Cắn lúc bình minh dù hiệu ứng hình ảnh vừa hết hạn.
- Sói Trùm bị Đuổi: Server từ chối Sói Cắn chung ngay khi xác nhận. Nếu đã ghi vết Cắn trước đó thì kết quả cũng vô hiệu khi xét đêm.
- Bảo Vệ chỉ chặn vết Cắn của Sói ở mục tiêu cuối cùng (sau dịch chuyển nếu có). Không chặn bình Phù Thủy hoặc các tác động gây chết khác.
- Không chọn người chết ở các ngày/đêm trước đó khi Dịch Chuyển Vết Cắn.
- Server kiểm tra sai type, người thực hiện, số lần dùng, trùng mục tiêu, hiệu lực trạng thái trước khi ghi hay dùng lượt.
- Với cấu hình Vai Trò đã lưu, áp dụng bộ đối chiếu NIGHT-02 cho Sói Tuyết, Bảo Vệ, Sói Trùm, Sói Tiên Tri, Yêu Tinh và metadata của Phe Sói. Giữ các liên kết audio, artwork, vai khác và rule ART-01/WOLF-01/WITCH-01.

## Kiểm thử đúng phạm vi
`node --test tests/night02-pack-snow-guard-fairy.test.mjs tests/v389-night-runtime-integration.test.mjs`.
Kiểm tra cú pháp Worker/GM, tái đóng gói GM canonical, version guard, chính xác OTA SHA-256, health Production. Không test Chrome Player Card, Seat, Arena3D, IPA native khi không liên quan.

## Rollback và bảo toàn
- Phiên bản Runtime/Worker **V3.245**, IPA shell giữ V3.110.
- Không migration hoặc xóa Durable Objects/phòng/người chơi/lịch sử. Runtime ván đêm đã sinh từ bản trước được giữ nguyên; quy tắc mới áp dụng khi tạo đêm mới.
- Chỉ merge và deploy khi CI bắt buộc SUCCESS; rollback Worker/Runtime về bản Production V3.244 đã xác minh nếu có lỗi, theo các chốt integrity của workflow; không downgrade dữ liệu.
