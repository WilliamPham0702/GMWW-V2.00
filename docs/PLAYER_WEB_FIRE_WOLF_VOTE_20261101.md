# GMWW – Player Web: icon trên đống lửa và phiếu Sói Cắn độc lập

Trạng thái: ứng viên PR, **chưa phát hành Production**.

## Thay đổi
- Player Web nhận icon Vai trò/Artifact **từ quyền đã xác thực của Server**, xuất hiện ở vị trí đống lửa khi tới lượt, kéo thả vào người chơi để chọn mục tiêu.
- Icon có thể kéo sang vị trí tùy ý; nút **Khôi phục** dưới màn hình trả vị trí về đống lửa hoặc hủy lựa chọn chưa gửi.
- Sau khi đã gửi hành động Ban Đêm, Khôi phục chỉ hoàn tác **hành động gần nhất của chính thành viên đăng nhập**, và chỉ khi cùng ván/lượt, không có thao tác khác làm thay đổi snapshot. Không cấp quyền GM cho Player Web.
- Mỗi Sói được ghi **tối đa một lượt Cắn / đêm**. Sói Trùm nếu cắn sẽ quyết định nạn nhân; nếu Sói Trùm không cắn, mục tiêu có nhiều phiếu nhất được chọn; phiếu bằng nhau thì chưa có nạn nhân (không bốc thăm). Chỉ nạn nhân cuối cùng mới qua Yêu Tinh, Bảo Vệ, Phù Thủy và miễn nhiễm.
- Giữ quy tắc NIGHT-02 đang có: Sói Trùm bị Đóng Băng/đuổi khỏi làng vô hiệu hóa đòn Cắn chung; Sói Tuyết chỉ Cắn khi là Sói còn lại duy nhất.
- Không thay đổi IPA, dữ liệu đã lưu hay cấu hình Production.

## Nghiệm thu trước khi merge
1. CI required checks SUCCESS trên HEAD của PR; kiểm thử đơn vị mới về Sói Trùm, đa số, hòa, một phiếu/Sói và quyền Undo.
2. iPhone Safari/Chrome/Edge: icon xuất hiện ngay đống lửa đúng lượt, kéo thả thành công, kéo lệch có thể di chuyển icon; Khôi phục trước/sau gửi đúng quyền.
3. Đối chiếu GM/Player Web 2–3 Sói và Sói Trùm; test Yêu Tinh/Bảo Vệ/Phù Thủy và trường hợp hòa.
4. Chỉ khi chủ dự án phê duyệt mới merge/deploy. Phát hành Runtime OTA mới + .gmwwupdate + SHA-256 + release notes tiếng Việt, kiểm tra rollback, giữ nguyên URL gamemasoi.pages.dev.

## Rollback
- Nếu nghiệm thu thất bại: không merge PR, không phát hành.
- Nếu đã được phép phát hành: rollback commit/Worker về bản Production đã kiểm chứng trước đó, không ghi lại hoặc xóa dữ liệu Durable Objects. Kiểm tra tương thích trạng thái trận đang chạy trước khi rollback.
