# GMWW CI-LITE A — Kiểm toán và ma trận kiểm thử (31/10/2026)

> Phạm vi PR này: ghi nhận tiêu chí kiểm toán. **Chưa thay đổi GitHub Actions hoặc branch protection.** Không được xem PR tài liệu này là đã kích hoạt CI-LITE.

## Nguyên tắc bất biến
- Không bỏ qua required checks của branch protection; phải đối chiếu tên job/check thực tế trước khi thay đổi workflow.
- Không giảm kiểm tra cú pháp, build integrity, quyền truy cập, dữ liệu, bảo mật cho thay đổi có liên quan.
- Production release là một gate riêng: build, tương thích, SHA-256, release notes tiếng Việt, rollback, xác minh artifact và môi trường đích.
- Thay đổi RULE/chat/server/storage phải có kiểm thử chức năng và hồi quy đúng vùng tác động; các luồng chéo phải được kiểm tra nếu có liên quan.
- Không tự tạo Cloudflare Preview cho PR docs-only. Nhưng không được làm mất required check: dùng job gate cùng tên báo PASS sau khi xác minh chỉ thay đổi tài liệu, hoặc cập nhật branch protection trong thay đổi được kiểm soát.
- Nếu không thể xác minh branch protection và workflow hiện hành, **không merge PR chỉnh CI**.

## Ma trận định tuyến đề xuất

| Thay đổi | CI tối thiểu |
|---|---|
| docs-only | policy/format/links; required check không bị mất |
| UI, icon, vị trí toast | syntax/build + focused UI regression |
| audio, DEMO, timeline | syntax/build + focused audio/DEMO tests |
| RULE, role, artifact | syntax/build + executor, undo, interaction tests liên quan |
| chat, auth, WebSocket | syntax/build + auth/permissions, transport, reconnect |
| API, Durable Objects, storage | syntax/build + migration, persistence, compatibility, security |
| OTA, IPA, release | build + artifact integrity + SHA-256 + rollback readiness |

## Bằng chứng cần thu thập trước PR chỉnh workflow
1. Danh sách workflow và tên check thực tế từ GitHub Actions.
2. Required status checks / rulesets của nhánh main.
3. Danh sách trigger và paths filters; kiểm tra skip không tạo pending required checks.
4. PR docs-only #705: Preview FAIL do Cloudflare Free giới hạn 100 Durable Object namespaces (10067), không phải lỗi tài liệu.
5. PR UI #702: cần hoàn tất Check Player Web Worker trước merge.

## Tiêu chí nghiệm thu PR chỉnh CI riêng
- Docs-only không tạo Preview và không bị treo required checks.
- UI chỉ chạy focused tests và các gate nền tảng bắt buộc.
- PR có thay đổi dữ liệu/quyền/RULE không thể bỏ qua các gate tương ứng.
- CI SUCCESS trên HEAD cuối; có rollback workflow; không tự deploy Production.
