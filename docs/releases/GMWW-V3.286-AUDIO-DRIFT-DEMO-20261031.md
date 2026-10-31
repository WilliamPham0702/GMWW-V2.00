# GMWW Runtime V3.286 — ứng viên tích hợp an toàn (CHƯA PHÁT HÀNH)

Ngày 31/10/2026. Không dùng nhánh QA này để cập nhật Production trước khi nghiệm thu.

## Nguyên nhân phải tăng phiên bản

- Runtime V3.285 QA (PR #692): SHA-256 gói `53515d3e5f82b63f90f909d32ba97257f1f8eebb05ef49335b8b42eb285ff361`.
- Runtime V3.285 Production (PR #695, GitHub Release): SHA-256 gói `bb240f511e7a39a3d05eeb51b71191a09174dbdc3f6073f20efc956e22d0bd77`.
- Hai gói khác SHA-256 nhưng cùng phiên bản. iPhone cài V3.285 QA sẽ từ chối OTA V3.285 Production theo chống hạ cấp/bằng phiên bản. **Không được coi cùng số phiên bản là cùng byte hoặc đã đồng bộ.**
- Bản phát hành tiếp theo phải V3.286 hoặc cao hơn, không ghi đè hoặc tái phát hành 3.285.

## Phạm vi mã nguồn

1. Bảo toàn toàn bộ main V3.285: DEMO Online PR #677/#694/#695, đăng nhập, chat, API, Worker, Player Web và link Pages đã xác minh.
2. Tích hợp Audio PR #654 từ ứng viên #665: file Tên độc lập với Full, Play/Thay thế, thùng rác Audio có xác nhận và khôi phục, báo cáo liên kết Audio Vai Trò; không xóa dữ liệu IndexedDB.
3. Tích hợp sửa PR #659: trạng thái `runtime_ahead` / `channel_mismatch` / `synchronized` phân biệt, chặn OTA Runtime cũ/bằng phiên bản, HEALTHY CHECK ba chiều.
4. Ghép chính xác 7 module thành `server-game/current/app.js`; giữ thay đổi DEMO Online `roomMode:(target==='online'||target==='demo')` từ main.
5. Worker, Game Runtime, HTML, package và lock cùng phiên bản **V3.286**. IPA shell giữ nguyên. Không thay IPA, Oracle, Room/DO hoặc dữ liệu.

## Bắt buộc trước merge/phát hành

- CI required SUCCESS trên HEAD cuối cùng. Chạy test audio, drift, DEMO Online, HTTPS Pages alias, bundle 7 module, package SHA-256, OTA downgrade và Worker/version.
- Preview iPhone thật: Safari, Chrome, Edge, GM Native; đặc biệt Runtime V3.285 QA / Server V3.285 không được coi là cùng nội dung chỉ nhờ số version.
- Đối soát GitHub Runtime Release, Worker Production /api/health, OTA manifest, checksum package, rollback thật. Không tuyên bố đồng bộ hoặc kết quả iPhone nếu chưa xác minh.
- Xuất **một** file `GMWW-Runtime-V3.286.gmwwupdate`, `.sha256`, release notes tiếng Việt, kho tải chung dùng link gốc.
- Bảo toàn toàn bộ file/ngữ liệu Production, IPA V3.275, Oracle và lịch sử.

## Rollback

- Giữ Release Production V3.285 và các bản rollback cũ, không xóa file.
- Với iPhone đã cài V3.285 QA, **không tự hạ cấp** về V3.285 Production hay V3.280. Chỉ nâng lên Runtime đã xác minh V3.286+.
- Nếu Production phát sinh lỗi sau deploy: dừng update, khôi phục Worker từ deployment đã xác minh khi tương thích dữ liệu; rollback Runtime chỉ khi không làm mất dữ liệu và thiết bị cho phép. Không reset Durable Objects, phòng hoặc dữ liệu.
