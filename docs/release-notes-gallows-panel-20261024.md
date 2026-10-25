# GMWW — Thiết kế lại trang Treo Giàn (ứng viên phát hành tiếp theo)

Ngày: 24/10/2026. **Ứng viên Runtime V3.203 (đã tăng version trên nhánh thử), chưa merge, chưa triển khai Production, chưa phát hành IPA.**

## Thay đổi
- Đưa danh sách người chơi còn sống lên đầu. Mỗi người 1 dòng gồm STT, tên, đề cử/đủ quyền, Cứu/đủ quyền, Giết/đủ quyền, Cấm Chọn, Cấm Vote. Xếp số đề cử giảm dần và hòa theo ABC tiếng Việt. Có thu gọn, tối đa 10 hàng hiển thị, cuộn dọc và ngang trên iPhone; giữ tỷ lệ Character.
- Một nút chuyển Tự động ⇄ Thủ công và nút Khôi phục bên cạnh.
- Tự động có ĐỀ CỬ/BỎ PHIẾU là hai hộp điều khiển có thể chuyển, nhập thời gian 1–3.600 giây và tự lưu khi rời ô. Mặc định 60 giây riêng từng hộp, không còn đặt tại Chọn Ván.
- Nút MỞ/CHỐT ĐỀ CỬ và MỞ/CHỐT PHIẾU; Server làm chủ deadline, từ chối lượt muộn, quyết định người có số đề cử cao nhất; hòa đề cử phải GM chọn, hòa phiếu Cứu/Giết xử theo luật cũ.
- Hộp thông tin người lên giàn và trạng thái kết luận Sống/Chết. GM Thủ công chạm trực tiếp tên trong danh sách rồi Chốt Sống/Chết. Khôi phục giữ đúng phạm vi dữ liệu Lên Giàn.
- Bỏ toàn bộ đường dẫn audio khỏi trang Treo Giàn; thư viện **Âm thanh → Hệ thống** có sẵn vị trí upload: Ngày dài rồi, Mở đề cử, Mở bỏ phiếu, Kết quả đề cử, Công bố số phiếu, Kết luận Sống, Kết luận Chết. Các mục mới chưa có file audio nên chủ dự án tự nạp.
- Worker Durable Object broadcast `gallows_updated` tới GM/Player Web, giữ logic Online/Offline/DEMO theo Core; không thay đổi Seat, hiệu ứng treo hoặc bối cảnh.
- Rà soát cuối: **Chốt Đề Cử không tự mở Bỏ Phiếu**; nút Mở Bỏ Phiếu chỉ bật sau khi chốt. GM luôn ưu tiên người được đề cử nhiều nhất; trường hợp hòa chỉ cho chọn một trong các người đồng hạng cao nhất; chống ô chọn tên cũ làm sai ứng viên. Server từ chối đề cử từ người ngoài danh sách đủ quyền. Đã bổ sung test hồi quy trực tiếp.
- Đồng bộ V3.203, OTA Candidate SHA-256, kiểm chứng Worker/Native, giữ nguyên IPA đang phân phối V3.200 và Native shell V3.110.

## Phạm vi kiểm thử
- `tests/gallows-panel-60s-controls.test.mjs` — 60 giây, chốt sớm, người cao phiếu/hòa, UI danh sách và thư viện.
- `tests/gallows-redesign-live.test.mjs`, `v3148-gallows-integrity`, `v3189-fire-gallows-voting`, `v3192-gallows-dual-mode`, `gallows-hanging-character`, `gallows-hanging-anchor-walk`.
- Kiểm tra cú pháp JS và 6 module nguồn GM phải khớp tuyệt đối với `current/app.js`.

## Bảo vệ dữ liệu / rollback
Không có migration Durable Object, không thay đổi phòng chơi hay lịch sử; chỉ bổ sung lệnh có phân quyền GM. Khi cần rollback, quay về commit Runtime và UI trước PR này, giữ nguyên state đang lưu. Chưa thực hiện phát hành OTA/IPA và chưa nghiệm thu iPhone/Player Web trên thiết bị thật. **CI đạt không thay thế nghiệm thu Production hoặc Preview thực tế.**

## Đối chiếu V1.09
Đã kiểm tra repository V1 được kết nối nhưng chưa tìm thấy danh mục âm thanh lịch sử V1.09 xác thực. Bổ sung các vị trí upload dựa trên tình huống được yêu cầu, **không khẳng định tên file âm thanh V1.09**.
