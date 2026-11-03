# GMWW PR #765 — Worker/Player Web hậu merge (03/11/2026)

- PR #765 đã merge sau required CI SUCCESS, nhưng main Worker CI chạy toàn bộ kiểm thử lịch sử không thuộc phạm vi khiến job bị hủy.
- Bản này củng cố hiệu ứng ⭐🔥 đã merge: dùng translate3d cho quỹ đạo quanh Character trên Safari/iPhone, giữ nguyên gắn vào portrait và quyền riêng tư.
- Bộ chọn CI chứng minh chính xác sáu file thay đổi (PR + main); kiểm thử visual, source assembly, Worker dry-run, auth/privacy; ngoài phạm vi chạy full.
- Phát hành: Worker/Player Web trên Cloudflare A thông qua GMWW V3 Worker Delivery sau required main CI SUCCESS; không đổi URL, DNS, Cloudflare B, lịch sử hoặc Durable Objects.
- Không thay đổi IPA hoặc Runtime OTA. Không tạo bản 3.294 trùng.
- Rollback: quay Worker Production A về version trước trong Cloudflare Deployments nếu smoke /api/health, Player Web hoặc Safari bị lỗi; dữ liệu phòng không đổi.
