# GMWW Arena 3D — Giai đoạn 4: GM Console + 40 biến thể Character (24/10/2026)

## Phạm vi

- Triển khai trên **nhánh nghiên cứu PR #452** và Cloudflare Worker STAGING riêng `gmww-arena3d-core-staging`, sử dụng Core V2.00 / Durable Objects STAGING hiện có.
- Không merge `main`, không deploy Production, không đụng Runtime/OTA, GM IPA, game 2D hoặc dữ liệu phòng thật.
- Đã đối chiếu và **đồng bộ an toàn main `b60b5668783cac5e7946e4cdd4318b4aa00ad40a` vào nhánh nghiên cứu**, kiểm tra không có tệp xung đột; không merge ngược.
- Không thay đổi luật game: mọi lệnh GM được gửi tới API V2 vốn đã xác thực bằng token phòng. Player Web STAGING dùng cùng Core với Arena.

## Release notes tiếng Việt

1. **Giao diện điều hành GM 3D**: thêm `gm-dashboard.mjs` và giao diện gọn trong `live.html`, tab Phòng, Ngày/Đêm, Lên Giàn, Hiệu ứng, Hiệu năng; nhấn chọn Seat có người chơi công khai; hiển thị tên, trạng thái hiện hữu, tổng phiếu, kết luận vote và tình trạng trực tuyến. Nghiêm cấm hiển thị vai trò, phe, Artifact bí mật hoặc danh tính từng phiếu ở tab công khai.
2. **Luồng GM dùng Core thật**: Phát Vai, khóa Seat, vào trận, đổi Ngày/Đêm, mở đề cử tự động; chọn đúng Seat để GM bắt đầu bỏ phiếu (không tự chọn người đầu danh sách). Thành viên thực tham gia Player Web được ưu tiên Seat; nút tạo người thử chỉ lấp ghế trống.
3. **Xác thực lại GM sau refresh**: người tạo phòng STAGING được nhận mã GM qua Core, có thể chép mã và xác thực lại trên tab mới bằng endpoint có kiểm quyền; mã chỉ tồn tại trong bộ nhớ phiên/tab và ô nhập tạm, không đưa vào URL, localStorage hoặc sessionStorage.
4. **40 phối hợp phong cách Character chibi biển**: thêm 5 kiểu phụ kiện (kẹp tóc/ribbon/áo choàng, phối màu khác nhau) trên các phối màu da/tóc/trang phục. Hình học InstancedMesh tiếp tục chia sẻ giữa tối đa 30 người; chi phí draw-call của trường nhân vật giữ giới hạn cố định, thay vì nhân lên theo lượng nhân vật. Đây là **40 tổ hợp tạo hình procedural kỹ thuật**, không phải 40 model mỹ thuật điêu khắc riêng đã hoàn tất.
5. **Animation thêm**: vẫy tay, gật đầu, cổ vũ, xoay theo bước 90° và tương tác chạm, có giảm chuyển động khi hệ điều hành yêu cầu; không quyết định hành động game trên Client.
6. **Chế độ tiết kiệm pin**: có nút giảm độ phân giải GPU và mục tiêu 20 FPS, trả về chế độ mượt 30 FPS; không tác động đến số lượt, đồng hồ hay hoạt động GMWW Core/Player Web.
7. **Giữ nguyên phân quyền hiệu ứng** từ Giai đoạn 3: chỉ GM đã xác thực mới nhận hiệu ứng riêng được phép từ Durable Object STAGING. Người chơi chỉ nhận trạng thái public và tổng phiếu.
8. **CI đúng phạm vi**: tests/arena3d-phase4.test.mjs (40 kiểu chibi, instanced 30 người, bảng điều hành không lộ role/Artifact), tests/arena3d-phase4-browser.mjs (browser điều hành GM thật, 6 thành viên thử, chọn Seat, Phát Vai, Ngày/Đêm, đề cử/vote và chế độ pin). Giữ kiểm thử Phase2/3 trực tiếp liên quan; không chạy hồi quy unrelated Production.

## Giới hạn đã công bố

- Chưa có kết quả FPS, nhiệt độ, pin trên **iPhone thật** cho Giai đoạn 4. WebKit CI và Chromium GPU phần mềm chỉ là chỉ số kiểm tra kỹ thuật; không tuyên bố đạt 30FPS trên thiết bị thật.
- Các Character mới là chibi 3D procedural, chưa phải đủ 40 mẫu sculpt nghệ thuật theo asset 2D gốc. Lên bản mỹ thuật sculpt thật cần các file model 3D/đợt nghiệm thu tài nguyên khác.
- Một số hiệu ứng vai trò chưa có actionId chuẩn trong Core vẫn không tự tạo, tránh hé lộ bí mật hoặc giả luật chơi. Gameplay Player Web/IPA Production không đổi.
- Xác thực GM bằng mã chỉ phục hồi quyền đã cấp, không tạo thêm quản trị viên hay lối tắt quyền.
- Bộ test Chrome/WebKit trên Linux không thay thế nghiệm thu thiết bị Safari iPhone vật lý.

## Kiểm tra nghiệm thu Giai đoạn 4

1. Trên Safari iPhone mở link `https://gmww-arena3d-core-staging.williampham0702.workers.dev/village/arena-3d/live.html`.
2. Kiểm tra 6/12/20/30 Character, xoay 360°, chọn Seat ở bảng GM, chuyển giữa tab, các phụ kiện tóc/áo choàng.
3. Tạo phòng Staging; dùng Player Web Staging cùng phòng. GM điều hành Phát Vai, chuyển Ngày/Đêm, đề cử/vote; refresh xem tổng phiếu.
4. Bật/Tắt tiết kiệm pin; quan sát FPS thực và nhiệt máy; báo lỗi với đúng chức năng gây lỗi.
5. Thử xem hiệu ứng quyền GM và quyền Viewer khác nhau: Viewer không xem được hành động kín, không có quyền điều khiển game.

## Rollback

- Triển khai lại commit STAGING trước Giai đoạn 4 qua `deploy-arena3d-core-stage.yml`.
- Production Worker và DO không bị động đến nên không yêu cầu rollback Production; không phát hành IPA hoặc Runtime.
