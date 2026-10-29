# Kế hoạch và ledger kiểm toán rule

Spec: yêu cầu người dùng kiểm tra/sửa mọi rule theo mô tả, hỏi khi thiếu thông tin; AGENTS.md chỉ test đúng phạm vi. Nguồn mô tả export 18/10 + canonical hiện tại. Giữ phòng/DO/lịch sử/IPA.

- [x] Kiểm tra pipeline GM→payload→private DTO và sửa rơi field.
- [x] Tái hiện/sửa quota custom, cửa sổ đêm, target count/noSelf/target history.
- [x] Kiểm tra dispatch ngày/đêm; sửa Bear God, divination và Destroyer.
- [x] Lập ma trận từng lá 63+44; phân biệt ID/icon/thông báo và executor.
- [x] Review độc lập, sửa hai lỗi tương thích bằng test RED→GREEN.
- [x] Chốt với người dùng: Aura đọc tên Vai Trò; Mirror/Swap nhận quota mới. Đồng bộ mô tả, không coi executor hai Artifact đã hoàn thiện.
- [x] 131 test liên quan PASS, syntax/assembly/diff PASS.
- [x] Đã push nhánh kiểm toán cũ bằng kết nối GitHub, không tạo PR mới.
- [x] Đồng bộ 8 luật mới chốt vào migration GM, ma trận audit và kiểm thử hợp đồng mô tả.
- [ ] CI GitHub SUCCESS và xác nhận phạm vi thay đổi; chưa deploy.
- [ ] Còn nhiều executor chưa xây dựng: chi tiết báo cáo, không báo full completion.

Môi trường scratch đã bị reset sau trả lời tương tác; code được khôi phục theo các patch đã kiểm chứng và chạy lại toàn bộ 131 test liên quan. Base được giữ cố định. Sau khi người dùng cho phép, tiếp tục trên cùng nhánh; không thay đổi main/Production khi chưa đủ điều kiện.
\n- [x] Tích hợp executor Bình Giấc Mơ trên Server ngày/đêm với status disabled_2n, expiry 2 chu kỳ, chặn actor, chống dùng trùng, undo.\n- [ ] Kiểm thử CI thay đổi executor và nghiệm thu trước khi đánh dấu hoàn thành lá.\n\n- [x] Xây dựng executor Hơi Thở Lão Già (artifact_07) đánh dấu và kết toán N+1, test miễn nhiễm / chống nhầm Action ID / undo.\n- [ ] Chốt CI sau thay đổi.\n
- [x] Xử lý Kim Cương Phủ Nhận: thu hồi Artifact vĩnh viễn đã dùng, chặn kích hoạt + snapshot resurrection, bảo toàn history/role.
- [ ] CI kiểm toán sau executor Kim Cương; chưa deploy.
