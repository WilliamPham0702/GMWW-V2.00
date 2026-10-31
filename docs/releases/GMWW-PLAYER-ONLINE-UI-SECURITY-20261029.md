# GMWW — Online Player Web: thẻ bài, hành động, chat GM, quyền hiệu ứng, audio (29/10/2026)

## Thay đổi trong PR ứng viên
- P0: Trạng thái từ Worker/legacy chỉ được phép hiển thị khi GM bật `statusDisplay[id] === true`. Không giữ `statusTags` của snapshot cũ khi WebSocket thiếu quyền.
- Player Web Online: chỉ một cặp shortcut Vai Trò/Artifact thu nhỏ, kéo đổi vị trí và nhớ vị trí; mở lá toàn kích thước bằng giao diện hiện tại, che mini lúc mở; cấm hồi sinh lá cũ từ cache nếu không trùng matchId.
- Hành động kéo lên nhân vật thực thi sau đủ mục tiêu, bỏ xác nhận chung thừa; yêu cầu chọn hướng/đáp án đặc thù vẫn giữ.
- Menu trên bỏ nút thoát, giữ timeline server; menu dưới có đồng hồ theo deadline đã công bố, bảng chat cuộn 5 dòng, chuyển kênh riêng GM, nút hoàn tác chỉ bỏ lựa chọn CHƯA gửi Server.
- Chat GM có kênh tách biệt theo ID thành viên, server xác thực; nội dung không phát WS công khai.
- Tắt phát giọng TTS tự đọc nhãn vai trò. Chỉ chấp nhận URL audio ghi âm an toàn từ cùng origin khi server cung cấp.

## Giới hạn an toàn / chưa nghiệm thu
- Đã bổ sung bản ghi lời gọi lượt hiện tại từ kho GM/IndexedDB: GM xác thực khi tải lên; Player phải đăng nhập và thuộc phòng để tải xuống. Chỉ nhận MP3/M4A/OGG/WAV có chữ ký byte phù hợp, tối đa 2 MiB; từ chối bản ghi sai lượt. Dữ liệu âm thanh chia khối dưới giới hạn một giá trị Durable Object, chỉ giữ bản ghi hiện tại.
- Player đợi bản ghi đến muộn, hủy tải/phát khi đổi lượt hoặc rời phòng; tắt tiếng Player độc lập GM. Không dùng TTS cho Player. Autoplay bị chặn sẽ thử lại khi người chơi chạm màn hình.
- Còn phải nghiệm thu iPhone Safari, bản ghi thực tế của từng lượt và lượt nhóm nhiều vai. Chưa có xác nhận Production.
- Đồng hồ đêm chỉ hiển thị khi có deadline do Server xuất bản. Không suy đoán thời gian.
- Khôi phục chỉ bỏ thao tác đang soạn, KHÔNG rollback hành động đã chốt trên Server.
- Không sửa IPA, luật, phòng hoặc hồ sơ trận hiện có. Chỉ thêm dữ liệu bản ghi hiện tại có thể thay thế trong Durable Object.
- PR chưa được phép coi là Production cho tới khi tất cả kiểm thử theo phạm vi/CI required SUCCESS, nghiệm thu iPhone Safari, sau đó merge/deploy và xác minh SHA-256 Runtime OTA.

## Test theo phạm vi
- `tests/player-online-privacy-bottom-dock-20261029.test.mjs`
- `tests/player-web-online-village-20261028.test.mjs`
- `tests/player-web-online-actions-20261028.test.mjs`
- `tests/online-chat-authority.test.mjs`
- `tests/player-visual-notice-status-sync-20261028.test.mjs`
- `tests/status-visuals-v1.test.mjs`
- `node .github/scripts/assemble-player-web.mjs --verify`
- Kiểm chứng từng phiên quyền status On/Off, reconnect, ván mới, chat nhóm/GM, mini drag iPhone Safari.

## Rollback
Hoàn nguyên merge commit theo GitHub PR và deploy lại bản Worker/Player Web đã xác minh trước đó; giữ nguyên lịch sử Durable Object. IPA bất biến.


## Tiếp tục PR #630
- Sửa đọc deadline ISO để đồng hồ ngày hiển thị đúng.
- Shortcut lá bài dùng trình xem riêng chung, cài đặt dock trước khi mở để tránh lặp giao diện.
- Đồng bộ main và tái tạo Player Web từ nguồn; giữ sửa bootstrap đã phát hành.
- Kiểm thử hồi quy đồng hồ và mở lá được ghép vào bộ test PR630 hiện có để CI luôn chạy.

## Phát hành theo phê duyệt ngày 30/10/2026
- Chủ dự án yêu cầu phát hành Runtime V3.276 và tự nghiệm thu Safari/audio sau cập nhật. Không coi nghiệm thu thiết bị là đã PASS.
- Khắc phục CI sau merge bằng cùng bộ kiểm tra phạm vi PR630, kèm kiểm chứng bản sửa CI chỉ gồm bốn file và commit game liền trước đúng phạm vi đã duyệt. Không bỏ kiểm tra nội dung chưa biết.
- Giữ nguyên mã game, IPA, dữ liệu; phát hành qua CI main SUCCESS, GitHub Releases và SHA-256. Rollback Runtime V3.275.
