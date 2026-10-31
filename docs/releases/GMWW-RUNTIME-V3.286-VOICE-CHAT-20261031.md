# GMWW Runtime V3.286 — Tin nhắn thoại Chat Online (31/10/2026)
## Tính năng
- Player Web và GM có thể ghi âm ngắn bằng nút 🎙️ và gửi trong kênh Chat hiện có. Có nút nghe lại và hiển thị thời lượng.
- Giữ phân quyền Server-authoritative: Chat Làng, kênh nhóm ban đêm, Chat riêng GM. Người chết/đuổi không gửi Chat Làng; vẫn gửi riêng GM.
- Không cần LiveKit, WebRTC call, chuyển giọng nói thành chữ hoặc dịch vụ trả phí. Ghi âm qua MediaRecorder (MP4/AAC Safari iPhone, WebM Chrome nếu hỗ trợ).
- Giới hạn 20 giây và 192 KiB mỗi clip. Chỉ lưu tối đa 20 clip/phòng, tự loại clip quá 24 giờ trong quá trình có tin thoại mới; khi chưa có hoạt động, dữ liệu cũ có thể còn trong storage cho đến lần dọn kế tiếp. Không giữ âm thanh vĩnh viễn.
- Khóa audio riêng trong Durable Object; tin chat API chỉ có metadata, GET clip luôn xác thực theo tài khoản và kênh, public WebSocket chỉ báo chat_tick.
- Không đổi IPA Native, Oracle, dữ liệu phòng hiện hữu, luật/Executor.
## Release gate
- Chạy test validation voice, bảo mật kênh, cả Player Web và GM source/compiled đồng nhất, version guard và Worker build.
- Chỉ merge và phát hành sau CI required SUCCESS đúng HEAD. GitHub-first OTA, file .gmwwupdate/sha256/manifest, đối soát Worker/Runtime Production.
- Nghiệm thu mic và nghe trực tiếp trên iPhone Safari/Chrome/Edge sau khi phát hành.
## Rollback
- Worker: Cloudflare Deployments chọn phiên bản đã xác minh trước khi triển khai. Không đụng Durable Objects.
- Runtime: giữ nguyên V3.285, nếu cần rollback khôi phục qua một phiên bản tăng số an toàn thay vì downgrade cưỡng bức, bảo toàn lịch sử.
