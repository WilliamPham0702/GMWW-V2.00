# GMWW Runtime V3.183 — Khôi phục Seat Mẫu 6–30 (22/10/2026)

## Lỗi được báo cáo
Menu Tập Hợp, mục Seat Mẫu, đã hiển thị 8/10/12/.../30 người thành các hàng ngang theo tầng, có nhãn ELIP thay vì hình thoi; không còn tuân thủ quy tắc Seat một chu vi quanh đống lửa.

## Nguyên nhân
`assets/village/village-layout.js` (GP2) đã thay `circleContour`/`rectangleContour` bằng `terraceSeats()`, sau đó chỉ dịch nhẹ trục X cho kiểu Tròn/Elip. Đây là thay đổi ngoài yêu cầu — không phải hành vi cho phép.

## Bản sửa
- Khôi phục **ba hình thật**: Tròn (6–12), Thoi (13–20), Chữ nhật có **hai cạnh dài trái/phải** (21–30).
- Hỗ trợ mọi số nguyên từ 6 đến 30, luôn đề xuất theo số người. Mẫu nào cũng là **một chu vi duy nhất**, không xếp hàng, tầng hay vòng trong.
- Định vị tâm theo đống lửa ở `x=50,y=64`, chỉ trên mặt sân hợp lệ; phân bổ đều chu vi theo tỉ lệ màn hình, các đỉnh thoi dùng phân đoạn nguyên để tránh sát nhau.
- Giữ nguyên Seat ID, Character ID, Room ID, seatOffset/spacing, dữ liệu người chơi; `ellipse` được hiểu là `diamond` để phòng cũ không lỗi khi mở lại.
- Đồng bộ thuật toán dùng chung giữa Worker, GM IPA Runtime và Player Web; sửa mẫu thumbnail, số lượng tối thiểu, chữ hiển thị và cache-bust.
- V3.183 tăng độc lập với V3.182 theo quy tắc OTA, **không đổi native IPA V3.110**; ghi chú phát hành được chèn vào OTA manifest qua `prepare-update-channel.mjs`.

## Kiểm tra và cổng phát hành
1. Kiểm tra 6–30 người × 3 hình, tọa độ duy nhất, sân hợp lệ, khoảng cách tối thiểu trong hệ tọa độ hiển thị, không chồng lên lửa; các Seat phân bổ đúng chu vi, thoi thật và hình chữ nhật cạnh dài hai bên.
2. Kiểm tra Player Web và GM cùng vị trí Seat, không thay Character, thử thay đổi 6/14/30 người bằng WebKit iPhone và ảnh Ngày/Đêm.
3. Toàn bộ CI SUCCESS; kiểm tra manifest SHA-256, OTA version > 3.182 và phương án rollback trước Production.
4. Giữ nguyên dữ liệu và IPA. Nếu test chưa đạt, **không merge**.
