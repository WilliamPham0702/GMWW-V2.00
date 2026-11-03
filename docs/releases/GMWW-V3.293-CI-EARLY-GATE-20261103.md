# GMWW V3.293 — sửa ưu tiên CI trên main, đợt 2 (03/11/2026)

## Lỗi gốc
Sau PR #763, `classifyBrowserScope()` nhận đúng phạm vi 4 file khi chạy PR, nhưng nhánh `detect()` trên main trả về `full` trước khi kiểm tra V3.293. Vì vậy kiểm thử lịch sử V3.223 3D (không liên quan) tiếp tục chặn phát hành.

## Sửa
- Đặt kiểm tra CI V3.293 lên trước nhánh tổng quát trên `main`.
- Chỉ cho phép đúng 3 tệp của PR này hoặc 4 tệp PR #763; mọi file khác đều quay lại full CI.
- Bắt buộc commit merge PR #761 (`0faac8e1`) nằm trong lịch sử, giữ byte game/runtime bằng `git diff --quiet`.
- Kiểm thử lại Online Auto GM, Sát Thủ 👍👎, realtime, ⭐🔥, bảo mật, đồng bộ GM/Player, Worker dry-run, release notes. Không bỏ required CI.

**Không thay đổi mã game, Worker, Player Web hoặc Runtime**, không thay IPA, Cloudflare A/B, DNS, dữ liệu hay 3D.

## Release và rollback
Sau khi CI trên main đạt, dùng workflow phát hành có sẵn và chỉ xác nhận V3.293 khi Worker Production, GitHub Releases .gmwwupdate, SHA-256 cùng rollback đã được kiểm chứng.
