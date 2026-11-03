# GMWW #773 — Stage 4C: chuẩn bị lớp mã hóa checkpoint A → B

**Trạng thái:** chỉ mã nguồn + kiểm thử dữ liệu giả. Không có export, upload, restore hoặc dữ liệu Production thật. Không bật failover. Không sửa Worker, DNS, IPA, Runtime.

## Kết quả
- Module `infra/cloudflare-standby/production-backup-envelope.mjs`: AES-256-GCM WebCrypto, nonce ngẫu nhiên cho từng chunk, AAD khóa chặt metadata nguồn A → đích B, SHA-256 của ciphertext để đối soát lưu trữ; không xuất hash plaintext có thể làm lộ dữ liệu ít entropy; mỗi chunk tối đa 64 KiB.
- Schema metadata chỉ cho phép backupId, objectDigest không chứa ID thô, sourceSha, revision, index/count, và điều kiện quiescent/sockets=0. Mọi schema hoặc metadata không khớp đều fail-closed.
- Không chứa secret, token, dữ liệu thật, URL quyền riêng, import game source hoặc Cloudflare API; không đủ điều kiện sao lưu Production khi đứng riêng.
- Test fixture tổng hợp: roundtrip, tamper, sai khóa, nonce, digest, sai metadata, ván đang chạy/WS còn kết nối.

## Còn thiếu / chặn thực thi dữ liệu thật
1. P0 khóa GM hardcoded nằm cả trong Server và GM Runtime (PR #774 Draft). Không rotate không làm hỏng Runtime hiện tại. PR này hoàn toàn độc lập với khóa GM cũ.
2. Exporter chạy **bên trong DO trên A**, chỉ đọc sau xác thực backup riêng và kiểm tra snapshot nhất quán; hỗ trợ giá trị có kiểu (Uint8Array/Date/Map/Set), history, undo, chat, Artifact, session cần kiểm toán riêng. Không lấy plaintext DO qua SQL _cf_KV (bị SQLITE_AUTH).
3. Đã thêm mã nguồn **B-only** `b-backup-archive-worker.mjs` và cấu hình SQLite Durable Object `BackupArchiveDO` riêng, mặc định tắt nếu thiếu secret + cờ enable. Chỉ lưu ciphertext, có chống ghi đè, đếm chunk, xác thực AES-GCM trước khi lưu. **Chưa deploy/tạo namespace thật trên B**. Còn thiếu quota/retention và đối chiếu manifest toàn backup. R2 B API báo 403/10042; phương án SQLite DO có thể tránh R2, phụ thuộc dung lượng/quota thực tế.
4. Danh sách A đã kiểm kê metadata: 57 DO, 56 hasStoredData. Chưa xuất bất kỳ giá trị private.
5. E2E thực tế A-fixture → B-fixture bằng DO, replay/rollback và privacy tests, CI SUCCESS, backup version Worker A và B.
6. Sau khi tất cả điều kiện PASS, mới cấp phép backup Production thật một lần. Không tự bật failover, không cập nhật DNS/Pages/IPA/Runtime.

## Cấu hình B tách biệt
- Worker `gmww-b-backup-archive`, chỉ chấp nhận hostname cố định của tài khoản B; không sử dụng namespace B synthetic hiện có.
- Bắt buộc `GMWW_B_BACKUP_ENABLED=1`, `GMWW_B_BACKUP_INGEST_KEY`, `GMWW_A_B_ARCHIVE_KEY`, `GMWW_B_BACKUP_SOURCE_SHA` được cấp riêng và kiểm chứng; mặc định từ chối.
- API chỉ lưu ciphertext đã xác thực AES-GCM; `/health` không thể tuyên bố đã có backup Production. Không có cutover route.

## Khóa
- `GMWW_A_B_ARCHIVE_KEY` chỉ là **tên binding dự kiến**, giá trị phải là ngẫu nhiên 32-byte base64url và nằm trong Cloudflare Secrets, tuyệt đối không lưu Github/log/chat.
- PR này chưa tạo hoặc ghi bất cứ secret nào. Chưa có kho archive trên B.
- Đừng nhập khóa quản trị GM, khóa synthetic STAGING hoặc session token vào module này.

## Rollback
Không có deploy và không có dữ liệu cần rollback. Nếu không tương thích sau merge, revert PR #776 (chỉ module crypto, Worker B-only, test, Wrangler dry-run và tài liệu), không tác động A/B, Production hoặc Runtime. Tuyệt đối không coi encryption unit-test PASS là backup thật đã được xác minh.
