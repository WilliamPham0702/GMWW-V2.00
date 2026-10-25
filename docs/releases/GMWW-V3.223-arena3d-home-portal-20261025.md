# GMWW Runtime V3.223 — Vào Làng mở Arena 3D thử nghiệm

**Ngày:** 25/10/2026 · **Loại:** Runtime OTA (không tạo hoặc thay IPA).

## Thay đổi
- Nút **VÀO LÀNG** ở Trang Chủ hiện mở giao diện **Arena 3D thử nghiệm**, trực tiếp trong màn hình GMWW và WKWebView iPhone thông qua iframe HTTPS đến Worker STAGING.
- Thanh điều hướng thử nghiệm luôn có **‹ Trang Chủ** và **Chơi 2D**. Khi thoát, iframe 3D được dỡ để ngừng kết xuất và giải phóng tài nguyên GPU.
- Nhãn **THỬ NGHIỆM ARENA 3D** giúp phân biệt rõ chế độ QA với phiên chơi chính thức.
- Các nút điều hướng 2D và chế độ chơi 2D gốc vẫn giữ nguyên. Nút VÀO LÀNG chỉ tạm thời được gán cho Arena 3D theo yêu cầu chủ dự án.

## Phân cách và an toàn
- Arena 3D lấy giao diện + trạng thái từ `https://gmww-arena3d-stage14-staging.williampham0702.workers.dev/village/arena-3d/live.html`, là Worker/Durable Objects STAGING riêng của PR Draft #487.
- Không truyền token GM Production, mã phòng, member ID hay thông tin phiên chơi từ trang chính vào iframe Arena.
- Không merge PR Draft #487; không sao chép Arena 3D/Core thử vào worker Production.
- Không sửa Core/gameplay, phòng, lịch sử, Player Web, IPA Swift/Xcode, dữ liệu hoặc đường download IPA chính thức.

## Kiểm thử đúng phạm vi
- Nút VÀO LÀNG chặn handler cũ, tạo iframe STAGING, không mở tab Safari từ ứng dụng GMWW; đóng iframe quay về Trang Chủ, chọn Chơi 2D quay lại trang chơi gốc.
- Đối chiếu manifest Runtime V3.223 có release notes, SHA-256 từng file, bản OTA phải mới hơn Production; xác nhận health/manifest sau deploy.

## Rollback
- Nếu không tải được 3D hoặc iPhone WKWebView có lỗi, nút Chơi 2D vẫn dùng đường điều hướng gốc.
- Có thể rollback Worker Production và Runtime OTA về bản **V3.222** đã kiểm chứng từ phiên bản Cloudflare/manifest trước đợt triển khai; tuyệt đối không xóa Durable Objects hoặc dữ liệu phòng.
- Khi kết thúc thời gian thử, khôi phục hành vi VÀO LÀNG = Trang Chơi bằng cách bỏ đoạn inline QA và phát hành Runtime mới.

**Trạng thái:** mã nguồn sẵn sàng chờ CI và phát hành có kiểm chứng, chưa xác nhận trải nghiệm iPhone vật lý.
