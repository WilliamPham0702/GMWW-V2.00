# Bổ sung kiểm thử phát hành GMWW V3.207 — PR #475

Ngày 25/10/2026. Bản sửa DEMO và quy tắc Lên Giàn thuộc PR #475 đã merge vào main.

**Nguyên nhân:** Job kiểm thử Lên Giàn trên GitHub chỉ tự chạy khi commit thay đổi file thuộc gameplay Lên Giàn. Commit sửa CI phát hành không chạm các file này, vì vậy cần chủ động chạy **chính workflow Lên Giàn** trên commit main được phát hành.

**Biện pháp:** Với riêng Runtime V3.207 có chứa commit PR #475, chấp nhận kết quả SUCCESS của workflow Lên Giàn chạy bằng `workflow_dispatch` trên đúng SHA main. Đồng thời vẫn yêu cầu `Check Player Web Worker` phải là SUCCESS từ push cùng SHA. Không chấp nhận CI của commit khác; mọi bản phát hành khác giữ nguyên chốt thông thường.

**Phạm vi:** Không sửa hành vi của game, dữ liệu, phòng, danh sách thành viên hoặc iPhone IPA. Vẫn tạo Runtime OTA, kiểm tra version guard, SHA-256 gói và Production sau deploy. Nếu phát hành thất bại, tiếp tục giữ Worker Production hiện hành và rollback về deployment `ac1d0f38-94f1-4746-97bf-87e60bf941b3` khi cần.
