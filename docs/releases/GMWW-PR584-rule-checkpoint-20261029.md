# PR #584 — checkpoint RULE ngày 29/10/2026 (chưa phát hành)

- Đồng bộ main an toàn; giữ executor Lực Sỹ và nhận diện nhóm riêng tư.
- Sửa cú pháp kiểm thử inventory; cập nhật dependency thật của scheduler trong fixture kiểm thử.
- Bổ sung kiểm thử HTTP/SQLite thật cho rule đêm và bốn Artifact soi ban ngày, xác thực, quota, retry và reconnect.
- Tạo ma trận yêu cầu 107 lá, giữ trạng thái chưa chứng nhận khi thiếu bằng chứng.

Không phát hành Production/Runtime OTA; không đổi IPA hoặc dữ liệu Production. Không có file Runtime Update/SHA-256 phát hành mới từ checkpoint này. Chưa đủ điều kiện nghiệm thu 107/107.

Rollback: chưa triển khai Production nên không đổi manifest hoặc Worker. Nếu cần hoàn tác mã trên nhánh PR, revert checkpoint sau khi kiểm tra head, không reset/force push và không thu hồi thay đổi mới từ main.

### Sửa kết quả riêng trên Player Web

Phát hiện và sửa Online/DEMO bỏ sót `result.message` của Artifact ban ngày, đồng thời thay JSON soi đêm bằng `revelation.message` dễ đọc. Hai bài test chạy trực tiếp hàm UI thật đã FAIL trước sửa và PASS sau sửa. Chưa chứng nhận UI 107 lá; chưa phát hành.

## Tiếp tục triển khai 29/10 — executor và DEMO

- Thẩm Phán + Bùa Tai Ương: kích hoạt trước phiên đầu, tối đa hai phiên đầy đủ; lưu riêng phiên đầu, giữ cái chết, dựng lại quyền người còn sống cho phiên hai. Chặn chuyển Đêm sớm; chống lặp request/ack; giữ quota một lần/ván. GM chấp nhận kết quả phiên đầu sẽ mở phiên hai thay vì tự sang Đêm.
- Tự động và DEMO dùng cùng executor. Kiểm thử Worker thật với người thật bỏ đề cử/vote trong DEMO đã đi qua phiên hai và sang Đêm; kiểm thử GM thủ công và Auto GM cũng đạt.
- Ấn Dân Làng: executor ngày/đêm ghi trạng thái mất năng lực vĩnh viễn thật. Kiểm thử Player Web HTTP, sở hữu, quota, retry, hoàn tác đêm và reconnect; trạng thái không tự hết khi đổi ngày/đêm.
- Sửa điều kiện thắng nhận đúng faction ID chuẩn `wolf`, `wolves`, `village`, `third`; trước sửa DEMO có thể kết luận Dân thắng dù vẫn còn Sói. Có test tái hiện FAIL trước sửa.
- DEMO chốt đề cử qua Server: hòa/không đề cử thì không treo ai, không tự chọn mục tiêu và không dừng vì GALLOWS_NO_UNIQUE_NOMINEE. Vote dùng tally Server để giữ trọng số Artifact/Con Quạ.
- Bộ chọn hành động Online/DEMO nhận phase `both`, chặn actor bị khóa và Artifact một lần đã dùng ở chu kỳ trước, kể cả snapshot lượt Đêm cũ.

Chưa nghiệm thu toàn bộ 107/107. Ma trận cập nhật bằng chứng riêng theo từng tiêu chí; các phần chưa kiểm giữ NOT_VERIFIED/PARTIAL. Chưa phát hành Production/OTA/IPA; rollback vẫn là revert checkpoint trên nhánh sau khi kiểm tra head, không force push hoặc thay dữ liệu Production.

### Artifact nội tại Lên Giàn

- Lá Phiếu Âm Giới: quyền bỏ phiếu của chủ đã chết tách khỏi quyền đề cử/lên giàn; người chết thường vẫn bị chặn. Server, GM roster, Player Web và DEMO cùng dùng danh sách quyền vote. Không hồi sinh người sở hữu; giữ hiệu lực cấm vote, quota một phiếu, retry và reconnect. Tỷ lệ đề cử chỉ tính người đủ quyền đề cử.
- Áo Choàng Hoàng Tử: sửa nhánh GM chốt trực tiếp/đóng vote sớm không áp dụng kết quả bảo hộ; kiểm thử thật cả hai đường. Đã tạm gỡ riêng sửa này để kiểm chứng test thật FAIL đúng lỗi Cloak, sau đó phục hồi.
- DEMO chọn phiếu theo ràng buộc CỨU/GIẾT và bỏ qua actor không có phiếu hợp lệ khi hai ràng buộc xung đột; không tự tạo phiếu hoặc đổi luật đếm.

Chưa phát hành; các ô chưa nghiệm thu đủ vẫn giữ NOT_VERIFIED/PARTIAL.
