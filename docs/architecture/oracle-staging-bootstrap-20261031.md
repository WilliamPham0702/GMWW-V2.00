# GMWW Dual Server Oracle — STAGING bootstrap (31/10/2026)

## Trạng thái
Đây là **bộ khung độc lập**, KHÔNG phải Server Online hoàn chỉnh, KHÔNG triển khai Oracle VM.
- Node.js 22, không có dependency bên ngoài, không đọc hoặc ghi Durable Objects, tài khoản, phòng, lịch sử.
- `GET /healthz` trả liveness 200 nhưng `ready=false`.
- `GET /readyz`, mọi API, trang game và WebSocket trả 503: chặn chuyển backend sai trạng thái.
- Mặc định chỉ bind localhost; chỉ bật bằng `GMWW_ORACLE_STAGING=1`, public bind phải phê duyệt riêng và có TLS reverse proxy.
- Không thêm link Oracle vào Cài đặt GM. Không ảnh hưởng Production Cloudflare, Pages alias, IPA, OTA, dữ liệu.

## Kiểm thử đúng phạm vi
`node --test tests/oracle-staging-bootstrap.test.mjs`: liveness, readiness 503, API đóng, WS đóng, không public bind ngoài ý muốn. CI độc lập, không triển khai.

## Giai đoạn tiếp
1. Kiểm toán phiên bản/phương thức serialization `RoomDurableObject`, thư viện luật và websocket.
2. Tách service engine dùng chung và storage adapter trên Oracle STAGING, **không can thiệp GMWW Worker Production**.
3. Bổ sung snapshot/checkpoint có checksum + schema version, replay test realtime/reconnect/undo/chat trên server riêng.
4. Triển khai Oracle VM khi có quyền truy cập hợp lệ; cấu hình TLS và health probe; nghiệm thu iPhone.
5. Chỉ bật Oracle khi hai server trùng phiên bản/contract, hoàn thành checkpoint và không có ván đang diễn ra.

## Rollback
Không có dữ liệu hay server Production nào được sửa ở PR bootstrap; rollback bằng cách dừng process STAGING hoặc revert PR. Không cần hạ Runtime/IPA.


## Bổ sung STAGING snapshot/failover simulation (chưa đủ điều kiện chạy thật)
- `oracle-staging/room-adapter.mjs` tạo snapshot **chỉ từ fixture thử nghiệm**, chuẩn hoá nội dung và băm SHA-256; chưa phải cơ chế xuất/nhập trạng thái đầy đủ của Cloudflare Durable Objects.
- Lưu file atomically trong thư mục STAGING đã có marker `.gmww-oracle-staging-only`, chỉ khi bật đồng thời `GMWW_ORACLE_STAGING=1` và `GMWW_ORACLE_FIXTURE_ONLY=1`; không sao chép Production data, không chứa hoặc tái sử dụng token đăng nhập.
- Từ chối snapshot sai định dạng/bị sửa checksum, room code bất hợp lệ, revision lùi, mâu thuẫn version/schema/source SHA.
- `simulateFailover` từ chối ván đang chơi, WebSocket còn kết nối, thiếu phê duyệt GM hoặc nội dung snapshot lệch; **luôn trả `productionSwitchAllowed: false`**, kể cả khi simulation PASS.
- `/healthz` chỉ hiển thị adapter schema, **không công bố readiness**. `/readyz`, API, WebSocket vẫn HTTP 503.
- **Chưa đạt:** adapter DO SQL thực, login/session và phân quyền, migration/rollback dữ liệu, WebSocket parity và reconnect, Oracle VM TLS/backup, kiểm tra failover end-to-end. Không merge tính năng vào Production gameplay. Không phát hành IPA/Runtime từ thay đổi STAGING này.

## Nghiệm thu và rollback bổ sung
- Chạy `node --test tests/oracle-staging-bootstrap.test.mjs` và `node --check oracle-staging/server.mjs`.
- CI Oracle STAGING phải SUCCESS, các required check của PR phải SUCCESS mới cân nhắc merge. Không chạy test trên phòng thật.
- Nếu xảy ra lỗi, revert PR để quay về bootstrap trước đó; không cần can thiệp Cloudflare Production, Pages, IPA, Runtime hoặc lịch sử người chơi.
