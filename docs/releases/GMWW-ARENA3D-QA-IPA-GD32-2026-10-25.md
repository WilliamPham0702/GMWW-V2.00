# GMWW Arena 3D — GĐ32: IPA nghiệm thu iPhone (25/10/2026)

## Mục đích
Chủ dự án yêu cầu **nghiệm thu Arena 3D trong IPA cài trên iPhone**, không mở `live.html` trong Safari như trước. Thiết kế này tạo một IPA QA độc lập, hiển thị màn hình Arena 3D trong `WKWebView` của ứng dụng iOS, kết nối HTTPS duy nhất tới DO/Worker STAGING đã kiểm thử Core thật.

## Tách biệt tuyệt đối khỏi ứng dụng chính thức
- Swift shell QA tạo trên macOS Actions runner bằng cách thay `GameView.swift` bằng `tools/arena3d-ipa/ArenaStagingGameView.swift` **chỉ trong bản build QA**. Mã Swift của GMWW Production không thay đổi.
- Bundle ID: `com.gmww.v2.arena3d.qa`, tên `GMWW Arena 3D QA`, version `0.32.0` và build `3201`. Không thể ghi đè ứng dụng `com.gmww.v2.server` chính thức.
- Chỉ tải `https://gmww-arena3d-stage14-staging.williampham0702.workers.dev/village/arena-3d/live.html` **bên trong app iOS**. Mọi điều hướng chính sang tên miền khác bị chặn. API/WebSocket của trang 3D dùng cùng STAGING origin; không truy cập phòng/dữ liệu Production.
- Không khai báo App Store Release, Runtime OTA, cập nhật Player Web 2D hoặc thêm IPA vào kênh `TẢI IPA` Production.
- Giữ PR #487 dạng Draft; không merge.

## Đường tải IPA ở server
- STAGING: `https://gmww-arena3d-stage14-staging.williampham0702.workers.dev/village/arena-3d/ipa.html`.
- `GET /api/arena-staging/ipa`: server STAGING chuyển hướng đến binary trong GitHub **QA prerelease riêng** `arena3d-qa-20261025-gd32-r1`. Đây là địa chỉ server ổn định; binary được lưu trên GitHub Releases, **không** trong KV/DO/Production.
- `GET /api/arena-staging/ipa/sha256`: đường đến SHA-256 của đúng IPA. Metadata `GET /api/arena-staging/ipa/metadata` ghi version, bundle ID và tình trạng signing.
- Workflow riêng `.github/workflows/arena3d-qa-iphone-ipa.yml`: macOS Xcode build QA → package IPA → checksum → lưu GitHub Actions artifact → tạo prerelease QA riêng → deploy **chỉ Worker STAGING** và xác minh endpoints.

## Giới hạn về ký IPA
- Native pipeline đang build `CODE_SIGNING_ALLOWED=NO`. File `.ipa` có thể tải nhưng **chưa có chữ ký iOS phù hợp thiết bị**, vì vậy không được coi là cài trực tiếp từ Safari.
- Cần profile, chứng chỉ ký iOS phù hợp hoặc dịch vụ sideload có ký lại trước khi cài lên iPhone thực. Chưa có bằng chứng cài đặt trên thiết bị cho bản này.
- Không được đánh dấu **NGHIỆM THU ĐẠT** chỉ vì build IPA và STAGING thành công. Cổng nghiệm thu phải là app đã ký/cài được và bài 30 Character trong ứng dụng iOS trên iPhone thật.

## Phạm vi nghiệm thu IPA
Tạo phòng Core STAGING, phát vai, 30 Character, action Vai Trò/Artifact, 0–5 mục tiêu, chuyển Đêm/Ngày, Lên Giàn, kết thúc, reconnect và quyền bí mật. Theo dõi FPS, đơ/lỗi WebGL, nóng và hao pin trên máy thật. Không tự mở lại các kiểm thử game 2D không liên quan.

## Điều kiện bàn giao
Chỉ công bố phiên bản, GitHub Actions run, URL binary đang tồn tại, SHA-256 và Worker version nếu xác minh. Nếu thiếu signing, báo rõ IPA chưa ký và chưa thể xác nhận cài đặt. Rollback bằng cách trỏ STAGING về Cloudflare Worker version GĐ29–31 `7ac53fa4-6449-49d0-a121-e82dd9572acc`. Không đụng Worker Production.

**Trạng thái:** đang chờ bằng chứng build/deploy thực tế của workflow IPA QA.
