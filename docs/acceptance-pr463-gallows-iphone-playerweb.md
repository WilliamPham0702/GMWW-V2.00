# Nghiệm thu PR #463 — Lên Giàn GMWW (iPhone & Player Web)

**Ngày:** 24/10/2026 — **Ứng viên Runtime:** V3.203 (chưa deploy).  
**Trạng thái:** Kịch bản nghiệm thu đã chuẩn bị; **chưa nghiệm thu thiết bị thật**.  
**An toàn:** Không merge main, không deploy Production, không cài IPA mới, không thay đổi DO/phòng/dữ liệu hiện hành.

## Kiểm thử iPhone (GM)
1. Mở **Ngày → Lên Giàn** trên iPhone: danh sách thành viên lên đầu; mỗi người 1 dòng gồm STT, Tên, Đề cử/đủ quyền, 👍 Cứu/đủ quyền, 👎 Giết/đủ quyền, Cấm chọn, Cấm Vote.
2. Trong phòng 12 người trở lên, kiểm tra bảng hiện đúng tối đa 10 hàng, vuốt dọc phần danh sách để xem người tiếp theo; vuốt ngang để xem đủ 7 cột; phần danh sách có thể thu gọn; không thu nhỏ Character/bản đồ.
3. Khi chưa ai đề cử: sắp theo tên ABC tiếng Việt. Khi Player Web gửi đề cử: thứ tự tự chuyển theo **số lượt đề cử hợp lệ giảm dần**, hòa theo ABC, số mẫu là `x/số người đủ quyền` (không phải số người trong phòng nếu có cấm).
4. Nhấn nút duy nhất **TỰ ĐỘNG ⇄ THỦ CÔNG**: chuyển đúng trạng thái, không cần mở hộp hai nút. Nút Khôi phục riêng.
5. Tự động → ĐỀ CỬ: ban đầu **60 giây**; nhập 12 rồi chạm ngoài ô, GM nhận xác nhận từ Server; nhấn **MỞ ĐỀ CỬ** và xác minh đồng hồ giảm từ 00:12. Nhấn **CHỐT ĐỀ CỬ** trước thời hạn: phiếu mới bị từ chối.
6. Sau Chốt đề cử: nếu người đứng đầu duy nhất, hộp thông tin nêu đúng tên; nếu hòa, GM phải chọn; **không được tự mở bỏ phiếu khi mới chốt đề cử**.
7. Chọn BỎ PHIẾU → thời gian mặc định **60 giây** (có thể đổi trước mở); nhấn **MỞ BỎ PHIẾU**, Player Web nhận 👍/👎; nhấn **CHỐT PHIẾU** hoặc hết giờ, Server khóa phiếu và công bố kết quả. Hòa Cứu/Giết → Sống.
8. Thủ công: chạm tên người còn sống ngay ở bảng đầu để đưa lên giàn, sau đó **CHỐT SỐNG** hoặc **CHỐT CHẾT**; không phát phiếu Player Web. Nút Khôi phục chỉ hoàn tác kết quả của Lên Giàn.
9. Nhấn ngoài hộp để đóng; mở lại vẫn giữ đúng trạng thái Server và thứ tự. Xem hiệu ứng Character treo ở vị trí đã hiệu chỉnh, dùng Walk, không dây/cây trên đầu.

## Kiểm thử Player Web & Server
- Chạy từng kịch bản Online, Offline và DEMO **trên phòng thử riêng**, không dùng phòng Production đang chơi. Mọi chế độ dùng cùng API Core.
- Trên Chrome, Edge và Safari: người đủ quyền đề cử/chọn một lần; tài khoản cấm chọn, cấm vote hoặc bị Artifact cấm vote không được tính phiếu; sau hết giờ hoặc chốt sớm, API từ chối phiếu muộn.
- Kiểm tra hiển thị `gallows_updated`, đồng hồ theo thời gian Server, kết quả Cứu/Giết, Character treo và hồi về chỗ sau kết luận.
- Refresh/tab background/ngắt mạng rồi kết nối lại giữa đề cử và bỏ phiếu: không đếm lại, không nhân đôi phiếu, không mất người/vai/giàn. Kiểm tra chỉ tác động liên quan Lên Giàn, không chạy E2E Seat 30 người/3D/thư viện lá vai.
- Dùng `Đặt vị trí treo` hiện có để xác minh tọa độ GM/Player Web nhất quán, không thay đổi Seat.

## Âm thanh — danh mục upload
Trong **Cài đặt → Thư viện âm thanh → Hệ thống**:
- `audio_system_gallows_day_long` — Ngày dài rồi
- `audio_system_gallows_open_nomination` — Mở đề cử
- `audio_system_gallows_open_vote` — Mở bỏ phiếu
- `audio_system_gallows_nomination_result` — Công bố người bị đề cử
- `audio_system_gallows_vote_result` — Công bố số phiếu
- `audio_system_gallows_result_saved` — Kết luận Sống
- `audio_system_gallows_result_dead` — Kết luận Chết

Các ô upload đã chuẩn bị, không ngầm khẳng định file âm thanh có sẵn. **Không hiện link âm thanh trong trang Lên Giàn**.

## Điều kiện đánh dấu ĐẠT
- CI chuyên biệt Lên Giàn và kiểm tra SHA-256 OTA đều SUCCESS.
- Browser/GM trên thiết bị thật kiểm chứng quy trình và đồng bộ theo các bước trên (**CHƯA CHẠY** khi chưa có Preview).
- Chủ dự án nghiệm thu; mọi việc merge/deploy Production phải được phê duyệt riêng.
- Rollback: quay về commit Release trước PR #463; bảo toàn DO và không xóa dữ liệu trận đấu.
