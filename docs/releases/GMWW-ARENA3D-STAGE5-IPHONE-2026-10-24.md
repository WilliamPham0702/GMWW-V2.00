# GMWW Arena 3D — Giai đoạn 5: tối ưu iPhone & đồng bộ Scene (24/10/2026)

## Nội dung thay đổi (nhánh nghiên cứu sau PR #452)
1. **Bảo toàn chuyển động Character khi đồng bộ phòng:** WebSocket/HTTP có thể gửi lại trạng thái công khai nhiều lần. Renderer 3D tính dấu vết riêng của Scene từ mã phòng, match, seat, ngoại hình, tọa độ, trạng thái công khai. Nếu không đổi, không dựng lại 25 nhóm InstancedMesh hoặc ghi lại bảng màu vào GPU. Thay đổi tên/online/ngày-đêm vẫn cập nhật HUD và GM Console, không reset animation.
2. **Tối ưu tự động cho Safari/iPhone:** đo nhịp `requestAnimationFrame` thực tế, phát hiện tình trạng trễ kéo dài theo cửa sổ lấy mẫu; khi áp lực lớn giảm DPR, tốc độ render và mật độ hiệu ứng thông qua chế độ pin hiện có. Khi nhịp máy phục hồi đủ lâu, tự trở lại chế độ mượt. Có khoảng chờ để tránh chuyển đổi liên tục, bỏ qua thời gian tab ẩn/ngủ.
3. **Chủ động điều khiển:** nút `⚡ Tối ưu tự động: Bật/Tắt` trên Arena STAGING; GM vẫn có thể chọn `Mượt` hoặc `Tiết kiệm pin` thủ công (ưu tiên lệnh thủ công). Không chỉnh Core gameplay, vai, thẻ, vote, Room Durable Objects.
4. **Quan sát nghiệm thu:** chẩn đoán read-only bổ sung `sceneRebuilds`, `autoQualityEnabled`; HUD tiếp tục hiện FPS/draw calls. Không ghi thông tin vai/GM vào log, query hay storage.

## Kiểm thử đúng phạm vi
- Scene không bị dựng lại khi nhận bản tin cùng roster, thay tên/online, chuyển đêm/ngày.
- Scene phải cập nhật khi thay seat, character, vị trí, di chuyển, công khai trạng thái và match.
- Tự chuyển cấp chất lượng khi trễ kéo dài; phục hồi khi nhịp rAF tốt, bỏ qua tab ẩn.
- Không thêm quyền xem vai riêng, không chạm token và không dùng dữ liệu Production.
- CI: `Check Dual Renderer Architecture` với `tests/arena3d-stage5-performance.test.mjs`.

## Điều chưa được nghiệm thu
- Chưa có phép đo FPS, pin, nhiệt độc lập trên Safari iPhone vật lý. Auto-quality là biện pháp giảm tải phòng ngừa, **không được xem là bảo đảm 30 FPS**.
- Chưa nâng cấp 40 Character thành 40 mô hình điêu khắc 3D mỹ thuật độc lập.
- Chưa deploy bản Stage 5 lên Arena STAGING; bản xem cũ không thể hiện các thay đổi trước khi có triển khai STAGING.

## An toàn và rollback
- PR riêng xuất phát từ `main` sau khi PR #452 đã merge.
- Không tự merge, không deploy Production hoặc thay đổi Worker/Durable Object/Room/IPA/Runtime/OTA của Production; game 2D vẫn nguyên trạng.
- Có thể đóng PR để giữ nguyên Production; sau khi triển khai STAGING riêng, rollback bằng cách deploy lại commit STAGING thành công trước đó.
