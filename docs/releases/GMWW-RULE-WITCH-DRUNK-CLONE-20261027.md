# GMWW — Phù Thuỷ, Say Rượu và Nhân Bản (ứng viên RULE ngày 27/10/2026)

## Nội dung cập nhật
- **Phù Thuỷ:** tỉnh sau Yêu Tinh; xem đúng mục tiêu vết Cắn cuối cùng kể cả đã được Bảo Vệ hoặc Bất Tử Đêm; không thấy vết Cắn vô hiệu khi Sói Trùm bị Đóng Băng/Đuổi. MỤC TIÊU hiển thị trên Character; Server chỉ cho Cứu đúng người nhận vết Cắn; hai bình Cứu/Giết độc lập, một bình không tự chuyển lượt. Mỗi bình chỉ dùng một lần/ván.
- **Say Rượu:** không thức ở đêm 1–2; vào đầu đêm 3 trước Phù Thuỷ Già (sau ART-01/WOLF-01 nếu có), tự bốc ngẫu nhiên từ các vai của người đã chết thuộc đúng ván; nếu chưa ai chết trở thành Dân Làng không có chức năng; nhận Phe/Vai mới và phát lá riêng tư. Khi bốc Sói, tham gia Bầy Sói theo quyền thực tế; các quyền riêng của Sói sau lượt cắn, kể cả trường hợp bốc Sói Tuyết.
- **Nhân Bản:** đêm 1 chọn duy nhất một người còn sống khác mình; chỉ khi mục tiêu đã chết trước đêm mới mới nhận Vai/Phe/năng lực và bắt đầu hành động ở đêm tiếp theo. Khi chưa chết vẫn Phe Dân và không có năng lực chủ động mới.
- Đồng bộ vai chuyển đổi bằng phiên bản phát bài, private snapshot và reconnect; giữ danh tính Character/Seat/Artifact của người nhận.
- Đồng bộ mô tả lá Vai Trò đã lưu; giữ artwork, file audio và luật vai trò không liên quan.

## Bảo mật và phạm vi
- Định danh role được lấy từ dữ liệu phát lá riêng tư trên Durable Objects, không bốc từ thông tin công khai trên Player Web.
- Phân quyền thông tin vết cắn chỉ dành cho GM. Không phát lộ Vai Trò đối tượng bốc/nhân bản ra màn hình công cộng.
- Không đổi IPA, 2D/3D Renderer, Thành Viên hay dữ liệu lịch sử. Không xoá phòng hoặc Durable Object.

## Kiểm thử
- Bộ `tests/witch-drunk-clone-20261027.test.mjs` và hai bộ phụ thuộc NIGHT-02/Wolf resolver.
- Chạy workflow `Check Witch Drunk Clone Rules` và các chốt CI thật sự bắt buộc.
- Xác minh nhiều đêm: Không chết/Bị chết/được cứu/bị đuổi/khác ván/nhận Sói/Tái kết nối.
- Sau CI đạt, cần build và verify OTA, manifest + SHA-256 và health Production trước khi công bố cập nhật.

## Tình trạng triển khai
- **PR Draft**, chưa được nghiệm thu trên iPhone thật, chưa merge, chưa phát hành. Ghi chú này mô tả ứng viên, không phải xác nhận Production.
- Khi phát hành, dùng phiên bản tăng tuần tự so với Production thực tế, không giả định số phiên bản; có phương án rollback về Worker/Runtime Production liền trước, bảo toàn Durable Objects.
