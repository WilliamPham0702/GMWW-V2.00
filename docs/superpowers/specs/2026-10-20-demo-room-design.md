# GMWW — Phòng Demo tự chơi
Ngày: 2026-10-20
Trạng thái: Đặc tả để duyệt; chưa có mã tính năng, chưa triển khai.
Baseline đã đọc: 68d304d7b9a9f314ad47c6dab1e69b2efd012b48 (Runtime V3.163).

## Mục tiêu đã chốt
Trong Tạo phòng có lựa chọn Demo. Người quản trò chọn thành viên từ danh sách và setup như ván thường (Vai Trò, Artifact, seat, thời gian, thứ tự lượt). Trong Menu đống lửa có Demo tự động và điều chỉnh tốc độ. Mặc định tắt. Bật để tự chọn hành động ngẫu nhiên hợp lệ; tắt để dừng bot nhưng đồng hồ vẫn chạy và cho phép thao tác tay; bật lại tiếp tục trạng thái hiện tại. Không lặp hành động đã xác nhận. Dừng khi kết thúc ván.

## Giao diện
- Một lựa chọn Demo riêng trong danh sách phòng; chọn để mở lại phòng Demo hiện có hoặc tạo phòng Demo khi chưa có.
- Giữ luồng chọn thành viên, khóa seat, chọn ván mẫu, phân và phát Vai Trò.
- Menu đống lửa chỉ hiện điều khiển Demo trong phòng Demo.
- Công tắc hiển thị Đang chạy / Đã dừng. Tốc độ đề xuất: 1×, 2×, 5×, 10×; mặc định 2×. Đây là hệ số rút ngắn khoảng chờ thao tác, không sửa cấu hình ván mẫu.
- Đổi phòng, thoát màn chơi hoặc tải lại trang: bot dừng; người dùng bật lại để tiếp tục.
- Thao tác đang được server xác nhận lúc nhấn dừng có thể hoàn tất; không gửi thao tác kế tiếp. Không hoàn tác hành động đã cam kết.

## Kiến trúc
Chọn bộ điều phối Demo dùng lại các lệnh game hiện có. Không viết bản sao bộ luật; không dùng bot AI suy luận. Chỉ bộ lựa chọn ngẫu nhiên và bộ điều phối là mới.

1. Server lưu cờ demo bất biến khi tạo phòng. Không nhận diện qua tên phòng để tránh phòng thật đổi tên thành Demo.
2. Thành viên được sao chép dữ liệu hiển thị vào phạm vi phòng Demo. Không thay đổi currentRoomCode, ready, thắng/thua hoặc lịch sử thành viên thật.
3. Demo không xuất hiện trong danh sách phòng tham gia thông thường. Chặn tham gia trực tiếp từ Player Web vào phòng này; phạm vi đầu tiên là kiểm thử điều khiển GM.
4. Bộ điều phối chỉ có một chủ điều khiển có lease do server cấp. Đổi chủ hoặc lease hết hạn không được tiếp tục tác vụ cũ.
5. Mỗi thao tác gắn roomCode, matchId, cycleKey, turnId và mã idempotency. Kiểm tra lại trạng thái trước khi gửi và sau khi server trả lời.
6. Trạng thái bot tách khỏi Auto GM hiện tại. Trong phòng Demo, đồng hồ tiếp tục đếm khi bot tắt nhưng không được tự chọn, xác nhận hoặc chuyển lượt thay bot. Ván thường giữ nguyên cơ chế Auto GM.
7. Tốc độ được điều phối trên server đối với các hạn chờ bỏ phiếu/đề cử để không bỏ qua quy tắc thời hạn; giữ nguyên giá trị thời gian trong ván mẫu.

## Chạy ván
- Đêm: đọc queue server; chạy đúng thứ tự đã setup.
- Chọn trong hành động hiện còn lượt và actor đủ điều kiện; dùng targetAllowed hiện có để lập tập mục tiêu. Chọn đủ số mục tiêu riêng biệt theo luật.
- Bao phủ hành động không mục tiêu, chuyển hướng vết cắn, lựa chọn Sát Thủ, tác động nhiều mục tiêu, Artifact và các hành động ngày.
- Nếu không có hành động hợp lệ, chuyển lượt qua lệnh chuẩn. Nếu cho phép bỏ kỹ năng, lựa chọn bỏ qua thuộc tập quyết định ngẫu nhiên.
- Không dùng dữ liệu phe/vai trò bí mật để ưu tiên mục tiêu; thông tin đó chỉ phục vụ xác minh luật.
- Artifact phải qua cơ chế kích hoạt và hạn mức hiện có, không tự thêm hiệu ứng hoặc bỏ qua quota.
- Ngày: công bố kết quả, xử lý kỹ năng ngày, đề cử và bỏ phiếu ngẫu nhiên cho các thành viên đủ điều kiện; giải quyết kết quả qua cùng quy tắc server.
- Chỉ kết thúc khi điều kiện thắng được xác minh bởi luật game. Đề xuất thắng basic-rule hiện có chưa đủ chứng minh tất cả tình huống phe ba; nếu chưa xác minh được, dừng và hiển thị đề xuất cho GM, không tự ghi nhận người thắng.
- Giới hạn tiến trình chống vòng lặp: nếu trạng thái không đổi sau nhiều lần thử, dừng với lý do và bước lỗi; không coi là ván đã hoàn tất.

## Âm thanh và phản hồi
Dùng luồng audio hiện có. Ở tốc độ nhanh không chồng nhiều lời gọi: kết thúc audio của lượt cũ khi đã chuyển lượt. Popup kết quả được giữ trong khoảng chờ theo tốc độ rồi đóng khi bot đang chạy; khi tắt, GM đọc và đóng thủ công. Audio bị trình duyệt chặn không được làm bot xác nhận trùng hoặc kẹt vô hạn.

## Xử lý lỗi
- Lỗi mạng/timeout: dừng, đồng bộ lại receipt trước khi cho tiếp tục; không tự gửi mã giao dịch mới cho thao tác có kết quả chưa rõ.
- Server từ chối actor/target do trạng thái thay đổi: đọc lại trạng thái, hiển thị lỗi; không ghi thành công.
- Dừng khi đổi phòng, reset, kết thúc ván, mất lease hoặc trạng thái không còn phù hợp.
- Nhật ký kỹ thuật Demo tách khỏi khung Hành động; không làm tăng kích thước giao diện hiện có.

## Điểm tích hợp đã xác định
- server-game/src/30-village-and-setup.part: tạo/chọn phòng và thành viên.
- server-game/src/40-battle-and-timeline.part: Menu đống lửa, chọn hành động, xác nhận, popup và đồng hồ.
- server-game/src/50-roles-and-artifacts.part: phát vai và kết thúc ván khi cần.
- server-game/current/GMWW.html và style.css: điều khiển Demo.
- src/index.js: metadata, kiểm soát lease, cách ly roster/lịch sử, lệnh Demo và điều phối thời gian.
- src/gmww-public-room-contract.js: chiếu trạng thái Demo an toàn.
- Tạo module riêng cho bộ lựa chọn/ngữ cảnh Demo; assemble app.js từ source, không chỉ sửa file đóng gói.
- Quy trình runtime: đồng bộ phiên bản, inventory, manifest và SHA-256 theo script hiện có; không sửa IPA shell ngoài phạm vi.

## Nghiệm thu bắt buộc
1. Phòng thật không có nút Demo và không thay đổi hành vi.
2. Chọn thành viên đang thuộc phòng thật để Demo không di chuyển họ hoặc đổi thống kê.
3. Tắt trong lúc chờ, lúc request đang chạy, lúc popup mở và lúc audio phát: không phát sinh hành động kế tiếp; đồng hồ tiếp tục.
4. Bật lại sau thao tác tay: đọc trạng thái mới, không lặp xác nhận hoặc dùng target cũ.
5. Nhiều tab: chỉ một runner có quyền hành động.
6. Tăng tốc và giảm tốc không chạy song song các bước hoặc bỏ qua hạn mức.
7. Vai trò bị chết/đóng băng/đuổi, target bị đuổi, hành động không mục tiêu, nhiều mục tiêu và Artifact tuân theo luật hiện hành.
8. Đề cử, bỏ phiếu, kết quả ngày và chuyển đêm chạy xuyên suốt.
9. Không tự tuyên bố thắng sai với phe ba; nếu thiếu điều kiện xác minh thì báo dừng rõ ràng.
10. Kiểm tra source assembly, test hồi quy, build Worker và gói Runtime; chỉ merge/deploy sau CI đạt. Nghiệm thu cảm ứng/audio trên iPhone vẫn cần thực tế thiết bị.

## Phạm vi ngoài phiên bản này
Không mô phỏng hội thoại, suy luận hoặc lừa nhau của người thật. Không cam kết ngẫu nhiên bao phủ mọi trường hợp. Chưa thêm thống kê nhiều ván hoặc tích hợp người thật cùng bot.
