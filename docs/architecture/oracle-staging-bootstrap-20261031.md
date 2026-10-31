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
