# GMWW V3.257 — Xác minh sau phát hành Native (PR #572)
- Đã nghiệm thu: bốn nút cập nhật cùng hàng, chọn tệp Runtime thủ công, lưu phiên bản trước để khôi phục.
- Sửa kiểm tra Production Character40: manifest Native không quảng bá sai gói OTA; lấy danh mục toàn phần từ `manual-manifest.json` đã kiểm chứng SHA-256 để đối chiếu 40 ảnh, atlas, HTML/JS và controller GM/Player Web.
- Bỏ giả định shell IPA V3.110, kiểm tra đúng V3.257 và bản IPA công bố.
- Chỉ chạy kiểm tra đúng phạm vi Native postverify và chốt an toàn cú pháp/version, không build lại IPA vì chỉ thay kiểm tra phát hành.
- Không sửa gameplay, Room, Player Web, Durable Objects hay dữ liệu; giữ IPA V3.257; giữ khả năng rollback Cloudflare và runtime trước.
