# Trích chuyển PR #584 — Vai trò Hồn Ma và Artifact #34

Nguồn: snapshot bất biến `backup/pr584-preserved-20261029-51c407c7` @ `51c407c7ec2891ffb636a2dcf3c9be9f3f6b4ed5`; điều phối #623. Đây là ngoại lệ **2 lá** vì thông điệp riêng có chung quy tắc privacy, moderation, chỉ dùng một lần và replay.

Đã chuyển chính xác theo blob SHA: `src/gmww-ghost-clue.js`, `src/gmww-ghost-letter.js`, 2 unit tests.

**Draft, tuyệt đối chưa merge/deploy:** chưa chuyển API routes và storage trong `src/index.js`, authorization GM/Player, DEMO, UI, audio, Worker E2E `tests/worker-ghost-clue-e2e.mjs` và `tests/worker-artifact-ghost-letter-e2e.mjs`. Chỉ chuyển trạng thái khi không lộ clue khi pending, ban đúng người vi phạm, đúng 1 chữ của người chết hôm trước và retry/reconnect đạt.

Giữ #584 và backup cho đến khi tất cả code cần giữ được migration kiểm chứng.