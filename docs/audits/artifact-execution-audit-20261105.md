# Audit 44 Artifact – thực thi và kiểm thử (2026-11-05)

Phương pháp: đối chiếu catalog 44 Artifact với mã Worker (loại bỏ bảng icon) và thư mục tests. "Có executor" = nhánh xử lý riêng trong gmDayAction/gmBattleAction.

## Tóm tắt
- Có executor đầy đủ + test chuyên biệt: **4/44** (07, 15, 19, 20)
- Một phần (dùng chung hành động Vai Trò hoặc thiếu hậu quả): **9/44**
- Chưa có executor: **31/44**

## Chi tiết
| Mã | Tên | Trạng thái | Ghi chú |
|---|---|---|---|
| artifact_01 | Hổ Phách Bình Minh | Chưa có | Thiếu thu hồi lá đã dùng và phát lá mới. |
| artifact_02 | Bùa Hộ Mệnh | Một phần | Dùng chung action_protect (Bảo Vệ); thiếu chuyển chủ mỗi bình minh |
| artifact_03 | Thạch Anh Tri Thức | Chưa có | Thiếu xem riêng lá chưa lật và yêu cầu chủ lật trên Player Web. |
| artifact_04 | Máu Dịch Bệnh | Chưa có | Thiếu nhiễm bệnh và sự kiện Cắn chết khiến đàn mất Cắn đêm sau. |
| artifact_05 | Cung Săn Mệnh | Chưa có | Thiếu yêu cầu mục tiêu chỉ định nạn nhân và xử lý phản hồi. |
| artifact_06 | Ấn Dân Làng | Chưa có | Thiếu khóa chức năng và thu hồi quyền đã phát. |
| artifact_07 | Hơi Thở Lão Già | Đã có | Có executor hẹn lịch chết + test chuyên biệt |
| artifact_08 | Mũ Ngốc | Chưa có | Thiếu cưỡng chế phiếu GIẾT trên Server. |
| artifact_09 | Vạc Ma Thuật | Chưa có | Thiếu xác nhận Dân thường và kết quả riêng. |
| artifact_10 | Ngọc May Mắn | Chưa có | Thiếu đổi lá/kích hoạt lá mới trong cùng chuỗi giao dịch. |
| artifact_11 | Vuốt Sói | Chưa có | Thiếu nhập Phe Sói giữ chức năng gốc. |
| artifact_12 | Áo Choàng Hoàng Tử | Chưa có | Thiếu miễn chết do Treo Cổ; không tương đương Kẻ Ngốc một lần. |
| artifact_13 | Đồng Xu Tuổi Trẻ | Một phần | Có test hợp đồng catalog; chưa có executor công bố vai |
| artifact_14 | Gậy Mụ Già | Chưa có | Thiếu rời làng đúng ngày, khóa quyền và tự trở về. |
| artifact_15 | Kim Cương Phủ Nhận | Đã có | Có executor loại Artifact + test chuyên biệt |
| artifact_16 | Nhật Ký Mất Ngủ | Chưa có | Thiếu lịch sử ai thực sự thức và xác định hàng xóm. |
| artifact_17 | Ngọc Ghen Tuông | Chưa có | Thiếu đổi chủ lá chưa lật/cấp lá mới/ledger theo chủ. |
| artifact_18 | Mắt Tiên Tri | Một phần | Dùng chung action_find_seer; thiếu gắn vào lượt Tiên Tri |
| artifact_19 | Bình Giấc Mơ | Đã có | Có executor khóa 2 ngày đêm + test chuyên biệt |
| artifact_20 | Trái Tim Vô Tâm | Đã có | Có executor cấm phiếu trong ngày + test; thiếu giới hạn sở hữu/bình minh |
| artifact_21 | Ấn Thị Trưởng | Chưa có | Thiếu trọng số hai phiếu trong gallows. |
| artifact_22 | Mặt Nạ Câm Lặng | Chưa có | Thiếu Câm và khóa quyền nói đúng ngày. |
| artifact_23 | Tráng Gương | Chưa có | Đã chốt cấp lại lượt mới; còn thiếu executor sao chép thêm chức năng số 2. |
| artifact_24 | Sương Hào Quang | Chưa có | Thiếu kiểm tra/xác nhận Phe Ba. |
| artifact_25 | Hắc Ngọc Hủy Diệt | Chưa có | Thiếu hủy bí mật lá chưa lật/thu hồi action. |
| artifact_26 | Quả Cầu Phán Đoán | Chưa có | Thiếu hai Sói→Dân thắng; sai→chủ chết. |
| artifact_27 | Mặt Dây Chuyền Kiêu Hãnh | Chưa có | Thiếu chia sẻ riêng vai thật của chủ; không tương đương Hồn Ma. |
| artifact_28 | Lăng Kính Quyền Năng | Chưa có | Thiếu ràng buộc Cắn vào đúng ba người và thời hạn. |
| artifact_29 | Nhẫn Sự Thật | Một phần | Dùng chung action_seer ban đêm; day handler chưa xác nhận Sói |
| artifact_30 | Trượng Luân Hồi | Chưa có | Thiếu executor trigger chết và hồi sinh giữ vai cũ. |
| artifact_31 | Hồng Ngọc Cơ Duyên | Chưa có | Thiếu chuỗi lần lượt lật và giải quyết hai Artifact. |
| artifact_32 | Lam Ngọc Định Mệnh | Chưa có | Thiếu executor sao chép và cùng dùng Artifact. |
| artifact_33 | Quyền Trượng Phục Sinh | Một phần | Có hồi sinh qua action_revive; thiếu tự hồi sinh khi bị loại; chưa có test riêng |
| artifact_34 | Khăn Hồn Ma | Chưa có | Thiếu nhập một chữ cái từ người bị loại hôm trước. |
| artifact_35 | Khiên Bảo Hộ | Một phần | Dùng chung action_protect; thiếu lưu bảo vệ đêm kế tiếp |
| artifact_36 | Khăn Choàng Hổ Thẹn | Chưa có | Thiếu quay mặt và xác định quyền bị khóa. |
| artifact_37 | Khăn Choàng Nguyền Rủa | Chưa có | Thiếu chặn Cắn chết/chuyển Sói/tiêu hao đúng một lần. |
| artifact_38 | Thương Cuồng Nộ | Một phần | Có Giết (effect_kill); thiếu công khai vai chủ; chưa có test riêng |
| artifact_39 | Trượng Tiên Tri | Một phần | Dùng chung action_destroyer_scry ban đêm; day handler chưa có |
| artifact_40 | Đá Hoán Đổi | Chưa có | Đã chốt cấp lại lượt mới; còn thiếu executor hoán đổi hai vai/phe/quyền/snapshot/timeline. |
| artifact_41 | Bùa Tai Ương | Chưa có | Thiếu phiên Treo Cổ thứ hai đầy đủ. |
| artifact_42 | Hư Không Vô Tận | Một phần | GM thủ công Offline theo mô tả; không cần executor |
| artifact_43 | Lá Phiếu Âm Giới | Chưa có | Thiếu cho người chết bỏ phiếu; đã sửa nguy cơ hiểu dead_vote thành kill. |
| artifact_44 | Vòng Hoa Hòa Bình | Chưa có | Thiếu cấm phiếu GIẾT đúng chủ và thời hạn; không tương đương cấm mọi phiếu. |
