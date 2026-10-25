# GMWW Arena 3D — GĐ22: sửa canh khung hình iPhone 60Hz (25/10/2026)

## Đầu vào thực tế — báo cáo iPhone
Người dùng gửi kết quả Arena 3D phiên bản `gmww.arena.mobile-qa.19-21`, 6 Character ở chế độ nghỉ:
- 119 mẫu, FPS vẽ đo được **10,4**, trong khi yêu cầu **12 Hz**.
- Median/p95 khoảng cách giữa khung vẽ đều **100 ms** (tương đương khoảng 10 FPS).
- CPU vẽ median **2 ms**, p95 **4 ms**, **46 draw calls**, pixel ratio **1,2**.
- Mất/khôi phục WebGL: 0/0. Không có cảm biến nhiệt độ hoặc đo hao pin trực tiếp.
- Mẫu này chỉ đại diện cho **6 Character khi nghỉ**, chưa nói lên FPS lúc Character thi triển phép hoặc ván có 30 người.

## Thay đổi GĐ22 — không đụng logic game
Nguyên nhân trong mã giao diện: điều kiện `now-lastPaint >= 1000/12` đặt lại thời điểm vẽ sau *từng khung*. Trên màn hình 60Hz, khung RAF xuất hiện mỗi ~16,7ms; mốc 83,3ms đôi khi bị lỡ và phải đợi đến 100ms. Mục tiêu 12 FPS vì vậy có thể hiển thị thành ~10 FPS.

- Thay bằng `createArenaPaintScheduler` trong `render-optimization.mjs`, sử dụng **deadline tích lũy** thay vì reset deadline theo thời gian thực khi đã vẽ.
- Mốc vẽ chính xác hơn ở cả màn hình 60/120Hz. Không vẽ bù nhiều khung khi mất FPS; không tăng mục tiêu **12 FPS nghỉ / 30 FPS hoạt động** hoặc **8/20 FPS tiết kiệm**.
- Khi Safari vào nền, WebGL mất hoặc được khôi phục, reset deadline để không có cú vẽ bù. Giữ nguyên WebSocket, trạng thái Core, GM-only, Artifact, Seat và ván chơi.
- Kiểm thử mô phỏng 60/120Hz (8/10/12/20/30 FPS) và chuyển trạng thái tích hợp trong suite hiệu năng GĐ18 đã có, tránh mở rộng CI không liên quan. Test độc lập `tests/arena3d-stage22-frame-pacing.test.mjs` cũng có thể chạy bằng Node.

## Phát hành và nghiệm thu
- Chỉ áp dụng trên PR Draft #487 và Worker STAGING độc lập. Không merge hoặc phát hành Production, không cập nhật game 2D, OTA, IPA hoặc dữ liệu phòng chơi.
- **Không đánh đồng lịch vẽ chính xác hơn với FPS đo được cao hơn trên iPhone thật**; GPU/CPU, Safari tab throttle và pin có thể tiếp tục giới hạn hiệu năng.
- Khi test trên iPhone, để 6 người đứng yên và bấm "📊 Đo hiệu năng iPhone" → "Đo lại từ đầu" → sau vài chục giây "Lấy kết quả". Sau đó nên đo riêng khi Character thi triển và khi có 30 người.
- Rollback Worker STAGING về phiên bản GĐ19–21 `f5139a2b-8413-4fd0-9cc1-243b771019fe`; Production không đổi.

## Kết quả phát hành STAGING GĐ22 đã xác minh
- GitHub Actions chạy lại đúng SHA mã có GĐ22 và bộ test: **SUCCESS** https://github.com/WilliamPham0702/GMWW-V2.00/actions/runs/40169355205.
- Worker Cloudflare STAGING version **`dd78c369-351c-4f5f-989c-00b71dfc55d7`**.
- Chrome headless: **PASS** cho 6, 12, 20, 30 Character (CI reported 11 FPS, 46 draw calls). WebKit headless: **PASS** cho 6, 12, 20, 30 Character (CI reported 5 FPS, 46 draw calls). Số liệu headless GPU phần mềm, **không phải FPS đo trên iPhone vật lý**.
- E2E Core staging thật: GM xác thực và bảo vệ, chuyển Đêm → Ngày, mở đề cử và bỏ phiếu, Player Web reconnect, người xem truy cập GM-only HTTP 401: **PASS**.
- Core custom Role shield 2 mục tiêu + Artifact heal 1 mục tiêu, xác thực quyền xem **PASS**.
- Kết quả iPhone bản cũ 10,4 FPS không được tự thay bằng FPS mô phỏng hay FPS headless. Cần người dùng đo lại trên Safari iPhone với phiên bản STAGING mới.
