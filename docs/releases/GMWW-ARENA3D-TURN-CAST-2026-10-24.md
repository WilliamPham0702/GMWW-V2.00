# GMWW Arena 3D — Mẫu nhân vật đứng dậy thi triển phép (24/10/2026)

## Yêu cầu nghiệm thu từ ảnh tham chiếu
- Làng ven biển có cùng mặt bằng cho Ngày/Đêm, các nhân vật chibi ngồi theo vòng quanh đống lửa.
- Chỉ người đang đến lượt mới **đứng dậy**, quay về phía tâm làng hoặc đối tượng được Core xác nhận, **thực hiện hiệu ứng phép**, sau đó **ngồi lại**.
- Ban đêm đặc biệt lưu ý: Player Web không được biết danh tính vai/nhân vật hay mục tiêu kín trước khi luật chơi cho phép công bố.
- Giữ nguyên GMWW Core V2.00, game 2D Production, dữ liệu/DO Production, IPA/Runtime và phát hành OTA.

## Release notes
1. **Character chibi đứng/ngồi** — `character-atelier.mjs` có ghế thấp dùng InstancedMesh, tư thế ngồi mặc định cho toàn bộ nhân vật, chuyển tư thế mượt theo thời gian, người đang có lượt mới đứng. 6–30 người dùng chung geometry/mat, chỉ thêm một draw call ghế.
2. **Trình diễn phép theo lượt** — `casting-choreography.mjs` cung cấp hợp đồng `gmww.arena.cast.v1`. Nhân vật quay về mục tiêu và nâng tay khi thi triển lá chắn, cứu, tiên tri, tấn công hoặc biểu quyết (chỉ các actionId thuộc whitelist).
3. **Server quyết định ai đứng** — Core Staging đọc lượt đêm hiện tại từ `getNightRuntime`, chỉ chuyển danh tính người đang hành động qua endpoint `/api/arena-staging/rooms/:code/gm-visuals` có `gmAuthorized`. Sau khi `gmBattleAction` hoặc `gmDayAction` được Core xử lý thành công mới lưu dấu diễn xuất ngắn hạn cho GM; không sửa logic Core. Thay lượt, hết ván hoặc refresh khác chu kỳ phải hạ hiệu ứng/tư thế cũ.
4. **Không lộ vai đêm trên Player Web** — nhánh Staging đã lọc `night_turn.runtime`, `room_cycle.nightRuntime`, người hành động, mục tiêu và vai kín trong các broadcast liên quan. Endpoint GM riêng buộc xác thực, không tạo API công khai danh sách người hành động.
5. **Nút demo dễ nghiệm thu** — khi chưa vào phòng, `🪄 Mẫu lượt đứng dậy và làm phép` biểu diễn lần lượt các chibi xếp ghế; hoàn toàn cục bộ, không ghi hành động vào Core hoặc DO. Khi đang chơi phòng thật, nút demo bị chặn và không phát lệnh game.
6. **Chi phí iPhone** — giữ renderer giới hạn FPS/DPR của GĐ4, hỗ trợ reduced-motion, hình học tái sử dụng; không phát âm thanh mới/không tải thêm texture.
7. **CI đúng phạm vi** — kiểm tra quyền GM/đúng match/cycle, chuyển tư thế 6/12/20/30, phép bị từ chối khi actionId không hợp lệ, WebSocket không gửi hàng đợi vai kín; WebKit viewport iPhone nhấn demo và xác minh ngồi→đứng→phép→ngồi.

## Phạm vi chưa hoàn tất
- Đây là animation với Character procedural chibi 3D kỹ thuật, chưa phải toàn bộ 40 model điêu khắc và spell VFX cao cấp như ảnh minh họa.
- Hiện chỉ các lượt Core xác định rõ người thực hiện được dựng tư thế đứng. Lượt mở đầu/sự kiện nhóm không có actorId thì không dựng sai một người bất kỳ.
- Hiệu năng, pin và nhiệt trên **Safari iPhone vật lý** cần chủ dự án nghiệm thu. Chromium và WebKit CI không đại diện GPU iPhone thật.
- Chưa đưa hành động ma sói 3D lên Production; Player Web Production vẫn giữ cơ chế 2D hiện hành.

## Rollback
- Dùng workflow `deploy-arena3d-core-stage.yml` triển khai lại commit staging trước phần casting nếu cần. Không có migration trong Production, không thay IPA, không tự merge PR #452.
