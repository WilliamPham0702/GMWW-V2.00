# GMWW Arena 3D — Bước ra làm phép rồi trở về ghế (24/10/2026)

## Phạm vi
- Tiếp tục Giai đoạn 4 trên Draft PR #452, chỉ triển khai vào Cloudflare **Core STAGING** `gmww-arena3d-core-staging`, giữ nguyên mã nguồn và dữ liệu Production.
- Bám sát hình mẫu: người chơi **ngồi vòng quanh đống lửa**, tới lượt đứng lên, **bước vào khoảng sân nghi lễ**, hướng về người nhận tác động, thi triển hiệu ứng rồi **trở lại chính ghế ban đầu và ngồi xuống**.
- Đã đồng bộ main ở giai đoạn trước; trước bản này main và nhánh feature vẫn ở cùng mốc Production `b60b5668783cac5e7946e4cdd4318b4aa00ad40a`.

## Release notes tiếng Việt
1. `casting-choreography.mjs`: Thêm đường đi nghi lễ `approachPoint` lấy vị trí Seat công khai, bước ngắn vào trong vòng nhưng phải cách đống lửa tối thiểu 1,7 đơn vị. Tính quãng đường với binary search chống cắt ngang lửa, không tác động tới Core hoặc thay đổi Seat nguồn.
2. `character-atelier.mjs`: Giữ riêng `position` gốc và `renderPosition` dành cho diễn hoạt. Mỗi lượt có 4 trạng thái: đứng dậy/bước vào (~850ms) → làm phép theo xác nhận Core → bước về (~920ms) → ngồi xuống. Ghế `InstancedMesh` nằm tại tọa độ gốc, không di chuyển theo người.
3. Hiệu ứng pháp thuật phải chờ nhân vật đi tới khu vực thi triển, sau đó vẽ luồng sáng từ **vị trí hiển thị thực** tới mục tiêu Core cấp quyền, không còn phát từ ghế. Chuyển lượt/xóa cue sẽ thu hồi luồng sáng và đưa người cũ về ghế; những nhân vật không có lượt không đứng lên.
4. Camera iPhone: Nút `🎥 Theo lượt: Bật/Tắt` giúp camera hướng theo người đang làm phép; nút `↺ Góc nhìn ban đầu` khôi phục vị trí nhìn; kéo xoay và chụm hai ngón để zoom trong giới hạn. Camera chỉ theo actor được phép hiển thị, không đọc danh tính vai trò đêm qua WebSocket công khai.
5. Nút `🪄 Mẫu lượt đứng dậy và làm phép` trong phòng mẫu trình bày 5 giai đoạn: đứng, đi vào trong, làm phép, đi về, ngồi xuống. Không ghi hành động trên Core hoặc thay đổi dữ liệu Player Web.
6. `tests/arena3d-ritual-walk.test.mjs`: Kiểm thử Seat 6/12/20/30, khoảng cách tới lửa trên toàn quãng đi, ghế đứng yên, chỉ người được Core xác thực di chuyển, luồng phép tắt khi đổi lượt, và camera không truy cập thông tin bí mật.
7. WebKit mô phỏng màn hình iPhone: thử bật/tắt camera theo lượt và đủ chuỗi đứng → phép → quay về → ngồi. Chỉ chạy CI hợp đồng Core/Arena có liên quan; không chủ động chạy xây dựng IPA, OTA hay test Production.

## Những điều không thay đổi
- Không sửa luật vai trò hoặc quyết định người đến lượt trên Client. Chỉ `gmAuthorized` trong Core Staging trả dữ liệu diễn hoạt kín cho GM hợp lệ; Player Web không nhận cue bí mật.
- Chỉ di chuyển hình ảnh Character trong Renderer, không dịch Seat của thành viên; ghế được đặt theo Core và giữ ổn định qua Ngày/Đêm, refresh, reconnect.
- Không merge PR #452 vào main, không deploy Production và không đổi DO/dữ liệu thực, Runtime/OTA, IPA hoặc game 2D đang chạy.

## Giới hạn cần nghiệm thu
- Cảnh làng và Character vẫn là 3D low-poly/procedural thay vì đồ họa hoàn thiện chi tiết như ảnh minh họa.
- Chưa xác nhận FPS, pin và nhiệt độ trên **Safari iPhone vật lý**; số liệu Chromium/WebKit SwiftShader Linux chỉ là máy kiểm thử phần mềm.
- Trong phòng thật, chưa có hành động riêng tư của người chơi trực tiếp trên Arena 3D; lõi gameplay và phân quyền tiếp tục thuộc Core V2.00.

## Rollback
- Khi có lỗi, triển khai lại phiên bản `gmww-arena3d-core-staging` thành công trước thay đổi bằng workflow `.github/workflows/deploy-arena3d-core-stage.yml`.
- Không có thay đổi trong Production cần rollback.
