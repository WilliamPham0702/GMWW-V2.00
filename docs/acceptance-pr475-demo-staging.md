# Nghiệm thu iPhone & Player Web — PR #475 (STAGING độc lập)

**Phạm vi:** 4 lỗi Sát Thủ, soi xét nhiều mục tiêu, audio Nhà Tinh Thần Học, quyền Cứu/Giết.
**Ngày chuẩn bị:** 25/10/2026. **Phiên bản:** ứng viên trên nhánh PR #475, không phải Runtime/IPA Production.

## Đường dẫn STAGING
- GM Safari iPhone: https://gmww-demo-pr475-staging.williampham0702.workers.dev/gm-pr475/GMWW.html
- Player Web: https://gmww-demo-pr475-staging.williampham0702.workers.dev/
- Xem CI: https://github.com/WilliamPham0702/GMWW-V2.00/actions/workflows/deploy-demo-pr475-staging.yml

**Lưu ý:** dùng GM Safari STAGING, **không mở IPA GM Production** để nghiệm thu nhánh này. GM STAGING/Player STAGING phải cùng domain; tài khoản và phòng chơi STAGING tách biệt. Không đưa mã phòng STAGING vào Player Web Production.

## 4 tiêu chí nghiệm thu

- [ ] **1. Sát Thủ.** DEMO chọn nạn nhân A và đánh dấu bí mật 👍/👎 vào ban đêm. Đến sáng DEMO tự mô phỏng lựa chọn 👍/👎 của A, chốt Sống khi cùng dấu/Chết khi khác dấu, ghi lịch sử. Ở Online/Offline, A tự trả lời trên Player Web; tuyệt đối không mở sớm lựa chọn ban đêm.
- [ ] **2. Soi xét đủ mục tiêu.** Nhà Tinh Thần Học chọn 2 người khác nhau, ra CÙNG PHE/KHÁC PHE, lưu lịch sử GM. Các vai có chức năng chọn 3 đối tượng phải chọn đủ 3. Không lộ danh tính vai trò qua Player Web.
- [ ] **3. Audio Nhà Tinh Thần Học.** Khi có file đã gắn đúng danh mục Audio trên GM STAGING: phát cue CÙNG PHE/KHÁC PHE, tiếp theo đoạn mở đầu 3–5 giây tên vai của từng người được soi, tuần tự không chồng tiếng. Nếu không có file ở STAGING, kết quả audio là **CHƯA NGHIỆM THU**, không được ghi ĐẠT.
- [ ] **4. Lên Giàn.** Người lên giàn không được nhấn 👍 Cứu/👎 Giết cho chính mình. Người đã chết/bị đuổi không được đề cử hoặc bỏ phiếu. Người sống còn quyền vote bình thường; GM thấy số phiếu và số người đủ quyền tương ứng. Kiểm cả DEMO, Online/Offline có liên quan.

## Phương pháp kiểm thử
- Chạy trên iPhone Safari vật lý, cùng domain STAGING. WebKit mô phỏng do CI thực hiện chỉ chứng minh tải giao diện, **không thay nghiệm thu iPhone thật**.
- Chỉ kiểm các chức năng vừa sửa, các đường gọi Server/Player Web cần thiết; không yêu cầu kiểm 30 Seat, OTA, Chrome Card hoặc Arena 3D.
- Đính kèm screenshot hoặc mô tả trạng thái nếu chưa đạt; chỉ sửa trong PR, không merge hoặc deploy Production trước khi chủ dự án phê duyệt.

## An toàn dữ liệu
- Worker STAGING: `gmww-demo-pr475-staging`, có Durable Object riêng.
- Token GM STAGING ngẫu nhiên theo từng deployment, không dùng token Production; Source và IPA Production không đổi.
- Chỉ tạo/xóa phòng QA tại STAGING, không thao tác dữ liệu Phòng Production.
- Rollback: dừng Worker STAGING hoặc revert commit nhánh PR, không ảnh hưởng Worker/DO/IPA Production.

**Trạng thái nghiệm thu cuối:** CHỜ NGƯỜI DÙNG KIỂM TRA iPhone THẬT (không tự xác nhận PASS).
