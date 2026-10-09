# GMWW — Cài đặt riêng VNext (ĐỀ XUẤT, KHÔNG TRIỂN KHAI PRODUCTION)

**Nguồn đối chiếu:** V1.09 là phiên bản gốc do GM chỉ định. File IPA `GMWW-V1.09.ipa` đã được tìm thấy trong Library, nhưng dịch vụ lưu trữ từ chối xuất byte để đọc UI; không được khẳng định đã trích xuất màn hình bản gốc. Với bản V1, chỉ có dữ liệu baseline `GMWW-WilliamPham/baseline/v1.08` được đọc và kiểm chứng. **Phiên bản hiện hành đã đọc:** V3.47 tại `server-game/current/GMWW.html`.

## Bố cục một màn cuộn, không tab

1. **Trạng thái hệ thống:** phiên bản Ứng dụng / Runtime / Server (độc lập). Một nút chính **Cập nhật & đồng bộ**; nút Kiểm tra lại. Ba thao tác cụ thể **Runtime / IPA / Đồng bộ Web** chỉ mở trong chi tiết nâng cao. Không được báo *Mới nhất* hoặc 100% khi chưa được xác minh; tiến độ theo từng tác vụ.
2. **Giao diện & trải nghiệm chơi:** kích thước nhân vật 2D, âm thanh, tối ưu hiển thị. Giữ nguyên giá trị/tài nguyên hiện tại.
3. **Dữ liệu & an toàn:** Sao lưu, Khôi phục có xác nhận, Kiểm tra dữ liệu. Không tự xóa LocalStorage, IndexedDB, Theme, Artwork, Audio, Ván Mẫu.
4. **Kiểm tra & khắc phục:** một nút Kiểm tra toàn hệ thống (Server, Player Web, Realtime, dữ liệu) và bản tóm tắt kết quả. Công cụ chuyên sâu: Nhật ký lỗi / Dọn cache có xác nhận / Đề xuất sửa.
5. **Công việc & tiến độ:** ưu tiên Issue mở, xác nhận Hoàn thành / Bỏ qua qua GitHub, lịch sử thu gọn.

## Ánh xạ chức năng bắt buộc từ V3

| ID hiện có | Chuyển đến | Yêu cầu |
| --- | --- | --- |
| `installRuntimeUpdate`, `downloadNewIPA`, `syncPlayerWebUpdate`, `retryUpdateCheck` | Trạng thái hệ thống | Tác vụ thực tách biệt, không dùng cùng 100% |
| `settingsRunHealth`, `opsRunFullAudit`, `opsCheckRoom`, `opsCheckRelease`, `checkServerHealth`, `runSystemDiagnostics`, `checkPlayerWebNow` | Kiểm tra & khắc phục | Giữ kiểm tra lõi, gộp UI, không chạy API lặp |
| `auditLocalData`, `clearRuntimeCache`, `quickRepairSystem`, `reloadApp` | Dữ liệu / Chuyên sâu | Chỉ xóa cache tái sinh, không mất dữ liệu |
| `gmwwTasksOpenList`, `gmwwTasksHistory`, `gmwwTasksDoneList`, `gmwwTasksReload` | Công việc & tiến độ | Phê duyệt từ người quản trị |
| `characterScaleChoices` | Giao diện & trải nghiệm | Giữ dữ liệu cấu hình nhân vật |

## Hợp đồng module độc lập

- Toàn bộ selector UI trong namespace `#settingsVNext`; `index.html`, `styles.css`, `script.js` độc lập.
- Bản demo không gọi mạng, không đọc hoặc ghi dữ liệu thiết bị, không chạy tính năng update. Tất cả control nhạy cảm mở thông báo *đề xuất* thay vì báo thành công giả.
- Chưa được thay hoặc xóa `server-game/current/GMWW.html`, `app.js`, `style.css`, và chưa sửa IPA/Player Web khi chưa nghiệm thu mẫu.
- Sau khi duyệt, làm adapter chức năng tương đương trên nhánh staging, chạy test hồi quy, sau đó mới xin phép merge/deploy.

## Điều kiện duyệt

- Mobile 393px / desktop 1280px không tràn ngang; font tiếng Việt đúng; dùng một màn cuộn.
- Các chức năng hiện tại vẫn có lối truy cập và hành vi không bị đổi; không có trạng thái giả.
- Nguyên tắc dữ liệu V1.08 baseline được bảo toàn.
- Cần ảnh/binary IPA V1.09 để kết luận độ tương đồng thật với bản gốc, không suy đoán UI từ V1.08.
- **Production không thay đổi bởi nhánh thiết kế này.**

**Mẫu giao diện:** đã tạo bản HTML chạy độc lập cùng nguồn ZIP, ảnh chụp iPhone/laptop để chủ dự án duyệt trong phiên ChatGPT; chưa đưa các file chạy vào app chính.
