# GMWW Arena 3D — Lô GĐ29–31 (25/10/2026)

## Lý do và giới hạn
Ứng viên GĐ28 đã hoàn thành kỹ thuật với danh mục tạo hình 28 vai / 26 hành động Core và chỉ chạy trọn ván 6 người trên STAGING, nhưng menu điều khiển thử của GM mới đưa ra 4 vai cố định. Không thể xem tất cả hành động đã **thao tác được** nếu chỉ có chữ ký VFX. Lô này ưu tiên bịt khoảng trống đó và kiểm thử đội hình 30 người bằng Core thật.

**Phạm vi tuyệt đối**: PR Draft #487, nhánh nghiên cứu riêng, Worker và DO Arena3D STAGING. Không merge hoặc deploy Production; không thay đổi game 2D, Player Web 2D, OTA, IPA, tài khoản hay dữ liệu Production.

## GĐ29 — Hành động từ thẻ Vai Trò / Artifact thật trong lượt Core
- Tạo `stage29-gm-actions.mjs`, chiếu các hành động chủ động **có trong thẻ Core đã phát**, chỉ sau khi xác thực GM và đúng actor của lượt đêm.
- Vẫn dùng `roleId`, `actionId`, `artifactId`, `type`, số mục tiêu / cấm chọn bản thân do thẻ đã phát xác định. Lệnh gửi Core qua `battle-action`; Core quyết định tất cả quyền, hiệu ứng và kết quả, renderer 3D chỉ diễn hoạt sau khi Core chấp nhận.
- Menu GM hỗ trợ 0–5 mục tiêu (tuỳ chức năng), chọn nhiều thành viên qua danh sách riêng trong tab Lượt Đêm, hiển thị mọi action được Core cấp thay vì giới hạn bốn vai Bảo Vệ/Tiên Tri/Phù Thủy/Ma Sói. Không hiện chức năng trong DTO công khai.
- Giữ 4 nút thử cũ ở API dự phòng nội bộ; menu GM thông thường dùng action từ Core.
- Với chức năng ngoài catalog và Artifact, chỉ hiển thị nếu Core thực sự giao hành động cho actor; không tự tạo icon/VFX bí mật hay cấp quyền theo tên vai.
- Không tự tạo bản ghi âm thanh chưa có; chỉ sử dụng cue ID đã có.

## GĐ30 — Trọn ván với 30 Character trên Core STAGING
- Bổ sung E2E 30 tài khoản kiểm thử trong **phòng STAGING mới hoàn toàn**, không liên quan dữ liệu người dùng: tạo phòng → lấp 30 Seat → khoá ghế → phát vai → Player reload khi phát vai → vào trận → đêm → ngày → đề cử/bỏ phiếu → kết thúc.
- Xác minh Player 30 Character không nhận cue GM-only HTTP 401/403, ngay cả sau reconnect; không mất số lượng/ngữ cảnh phòng.
- Bài E2E 6 người đã có vẫn được duy trì cho hành động Bảo Vệ và Artifact/Role tùy chỉnh. Đây là các kịch bản thực tế từng trạm, không phải kiểm thử hành động của từng vai trong cùng một ván.

## GĐ31 — Ứng viên STAGING, kiểm thử và bàn giao
- Unit: danh sách đầy đủ 26 Core action trong thẻ đã phát, role/Artifact 2–3 mục tiêu, noSelf/noTarget, từ chối cấp cho actor sai lượt, không lộ dữ liệu GM.
- Browser: Chrome và WebKit, 6/12/20/30 Character, hành động 3D và hiển thị UI GM riêng. Core E2E gồm 6 và 30 người, reconnect và quyền bí mật.
- Chỉ chạy CI phạm vi Arena, không mở các bài Chrome lá bài Player Web 2D/IPA/OTA.
- Ghi Workflow URL/SHA/Cloudflare Worker version ID sau khi thực tế SUCCESS. Không công bố là đã nghiệm thu iPhone nếu chưa có xác nhận.
- Rollback STAGING về bản GĐ26–28 đã có: Cloudflare Worker version `6e729ed6-9f3e-4e59-be59-563a144ff216`. Production giữ nguyên.

## Kết quả
Đang xác minh ở STAGING. Chỉ ghi kết quả PASS khi các bài kiểm thử có kết quả thực tế.
