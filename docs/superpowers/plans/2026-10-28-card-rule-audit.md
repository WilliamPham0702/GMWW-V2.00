# Kế hoạch và ledger kiểm toán rule

Spec: yêu cầu người dùng kiểm tra/sửa mọi rule theo mô tả, hỏi khi thiếu thông tin; AGENTS.md chỉ test đúng phạm vi. Nguồn mô tả export 18/10 + canonical hiện tại. Giữ phòng/DO/lịch sử/IPA.

- [x] Kiểm tra pipeline GM→payload→private DTO và sửa rơi field.
- [x] Tái hiện/sửa quota custom, cửa sổ đêm, target count/noSelf/target history.
- [x] Kiểm tra dispatch ngày/đêm; sửa Bear God, divination và Destroyer.
- [x] Lập ma trận từng lá 63+44; phân biệt ID/icon/thông báo và executor.
- [x] Review độc lập, sửa hai lỗi tương thích bằng test RED→GREEN.
- [x] Chốt với người dùng: Aura đọc tên Vai Trò; Mirror/Swap nhận quota mới. Đồng bộ mô tả, không coi executor hai Artifact đã hoàn thiện.
- [x] 131 test liên quan PASS, syntax/assembly/diff PASS.
- [ ] GitHub push/CI: chặn bởi auto-review, chờ người dùng xác nhận đích/payload. Không vượt chặn.
- [ ] Còn nhiều executor chưa xây dựng: chi tiết báo cáo, không báo full completion.

Môi trường scratch đã bị reset sau trả lời tương tác; code được khôi phục theo các patch đã kiểm chứng và chạy lại toàn bộ 131 test liên quan. Base được giữ cố định. Không thử lại push hoặc dùng connector để vượt chặn.
