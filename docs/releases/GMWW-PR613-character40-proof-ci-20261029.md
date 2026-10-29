# GMWW Runtime OTA V3.274 — sửa kiểm chứng ảnh Character40 (29/10/2026)

## Nguyên nhân

PR #617 đã khắc phục checkout Git nông và phát hành Worker V3.274 lên Cloudflare lúc 19:38:49 (GMT+7), nhưng workflow **Deploy Production** #40874611882 dừng tại bước kiểm tra Production. Kiểm chứng cũ so sánh API `/api/game-characters/character-01/image` với ảnh thumbnail tạo trong CI (61.948 byte), trong khi mã Worker hiện hành `src/gmww-character40-catalog.js` cố ý trả ảnh **original** (92.974 byte). Đây là sai kỳ vọng kiểm thử, không phải lỗi truyền ảnh hay lỗi căn giữa Artifact.

## Khắc phục giới hạn phạm vi

- Sửa so sánh ảnh tại hai điểm: kiểm tra Production trong `deploy-production.yml` và `verify-character40-production.mjs` để xác minh SHA-256 **đúng bytes ảnh original** mà Worker đang phục vụ, đủ 40 nhân vật; giữ nguyên xác minh atlas/Runtime và chính sách fail-closed.
- Giữ điều kiện CI đúng SHA, ancestor bất biến PR #613, phạm vi chính xác năm file CI/test/docs và các kiểm thử âm tính chống thay đổi mã game.
- Không sửa ảnh, asset, Worker, Server, Player Web, GM, 63 Vai Trò, 44 Artifact, Durable Objects, dữ liệu, IPA V3.264 hoặc Runtime V3.274.
- Chỉ công bố gói cập nhật thủ công `GMWW-Runtime-V3.274.gmwwupdate` sau khi workflow Production hoàn tất SUCCESS, manifest OTA và SHA-256 bytes thực được xác minh, GitHub Release có file.

## Rollback

Nếu kiểm tra sau triển khai thất bại, giữ gói V3.273 đã xác minh làm điểm rollback; không thay đổi IPA hoặc xóa dữ liệu. Không công bố file V3.274 khi chưa có GitHub Release hợp lệ.
