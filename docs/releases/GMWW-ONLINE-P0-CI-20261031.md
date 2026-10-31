# GMWW — CI-LITE P0 ONLINE (31/10/2026)

- Cơ chế bổ sung **đúng required check Check Player Web Worker**, không xóa/đổi tên status check và không bypass branch protection.
- Chỉ các tập file chính xác cho PR #699 (icon+hiệu ứng), #700 (Chat GM) và #701 (audio WebSocket) được chạy bộ regression theo rủi ro của từng PR. Thay đổi thêm source, API, quyền riêng tư, RULE, Native, dữ liệu hoặc file lạ => **full CI**.
- PR #701 vẫn chạy dry-run Worker, test phân quyền Chat, kiểm tra không phát tán audio và giữ nhận cue xác thực qua /me.
- Kiểm tra byte-exact hai bundle từ source, cú pháp Worker và GM, version gate, test hồi quy trọng tâm. Workflow `Check Player Web Worker` chỉ báo SUCCESS nếu các bước được chọn thành công.
- CI-only PR này không sửa nguồn game, không deploy Cloudflare/Oracle, không tạo IPA, không phát hành Runtime, không thay đổi data/DO schema.
- Mỗi PR vẫn phải đạt required CI SUCCESS ở HEAD cuối cùng, đồng bộ main và nghiệm thu thực tế iPhone trước khi merge/phát hành.
- Rollback: revert PR CI này; mọi required checks và Production/IPA/dữ liệu được giữ nguyên.
