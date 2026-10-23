# Hotfix 23/10/2026 — Khôi phục báo cáo Cloudflare trên iPhone

## Nguyên nhân
Sau PR #427, `tools/cloudflare-namespace-maintenance.mjs` phát hành báo cáo `schema: 2` với 26 Preview chưa đối chiếu. Bộ đọc của Server Settings và các giao diện quản trị khác chỉ chấp nhận `schema: 1`, khiến iPhone hiển thị **KHÔNG KẾT NỐI** dù scan GitHub Actions thành công.

## Thay đổi
- Server iPhone: `server-game/current/GMWW.html` chấp nhận báo cáo cấu trúc 1 và 2.
- Trang quản lý Cloudflare: `assets/admin/cloudflare/index.html` hỗ trợ 2 cấu trúc.
- Admin Worker: `tools/cloudflare-admin/worker.mjs` hỗ trợ cấu trúc mới.
- Thêm kiểm thử hồi quy cho báo cáo hợp lệ, thiếu bằng chứng Production, hoặc có schema không hỗ trợ.
- Giữ nguyên yêu cầu `productionProtected === true`, số liệu không âm, cùng toàn bộ quyền bảo vệ an toàn.

## Tác động
- Chỉ sửa đọc/hiển thị báo cáo; không chỉnh logic nghiệp vụ game, API room, dữ liệu phòng, Player Web hoặc quyền xóa Preview.
- **Không xóa hoặc sửa** Cloudflare Preview, namespace, Durable Object, Production, phòng chơi.
- Bản iPhone hiện tại chỉ hiển thị lại đúng sau khi cập nhật runtime/IPA chứa hotfix; merge mã nguồn **không tự động thay thế** bản IPA đã cài.
- Không tuyên bố Production đã cập nhật cho đến khi kiểm tra deploy thành công.

## Kiểm thử
- `node --test tests/cloudflare-status-ui-schema.test.mjs tests/cloudflare-admin.test.mjs`
- Yêu cầu CI SUCCESS, kiểm tra hiển thị trên iPhone và xác minh Production binding trước khi đề xuất triển khai.

## Rollback
Revert commit hotfix nếu xuất hiện lỗi hiển thị; không có thay đổi dữ liệu cần khôi phục.
