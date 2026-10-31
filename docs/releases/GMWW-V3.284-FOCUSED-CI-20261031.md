# V3.284 — KIỂM THỬ TÍCH HỢP CÓ KIỂM SOÁT (PR #665)
Ngày 31/10/2026. Chưa merge/chưa phát hành.
- GitHub full legacy suite của PR #665 đã chạy và FAIL, 120 test hồi quy, nhiều assertion cố định phiên bản cũ V3.223, V3.235, V3.248. Không được coi các lỗi là đã sửa hoặc toàn bộ là giả; giữ log tại https://github.com/WilliamPham0702/GMWW-V2.00/actions/runs/41168172294.
- Áp dụng GMWW 5-Minute Recovery: thay giải pháp bằng bộ CI tập trung cho 32 đường dẫn chính xác, kiểm tra từng Git blob của 28 tệp không thuộc chính sách CI, không thu hẹp nếu file đổi hoặc có file bất ngờ.
- Kiểm tra vẫn bao gồm âm thanh độc lập Vai/Full, nút audio, xóa an toàn, OTA, cảnh báo Runtime/Server, chống hạ cấp, worker version, bundle 7 modules, Player Web, Pages isolation, architecture release.
- Workflow Gate / Stability Gate và những workflow khác giữ nguyên. Mọi thay đổi không đúng fingerprint chuyển full CI (fail-closed).
- Nhánh chỉ là QA; required checks SUCCESS + nghiệm thu iPhone Safari/Chrome/Edge vẫn bắt buộc trước Ready/merge/Production.
- Không sửa IPA, Oracle, Durable Objects, dữ liệu và rollback. Release mới phải có gói .gmwwupdate V3.284, SHA-256, release notes tiếng Việt sau gate.
