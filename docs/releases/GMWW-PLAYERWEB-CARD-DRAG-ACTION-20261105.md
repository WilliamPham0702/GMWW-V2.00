# GMWW Player Web — kéo lá Vai Trò / Artifact để hành động (05/11/2026)

Phạm vi: Worker (Player Web, phòng Online). Không đổi Server API, Runtime GM, IPA, URL, schema DO; không xóa dữ liệu.

## Yêu cầu
Ngoài việc kéo icon hành động tới người chơi, người chơi có thể kéo chính lá Vai Trò hoặc Artifact của mình tới người chơi để thực hiện hành động. Xong thì lá ẩn rồi hiện lại ở vị trí ban đầu.

## Cách hoạt động
- Khi đang có hành động hợp lệ: kéo lá = thực hiện hành động (dùng lại đúng đường kéo, nam châm và API `POST /action` của icon). Khi không có hành động: lá vẫn chỉ dời chỗ như cũ. Chạm không kéo vẫn mở lá.
- Lá Vai Trò nhận các hành động không thuộc Artifact; lá Artifact nhận hành động của Artifact.
- Lá có từ 2 hành động (ví dụ Phù Thủy: Cứu / Hạ độc): thả xong hiện bảng chọn hành động. Chưa chọn thì không gửi gì. Hủy thì lá hiện lại.
- Cứu chỉ được thả vào người bị Sói cắn (theo thông tin riêng đã gửi cho Phù Thủy).
- Hành động không cần mục tiêu: thả lá vào khung làng.
- Hành động nhiều mục tiêu: lá quay về chỗ cũ sau mỗi lần thả, kéo tiếp cho người kế.
- Lá ẩn trong lúc kéo/gửi, hiện lại sau khi Server trả lời (thành công hoặc bị từ chối) và khi hủy.
- Server vẫn kiểm tra lượt, giới hạn dùng, hiệu ứng chặn như trước.

## Kiểm thử
- Test mới: tests/player-web-card-drag-action-20261105.test.mjs (11 test).
- Cập nhật chữ ký hàm trong tests/player-web-v3-iframe-drag.test.mjs.

## Rollback
Quay về phiên bản Worker trước trên Cloudflare (gmww-v2-00). Không cần rollback Runtime/IPA.
