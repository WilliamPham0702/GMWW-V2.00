# GMWW — Kéo cả nhóm Seat khắp bản đồ và thanh công cụ tinh gọn (24/10/2026)

## Lỗi đã xác định
- Tại Tập hợp (ảnh iPhone 09:16, 8 Seat, 135%, X -1.3, Y -8.4), kéo lên tiếp nhưng đội hình bị chặn vì resolver cũ yêu cầu **mọi Seat phải nằm trong sân lát đá và tránh đống lửa**.
- Giá trị offset bị giới hạn cứng ±30; bốn nút mũi tên trùng với thao tác kéo thả.

## Thay đổi
- Tọa độ đội hình là cùng một phép dịch chuyển, tính giới hạn theo **toàn bộ Seat** trong khung bản đồ 2–98%; không còn chặn bởi lửa/sân đi bộ. Quy tắc tránh biển/lửa khi Character di chuyển độc lập không thay đổi.
- Cho phép kéo nhóm liên tục cả bốn hướng; 6–30 người, 70–135%, không Seat nào chạy lẻ hoặc vượt mép khung.
- Thanh Tập hợp chỉ còn **Giãn cách**, số %, và **🔄 Khôi phục**; bỏ mũi tên và dòng tọa độ.
- Reset nguyên đội hình về offset X/Y=0, giãn cách 100%, không đổi ID ghế, người chơi hay dữ liệu phòng.
- GM, Worker và Player Web dùng chung `village-layout.js`; tăng query cache cho GM HTML để iPhone tải JS mới.

## Test đúng phạm vi
- Regression 8 Seat/135% kéo lên qua -8.4; kiểm tra mọi đội hình 6–30 tới bốn cạnh và đường chéo; giữ nguyên vector.
- Kiểm tra thanh UI chỉ còn slider và reset; reset về 0/0,100%; đường lưu Server và đồng bộ Player Web.
- Điều chỉnh test Seat cũ từng mặc định mọi offset phải tránh đống lửa; giữ nguyên test mặc định xếp quanh lửa.
- Không chạy riêng kiểm thử Role/Artifact, bỏ phiếu, Hunter, hoặc các nghiệp vụ không liên quan.

## Bảo toàn và triển khai
- Chỉ thay đổi kiến trúc tọa độ/GM UI và test Seat; không đổi Game Core, dữ liệu, phòng, trạng thái game, IPA shell.
- Chỉ tạo PR để nghiệm thu; **không tự merge/Production**. Rollback: revert PR, restore phiên bản layout+app trước đó; metadata offset vẫn là object X/Y chuẩn và được clamp theo phiên bản tương ứng.
