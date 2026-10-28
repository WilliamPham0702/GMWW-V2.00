# GMWW Arena 3D — Giai đoạn 38: Lên Giàn 3D công khai (27/10/2026)

## Cập nhật sản phẩm
- Khi Core công khai ứng viên ở giai đoạn **bỏ phiếu / đã xử lý**, nhân vật thật đi từ Seat đến giữa làng và được nâng lơ lửng phía trên đống lửa. Cánh tay chuyển động nhẹ, tôn trọng Reduce Motion.
- Chỉ dùng các **InstancedMesh** nhân vật sẵn có; không tạo mesh 3D hay draw call mới. Khi kết thúc Lên Giàn/đổi Ngày–Đêm, nhân vật trở về Seat. Không thay luật, trạng thái chết/sống, đề cử hay quyền vote.
- Cả GM Arena 3D và Player Arena 3D đều nhận ứng viên qua nguồn Core phù hợp quyền: GM qua state xác thực, Player qua WebSocket công khai. Người chơi vẫn thực hiện lá vai và bỏ phiếu trong Player Web hiện hành; không chuyển giao credential.
- Chặn websocket phiếu từ **match/chu kỳ cũ**. Khi reconnect hoặc đổi ngày, dọn state ứng viên cũ; polling public của Production **không được xoá phiếu công khai còn hợp lệ** chỉ vì endpoint STAGING riêng không tồn tại.
- Giao diện GM đọc đúng `voteTotals.save/kill` từ Core Production, tránh hiển thị undefined và tránh phát lại hiệu ứng đánh dấu khi không thay đổi ứng viên.

## Kiểm thử đúng phạm vi
- `tests/arena3d-stage38-gallows.test.mjs`: xác minh ứng viên từ công khai, danh tính Seat tồn tại, bỏ qua role/private/target lạ, giới hạn chuyển động và Reduced Motion, chống packet quá lượt, WS reconnect và polling, hợp đồng GM/Player.
- Cập nhật `.github/workflows/arena3d-stage14-16-research.yml`: kiểm tra cú pháp mới và chạy test GĐ38 cùng các bài Arena liên quan.
- **Không mặc định CI PASS** khi chưa đọc workflow đúng HEAD. Chưa đo FPS/pin/nhiệt vật lý trên iPhone mới; chỉ khẳng định không thêm đối tượng render.

## Phát hành
- PR [#487](https://github.com/WilliamPham0702/GMWW-V2.00/pull/487) vẫn **Draft**. Không merge hay cập nhật Production/OTA/IPA trước khi hoàn tất gates tích hợp với `main`, quyền riêng tư, ván full GM/Player và CI bắt buộc.
- Rollback: revert commit GĐ38 trên nhánh Arena; không can thiệp RoomDurableObject hoặc dữ liệu người chơi.
