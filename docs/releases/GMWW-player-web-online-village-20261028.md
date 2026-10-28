# GMWW Runtime V3.273 — Player Web Online trên nền Làng

## Phạm vi PR #596
- Giữ Player Web ở làng hiện hành sau khi phát lá, không tạo một màn chơi Online riêng. Lá Vai Trò và Artifact riêng thu nhỏ ở phía dưới Timeline; khi chạm mới mở lá lớn.
- Chat 💬 đặt trong dock dưới, chạm để mở; vùng tin nhắn có cuộn; chạm ngoài hoặc quá 30 giây không hoạt động sẽ đóng. Menu trên và dock hành động cũng thu gọn sau 30 giây.
- Player Web nhận vai trò của chính mình và nhãn đồng đội đúng nhóm, đúng lượt từ API riêng theo session; không đưa vai trò bí mật lên dữ liệu công khai.
- Icon hành động kéo thả/chạm trong làng, Server cấp danh sách được dùng theo người đăng nhập, lượt, phiên, giới hạn và mục tiêu. Backend dùng chung GM battle/day handlers; không cấp quyền GM cho Player Web. Kích thước icon lấy từ cài đặt GM đã đồng bộ.
- Timeline và audio cue đọc từ Server theo giai đoạn, không lộ actor bí mật. Player Web hiện sử dụng TTS theo cue, chưa phát nguyên tệp audio đã nạp trên thiết bị GM.
- Giữ nguyên DEMO lai, GM Chat 🦩 và ba hành động GM của Runtime V3.272, IPA Native V3.264, Durable Objects, dữ liệu người chơi và lịch sử.

## Giới hạn cần tiếp tục
- 107 Vai Trò/Artifact và các tác động đan xen phụ thuộc việc hoàn thiện executor tại PR #584; không nhận là đã đạt 100%.
- Audio tệp gốc GM không được đưa lên kho riêng cho Player Web, hiện chỉ đồng bộ lời gọi/cue và trạng thái. Không gọi đây là đồng bộ audio tệp gốc.
- Cần nghiệm thu thực tế iPhone và nhiều Player Web Online sau phát hành.

## Kiểm tra trước khi phát hành
- CI phạm vi Player Web Online V3.273, kiểm thử bảo mật, DEMO không hồi quy, đồng nhất bundle, phiên bản Worker/GM/manifest.
- Chỉ phát hành khi CI bắt buộc SUCCESS và GitHub merge an toàn với main V3.272; kiểm tra thông số Production cùng checksum SHA-256 của Runtime OTA. Không thay đổi IPA.
- Rollback: chuyển lại Runtime V3.272 đã phát hành qua cơ chế versioned OTA; giữ dữ liệu/phòng/lịch sử nguyên vẹn.
