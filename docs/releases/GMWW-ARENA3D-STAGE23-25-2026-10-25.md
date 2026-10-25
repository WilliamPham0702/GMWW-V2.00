# GMWW Arena 3D — Lô GĐ23–25 (25/10/2026)

Phạm vi: PR #487 nghiên cứu độc lập, Cloudflare Worker/DO STAGING tách biệt, chưa merge, không Production, không sửa game 2D, IPA, OTA hoặc dữ liệu. Đây là phiên bản thử nghiệm kỹ thuật, không phải phát hành game mới.

## GĐ23 — Tối ưu 6–30 Character
- Tại 6–19 Character giữ đầy đủ chi tiết tạo hình 3D đang có.
- Với 20–23 Character giảm 4 draw calls cho các chi tiết rất nhỏ: chấm sáng mắt và má hồng; tại 24–30 Character cắt thêm 5 phụ kiện trang trí thứ yếu (9 tổng). Chế độ Tiết kiệm pin vẫn ẩn 13 chi tiết như trước.
- **Giữ nguyên** thân, tay chân, đầu, mắt, tóc chính, ghế, vị trí các Seat và hiệu ứng Core; nhận diện nhân vật/chọn đầu vẫn hoạt động. Không thay đổi thuộc tính nhân vật, ID, vai trò, luật, kết quả hoặc quyền GM.
- Phương án giới hạn đồ họa chỉ ảnh hưởng đến lớp mô phỏng 3D; số draw calls được kiểm tra trên Chrome/WebKit thực sự thay vì chỉ so nhãn.
- Khi số người giảm hoặc chuyển về chế độ thường, các mesh chi tiết được phục hồi và cập nhật lại ma trận.

## GĐ24 — Chuyển động và hành động phép
- Bảo toàn lượt Core: actor di chuyển từ ghế đến vị trí thi triển, đứng làm phép và chỉ đi về khi Core chuyển lượt/kết thúc hành động.
- Không dọn thông tin di chuyển của nhân vật đang đứng ở vị trí làm phép; chỉ dọn dữ liệu travel của người đã về ghế.
- Tự dọn deadline hiệu ứng đã hết hạn theo vòng vẽ, tránh tích lũy qua nhiều ngày/đêm. Không xóa VFX đang hoạt động.
- Regression trong trình duyệt với Sói cắn (đầu sói bay), Phù Thủy, Tiên Tri Hào Quang và Bảo Vệ; chỉ các hành động Core được quyền GM cấp mới phát nội dung bí mật.
- Giữ bộ E2E Core thật 2 client/Artifact/tối thiểu 1 diễn hoạt phép đã được áp dụng từ GĐ16, không mở test Player Card 2D hay OTA không liên quan.

## GĐ25 — Kiểm soát hiệu năng phiên dài trên iPhone
- Bổ sung bộ thống kê **cục bộ trong tab trình duyệt**, gộp theo cửa sổ phút với bộ nhớ giới hạn tối đa 30 cửa sổ gần nhất, không lưu liên tục mỗi frame nhiều giờ.
- Chỉ thống kê số khung, CPU vẽ cao nhất, khoảng khung cao nhất, tỷ lệ khung trễ, Character tối đa và Draw Calls trung bình; không thu tên thành viên, mã phòng, vai trò, token, Artifact hoặc kết quả ban đêm.
- Khi chuyển nền hoặc mất WebGL, đóng cửa sổ hiện tại và ngưng lấy mẫu để không ghi thời gian ngủ thành lag. Dữ liệu không gửi Worker; chỉ sao chép khi người dùng nhấn nút.
- Có kiểm thử mô phỏng **90 phút dữ liệu hiệu năng**, chứng minh bộ nhớ cửa sổ không tăng vô hạn, và browser smoke kiểm tra số liệu trực tiếp trên cảnh 3D.
- **Không tuyên bố đã thử 90 phút trên iPhone vật lý**: đo pin/nhiệt không có API tin cậy trong Safari; chỉ có thể nghiệm thu bằng máy thật khi user chạy một phiên dài và quan sát độ nóng/pin.

## Kiểm thử đúng phạm vi & kiểm soát phát hành
- Node test trong suite Arena GĐ18/GĐ19 gồm mốc 6/12/20/30, 13 mesh Eco, 4/9 mesh crowd, giữ quyền phép, thu hồi VFX hết hạn; mô phỏng xu hướng 90 phút và tab sleep/WebGL.
- Browser Chrome/WebKit STAGING: 6/12/20/30, số draw calls giảm theo mốc 20/30, bật/tắt Eco, nghi lễ 4 vai trò, thay đổi đội hình liên tiếp, module đo có cửa sổ hữu hạn.
- Core E2E thật STAGING: GM/Player phân quyền, Bảo Vệ, đêm/ngày, đề cử/bỏ phiếu, reconnect, kết thúc và vai trò/Artifact tùy chỉnh nhiều mục tiêu.
- Không chạy các kiểm thử không liên quan (Chrome Player Card, game 2D, Seat Production, IPA hay OTA).
- **Cần điền kết quả CI và version Worker từ GitHub Actions sau khi thực tế SUCCESS; tuyệt đối không xem là hoàn thành trước khi test.**

## Rollback
Rollback Worker STAGING về GĐ22 version `dd78c369-351c-4f5f-989c-00b71dfc55d7`, hoặc revert các commit GĐ23–25 trên nhánh PR #487. Không ảnh hưởng Production.
