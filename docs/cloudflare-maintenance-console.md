# GMWW Cloudflare Maintenance (quản trị an toàn)

- **Trang Server:** `/admin/cloudflare/index.html` — trang hiển thị trạng thái công khai, không có lệnh API xoá và không chứa API token.
- **Backend quản trị:** `tools/cloudflare-namespace-maintenance.mjs`, chỉ chạy trong GitHub Actions trên mã `main` đã tin cậy.
- **Bảng trạng thái:** [GitHub Issue #320](https://github.com/WilliamPham0702/GMWW-V2.00/issues/320), tổng hợp số lượng và timestamp; không chứa tài khoản Cloudflare, token hoặc dữ liệu người chơi.
- **Nhật ký:** [GMWW Cloudflare Maintenance](https://github.com/WilliamPham0702/GMWW-V2.00/actions/workflows/cloudflare-maintenance.yml) — có audit GitHub Actions / run ID.

## Phân quyền
Quyền xoá nằm trên GitHub Actions, sử dụng `CLOUDFLARE_API_TOKEN` và `CLOUDFLARE_ACCOUNT_ID` của **GitHub Secrets**, không lưu bí mật trên Worker/browser/Player Web/IPA. Workflow chỉ dùng `contents:read`, `pull-requests:read`, `issues:write`.

Quản trị viên có quyền Actions có thể chọn `Run workflow`: `scan` (không xoá) hoặc `cleanup` (dọn an toàn). Hoặc chủ repo bình luận chính xác `/gmww-cloudflare scan` hoặc `/gmww-cloudflare cleanup` trên Issue #320. Người khác bình luận không kích hoạt công việc. Cơ chế tự chạy hằng ngày lúc 02:00 UTC (~09:00 Việt Nam).

## Điều kiện dọn
1. Preview có tên nhánh khớp **chính xác** PR cùng repo, có base `main`.
2. Tất cả PR khớp nhánh đã đóng >= 24 giờ, không có nhãn `keep-preview` / `retain-preview`.
3. Có duy nhất namespace thuộc Worker `gmww-v2-00`, tên dựa trên `preview.slug` và class `RoomDurableObject`.
4. Namespace không trùng binding Durable Object của Production.
5. Truy vấn instance namespace hoàn chỉnh, **không có Durable Object instance tồn tại**; nếu có dữ liệu hoặc kết quả không chắc chắn, giữ lại.
6. Kiểm tra lại PR, Preview, binding Production và dữ liệu trước thao tác DELETE.
7. Xoá **Preview ID** xác minh, không có API xoá namespace trực tiếp. Xác minh lại Preview và namespace đều đã biến mất sau lệnh.
8. Giới hạn **tối đa 10 Preview được kiểm tra/xoá mỗi lượt cleanup**; không chạm đến 4 namespace độc lập hay 12 Preview chưa xác định PR (số lượng có thể thay đổi).

## Bảo toàn và phát hành
- Không sửa `src/index.js`, `wrangler.jsonc`, schema DO, data key, room/game lifecycle, hoặc cơ chế IPA/OTA.
- Không tạo Worker, namespace, KV, D1, R2 mới.
- Trang `assets/admin/cloudflare/index.html` tĩnh, chỉ đọc báo cáo Github công khai. Không cấp quyền xoá từ web.
- Mọi thao tác có quyền cần người quản trị GitHub xác thực. Không bao giờ đặt `CLOUDFLARE_API_TOKEN` ở frontend.
- Khi sửa workflow/script kiểm thử `node --test tests/cloudflare-namespace-maintenance.test.mjs tests/cleanup-closed-preview.test.mjs`; PR chỉ merge sau CI SUCCESS.
