# GMWW Arena 3D — Giai đoạn 3 (Staging) — 24/10/2026

## Phạm vi triển khai
- Draft PR #452 trên nhánh `feature/arena-3d-dual-renderer`, dùng **Core V2.00 hiện tại** qua Worker riêng `gmww-arena3d-core-staging`.
- Không thay đổi Worker `gmww-v2-00`, Portable IPA, Player Web 2D Production, Room/Durable Objects Production, dữ liệu và Runtime/OTA.
- Không merge PR hoặc deploy Production. Chỉ cập nhật Cloudflare Worker **STAGING** đã có của Arena.

## Changelog (tiếng Việt)
1. **Character 3D chibi biển:** `assets/village/arena-3d/character-atelier.mjs` — bộ mô hình procedural 3D anime/chibi với đầu lớn, tóc, mắt, tay, áo, váy, nơ ngọc trai, bảng màu biển sáng, cá tính vật liệu theo 40 Character. Tất cả hình học dùng chung (InstancedMesh) nên tăng lên 30 người không tăng tuyến tính draw calls. Không tải texture/CDN và không đóng gói ảnh hoặc tài nguyên Production. Đây là mô hình kỹ thuật, chưa thay thế bộ Character mỹ thuật hoàn chỉnh.
2. **Animation:** nhân vật quay 90° mỗi lần chạm (tối đa 360°), bob/gestures/đi bộ mức cơ bản theo trạng thái chuyển động công khai, có lựa chọn giảm chuyển động của hệ điều hành.
3. **Hiệu ứng được kiểm quyền tại Server:** Core staging cấp riêng `GET /api/arena-staging/rooms/:code/gm-visuals` sau **gmAuthorized**. Viewer 2D/3D công khai không thể dùng nút client hoặc tham số URL để nhận mục tiêu đêm. Chỉ trả `eventId,targetId,kind,expiresAt` cho GM đã xác thực, cùng ván/cùng chu kỳ, TTL tối đa 18 giây; không trả actor/role/faction/Artifact riêng, kết quả Tiên Tri hoặc danh tính người bỏ phiếu.
4. **Chặn rò rỉ WebSocket staging:** bỏ target/actor/role/Artifact khỏi bản tin `battle_action_confirmed` công khai (không chạm production).
5. **Minh họa hiệu ứng cho người nghiệm thu:** Bảo vệ (lá chắn), Tiên Tri (hào quang tím), Phù Thủy cứu (xanh), tác động tấn công (hồng) chỉ chạy cục bộ ở chế độ mô phỏng. Khi kết nối phòng thật, hiệu ứng kín phải qua Core staging mới được phát.
6. **Tối ưu iPhone:** renderer 30FPS mục tiêu, giới hạn devicePixelRatio 1.15 cho màn hình hẹp, đồng hình học và vật liệu, ngắt vẽ khi tab ẩn, giảm chuyển động nếu thiết bị yêu cầu, giới hạn thời gian và số lượng hiệu ứng.
7. **Test đúng phạm vi:** unit 6–30 mô hình, hợp đồng phân quyền, token giả/không token 401, GM 200, private role leak, 30 người Core thật, 2D/3D đồng phòng, refresh/network reconnect; browser Chromium 390px và thử WebKit viewport iPhone (WebKit CI không tương đương Safari iPhone vật lý).
8. **Bảo toàn quy trình:** đồng bộ các thay đổi `main` sang nhánh nghiên cứu sau khi đối chiếu xung đột; không merge ngược hoặc tạo IPA/Runtime mới.

## Giới hạn / cần nghiệm thu
- Không tuyên bố đã kiểm tra nhiệt độ, pin, FPS trên **iPhone vật lý** nếu chưa có xác nhận trực tiếp. Browser WebKit trên Linux và Chromium SwiftShader chỉ xác nhận tương thích phần mềm.
- Hình 3D hiện là mô hình kỹ thuật anime/chibi procedural có 40 bảng phối màu, không phải đủ 40 bộ nhân vật sculpt chất lượng cuối.
- Không tự hiển thị hành động bí mật trên màn hình của người chơi. GM được xem nếu xác thực và Core có interaction được nhận diện. Các vai trò có actionId chưa được map sẽ không giả lập tác động.
- Core Player Web hiện hữu quản lý chính sách hành động theo phiên; Arena 3D hiện chưa tạo chức năng thực hiện hành động player-via-3D, chỉ đọc sự kiện và render. Luật game do Core xử lý.
- Cần nghiệm thu trực tiếp trên iPhone Safari, Chrome/Edge và Player Web staging với phòng 6–30 người, mất/reconnect mạng và phân quyền GM/Player.

## Rollback
- Nếu có lỗi, redeploy commit STAGING trước giai đoạn 3 từ workflow `deploy-arena3d-core-stage.yml`.
- Có thể đóng Draft PR #452; không có migration hoặc thay đổi dữ liệu Production cần rollback.
- Giữ link mẫu Giai đoạn 1 `gmww-arena3d-preview` độc lập để đối chiếu.
