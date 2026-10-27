# GMWW Runtime V3.239 — WOLF-01 (26/10/2026)

## Luật đã được GM chốt
1. Sau Artifact đầu ván, chỉ tạo lượt **Bầy Sói ơi dậy đi** nếu có ít nhất 2 **người chơi** Phe Sói còn sống, dù hai người cùng một Vai Trò.
2. Trong lượt này Player Web của Sói nhận riêng danh sách đồng đội và tên Vai Trò thật hiển thị trên Character. Khách không phải Sói không nhận được danh sách hoặc nhãn qua public API/WebSocket. Người vừa chuyển thành Sói giữ tên Vai Trò gốc + nhãn Phe Sói.
3. Nhãn chỉ tồn tại khi đang ở đúng lượt Bầy Sói; ẩn ngay khi lượt, pha, ván, quyền sở hữu kết thúc hoặc đồng hồ tự động hết giờ.
4. Đêm 1 chỉ gọi một lần; từ Đêm 2 chỉ gọi lại nếu có người mới được **Server xác nhận là Phe Sói** so với đầu đêm trước.
5. Nếu còn 0–1 người Sói thì không gọi Bầy Sói. Không thay đổi hành động Sói Cắn hoặc thứ tự các Vai Trò khác.

## Bảo mật
- Dữ liệu `wolfPackIds`, `recognitionIds` nằm trong Durable Object riêng; không broadcast `runtime`/`nightRuntime` cho WebSocket công khai.
- API cá nhân `/me` chỉ trả `wolfRecognition` cho thành viên Sói trong đúng lượt đã kích hoạt; người ngoài Sói nhận `null`.
- Quyền hiển thị trên Player Web không dựa vào vai tự khai, dữ liệu cache của vai, hoặc trường roleName công khai.

## Phạm vi kiểm thử
- Unit: sói đơn, hai người cùng vai, chết/đuổi, chuyển phe, một lần Đêm 1, kích hoạt lại khi có thành viên mới, không rò rỉ WebSocket, nhãn biến mất.
- Regression: Night Runtime thực với clone storage; Player Web canonical assembly; Worker/GM syntax; version guard; OTA SHA-256 theo workflow.
- Không chạy Chrome Player Card/Seat/DEMO/Arena3D/Native IPA ngoài phạm vi.

## Triển khai
- Runtime/Player Web **V3.239** và Worker Production (đóng gói cùng nhánh `main` sau CI).
- Không đổi shell iOS, cấu trúc Durable Objects, lịch sử hay dữ liệu phòng.
- Không tự tạo sự kiện chuyển Phe Sói: chỉ phản ánh sự kiện đổi phe đã được Server xác nhận trong `assignments`; luật Chân To/Kẻ Bị Nguyền được chốt và triển khai riêng khi đến nhóm đó.

## Rollback
- Quay lại Runtime/Worker **V3.238** đã kiểm chứng, không xóa dữ liệu hoặc thay IPA; phục hồi lại phiên bản trong workflow theo thủ tục rollout và SHA-256.
