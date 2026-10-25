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
Đã hoàn thành **GĐ29–31 ở mức kỹ thuật STAGING và CI SUCCESS**; chưa có nghiệm thu iPhone vật lý mới cho lô này.

## Kết quả xác minh STAGING — lô GĐ29–31
- GitHub Actions **SUCCESS**: https://github.com/WilliamPham0702/GMWW-V2.00/actions/runs/40176994082; commit build `7aca265637303b84cbe18bfd4435d889e35b313b`.
- Cloudflare Worker STAGING version: **`7ac53fa4-6449-49d0-a121-e82dd9572acc`**.
- GĐ29: kiểm thử unit 26 action Core có thể biểu diễn từ thẻ đã phát, nhiều mục tiêu (2–3), action không mục tiêu, cấm tự chọn, artifact đúng quyền, từ chối actor sai lượt; chạy Core thật 6 người với GM sử dụng action Bảo Vệ từ menu động **PASS**. Menu chỉ cho thao tác action mà Core đã phát; hành động mới bị Core từ chối nếu không đủ quyền.
- GĐ30: Core thật **30 Character / 30 Seat** với hai client, từ tạo phòng, đăng ký/lấp 30 người thử, khoá ghế, Phát Vai, Player reload/reconnect, vào trận, Đêm, Ngày, Lên Giàn đề cử → bỏ phiếu → kết thúc ván **PASS**. Viewer không được xem hiệu ứng GM riêng (HTTP 401); chỉ tạo và sử dụng dữ liệu test trên Worker/DO STAGING.
- GĐ31: Chrome và WebKit (iPhone giả lập trên CI) **PASS** với 6/12/20/30 Character. Draw calls 46/46/42/37 theo số lượng, 4 VFX kiểm tra; test Core Role Shield 2 mục tiêu và Artifact Heal 1 mục tiêu **PASS**.
- **Không phải chứng nhận toàn bộ 63 vai / 44 Artifact đã kiểm thử hoạt động riêng từng chức năng trên máy thật.** Dữ liệu Core catalog trên nhánh hiện tại là 28 vai/26 hành động dựng sẵn, hỗ trợ dynamic role/artifact do Core cấp quyền. UI triển khai mới ở tab GM **Lượt Đêm**, các tính năng thuộc những giai đoạn khác cần tiếp tục đối chiếu khi có catalog tương ứng.
- **Chưa nghiệm thu trên iPhone thật cho lô GĐ29–31.** FPS CI Chrome/WebKit phần mềm không tương đương FPS/nhiệt/pin trên thiết bị vật lý.
- Giữ PR #487 **Draft** và main/Production/Player Web 2D/Runtime OTA/IPA/room data nguyên vẹn.
- **Rollback Worker STAGING** về phiên bản GĐ26–28 `6e729ed6-9f3e-4e59-be59-563a144ff216`.
