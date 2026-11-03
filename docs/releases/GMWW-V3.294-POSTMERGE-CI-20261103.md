# GMWW V3.294 — Khôi phục CI sau merge PR #767 (03/11/2026)

## Nguyên nhân
Check Player Web Worker trên main chọn FULL do nhánh chọn phạm vi CI-LITE không ưu tiên diff main sau merge; bộ kiểm thử legacy nhiều bài có kỳ vọng phiên bản cũ, runner bị hủy. Release Gate fail-closed nên chưa phát hành OTA.

## Phạm vi sửa
Chỉ thay đổi bộ chọn CI và test xác minh phạm vi. Không thay đổi Worker, Player Web, Runtime hoặc IPA. Không thay đổi DNS, Cloudflare A/B, Durable Object, dữ liệu và lịch sử.

- Ghim SHA-1 blob của Worker V3.294, GM bundle, Player bundle, policy bảo mật Sát Thủ và package version.
- Chấp nhận chính xác ba file CI/test/docs đã duyệt, trên PR lẫn push main; khác biệt khác chạy FULL.
- Vẫn yêu cầu các kiểm thử PR767 về sóng âm realtime, voice gửi nhanh, quyền Chat, Auto GM, bảo mật Sát Thủ, lắp ghép GM/Player, Worker dry-run và kiểm tra Runtime.
- Chỉ merge nếu required CI SUCCESS trên HEAD cuối. Sau đó phát hành Worker/Runtime bằng quy trình cùng SHA, SHA-256 và rollback.

## Rollback
Khôi phục chính sách CI về commit trước, giữ Runtime V3.293 và deployment Worker trước V3.294 để rollback theo quy trình. Không xóa dữ liệu.
