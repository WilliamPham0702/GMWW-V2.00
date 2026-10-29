# GMWW — Online Player Web: thẻ bài, hành động, chat GM, quyền hiệu ứng, audio (29/10/2026)

## Thay đổi trong PR ứng viên
- P0: Trạng thái từ Worker/legacy chỉ được phép hiển thị khi GM bật `statusDisplay[id] === true`. Không giữ `statusTags` của snapshot cũ khi WebSocket thiếu quyền.
- Player Web Online: chỉ một cặp shortcut Vai Trò/Artifact thu nhỏ, kéo đổi vị trí và nhớ vị trí; mở lá toàn kích thước bằng giao diện hiện tại, che mini lúc mở; cấm hồi sinh lá cũ từ cache nếu không trùng matchId.
- Hành động kéo lên nhân vật thực thi sau đủ mục tiêu, bỏ xác nhận chung thừa; yêu cầu chọn hướng/đáp án đặc thù vẫn giữ.
- Menu trên bỏ nút thoát, giữ timeline server; menu dưới có đồng hồ theo deadline đã công bố, bảng chat cuộn 5 dòng, chuyển kênh riêng GM, nút hoàn tác chỉ bỏ lựa chọn CHƯA gửi Server.
- Chat GM có kênh tách biệt theo ID thành viên, server xác thực; nội dung không phát WS công khai.
- Tắt phát giọng TTS tự đọc nhãn vai trò. Chỉ chấp nhận URL audio ghi âm an toàn từ cùng origin khi server cung cấp.

## Giới hạn an toàn / chưa nghiệm thu
- Kho audio GM nội bộ/IndexedDB chưa tự động chia sẻ audio ghi âm cho Player; khi không có bản ghi được cấp quyền, Player không đọc AI và không tự chế audio. Cần luồng phân phối asset được kiểm soát mới có thể phát chính xác.
- Đồng hồ đêm chỉ hiển thị khi có deadline do Server xuất bản. Không suy đoán thời gian.
- Khôi phục chỉ bỏ thao tác đang soạn, KHÔNG rollback hành động đã chốt trên Server.
- Không sửa IPA, dữ liệu Durable Object, luật hoặc hồ sơ trận.
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
