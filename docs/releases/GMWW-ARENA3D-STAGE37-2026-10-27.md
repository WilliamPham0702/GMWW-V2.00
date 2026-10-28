# GMWW Arena 3D — Giai đoạn 37: chống trùng tải trạng thái GM (27/10/2026)

## Nội dung cập nhật
- Thêm `stage37-gm-refresh-gate.mjs`: gộp các lần tải `GET /api/gm/rooms/:code` riêng tư khi WebSocket liên tục gửi sự kiện; tối đa một request cùng phiên đang thực thi và một cập nhật kế tiếp sau khoảng cách tối thiểu 750 ms.
- Khi đổi **phòng, mã GM, matchId hoặc cycleKey**, huỷ yêu cầu cũ bằng `AbortController`, từ chối dữ liệu đã lỗi thời. Không đưa mã GM vào URL, DOM, báo cáo hiệu năng hoặc Player Web.
- Khi Core trả HTTP **401/403** cho GM: thu hồi ngay quyền trên giao diện Arena, bỏ VFX riêng tư, dừng audio và yêu cầu xác thực lại. Đây là xử lý giao diện fail-closed, không thay đổi cơ chế phân quyền server.
- Tab chuyển nền hoặc mất quyền GM: dừng yêu cầu riêng tư đang thực hiện, xoá timer cập nhật trễ. Khi có quyền GM và tab hiện trở lại vẫn dùng Core/WebSocket và nhịp dự phòng như trước.
- Chỉ điều chỉnh mô-đun Arena 3D; không can thiệp loop realtime Core, trạng thái trận, luật Vai Trò/Artifact hoặc Player Web/2D.

## Kiểm thử đúng phạm vi
- `tests/arena3d-stage37-gm-refresh.test.mjs`: burst request, thay lượt/phiên và hủy timer khi ẩn tab/thu hồi quyền.
- CI Arena 3D bổ sung kiểm tra cú pháp và bài unit GĐ37. Cần đối chiếu kết quả GitHub Actions trên SHA cuối, không tự coi là PASS trước khi runner hoàn tất.
- Chưa đánh giá trực tiếp FPS, pin hoặc nhiệt trên iPhone vật lý, không suy đoán mức tiết kiệm định lượng.

## Phát hành và rollback
- PR [#487](https://github.com/WilliamPham0702/GMWW-V2.00/pull/487) tiếp tục **Draft, chưa merge**. Chưa phát hành bản Runtime OTA/IPA/Production mới.
- **Rollback:** revert commit GĐ37, giữ nguyên STAGING và Production trước đó. Không thao tác với Durable Objects hoặc dữ liệu trận.
- Còn các chốt sản phẩm trước khi phát hành: native Player 3D thao tác riêng tư, kiểm toán toàn bộ luật vai/Artifact cấu hình động, ván thật GM/Player trên STAGING mới, CI bắt buộc và xác minh iPhone Production.
