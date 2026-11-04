# GMWW iOS – Quyền micro trong WebKit (04/11/2026)

## Kết quả sửa native (PR riêng)
- Khai báo `NSMicrophoneUsageDescription` cho quyền thu âm ở cấp hệ điều hành.
- Cài `WKUIDelegate.webView(_:requestMediaCapturePermissionFor:initiatedByFrame:type:decisionHandler:)`. Chỉ `.grant` khi **microphone**, **khung chính**, **file origin** và URL chính xác của `GMWW.html` nằm trong bundle IPA hoặc Runtime OTA đang kích hoạt. Dùng `standardizedFileURL` và `resolvingSymlinksInPath` chống đường dẫn giả.
- Camera hoặc mic+camera → `.deny`; các nguồn không xác nhận → `.prompt` của WebKit (không tự cấp quyền). App-level iOS vẫn phải được người dùng đồng ý lần đầu. Người dùng có quyền tắt micro tại iOS Settings.
- Giữ nguyên `WKWebViewConfiguration.websiteDataStore = .default()`, runtime OTA, URL production và dữ liệu; không bật thu âm ngầm.

## CI và nghiệm thu
- `node --test tests/native-ios-microphone-permission-20261104.test.mjs` và native release gates.
- Build iOS với Xcode runner (nếu runner khả dụng). Kiểm tra compile Swift, Info.plist nằm trong IPA và xử lý JS native đúng.
- Trên **iPhone thật**: lần đầu nhấn mic → xin quyền iOS; đóng/mở lại ứng dụng, đổi phòng, chuyển tab, quay lại mic → không bị hỏi mỗi phiên; Settings tắt micro → ghi âm từ chối; WebKit không được cho phép camera/khung phụ/trang lạ.
- So sánh iPhone cài IPA cũ trước/sau, lưu log bản build và tổng hợp PASS/FAIL. **Chỉ phát hành IPA mới sau khi PASS trên iPhone thực**, không chỉ dựa trên test tĩnh.

## Rollback
- Giữ IPA cũ (shell hiện tại) và Runtime V3.294/V3.296 nguyên trạng. Nếu có lỗi quyền, quay về IPA đã nghiệm thu, giữ nguyên dữ liệu và không thay Cloudflare A/B, DNS hay URL.
- Đây là thay đổi native IPA độc lập PR #786 (nút 🗑️ trên GM/Player Web), không được tự gộp.

## Giới hạn
WebKit có thể đưa ra hành vi khác nhau theo phiên bản iOS hoặc origin file; không cam kết loại bỏ mọi prompt khi chưa có xác nhận trực tiếp. Không nới quyền cho trang web bên ngoài.
