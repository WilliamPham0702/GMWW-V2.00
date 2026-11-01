# GMWW AUTO-DELIVERY V3.0 — QUY TRÌNH CHÍNH THỨC

**Quyết định:** Chủ dự án đã nghiệm thu ĐẠT thử nghiệm V3.0 (PR #733) trên iPhone và phê duyệt thay thế quy trình task cũ cho toàn bộ GMWW.

## Phạm vi và nguyên tắc
- Áp dụng cho Game Engine, Server/GM, Player Web, Online/Offline/DEMO, Role, Artifact, UI, audio, Worker, OTA và vận hành.
- Mỗi yêu cầu: xác định lỗi gốc/phạm vi → nhánh riêng từ HEAD main → test tái hiện + sửa → CI hai tầng → STAGING riêng khi cần → required checks SUCCESS trên HEAD cuối → merge → triển khai có điều kiện → xác minh Production → ghi bản phát hành, rollback.
- CI tầng 1: cú pháp, build đồng bộ, test đúng phạm vi, quyền truy cập, bất biến dữ liệu. CI tầng 2: tích hợp Game Engine/GM/Player/Online, bảo mật, Browser/Worker/OTA/DO khi có thay đổi rủi ro cao. Không bỏ qua required checks; fail-closed khi không xác định phạm vi.
- GitHub-first, miễn phí nếu khả thi; một nguồn chân lý cho SHA, phiên bản Runtime/Server/Player, file .gmwwupdate, SHA-256, release notes tiếng Việt và rollback. Không tạo bản OTA mới cho thay đổi chỉ cần Worker nếu không cần; không công bố file chưa xác minh.
- Production/Pages URL, dữ liệu Durable Objects, IPA, Releases và lịch sử không thay đổi ngoài phạm vi đã phê duyệt; không chuyển server giữa ván. Chỉ deploy khi CI và các điều kiện an toàn thành công.
- Recovery 5 phút: nếu mắc kẹt, đọc lỗi gốc, đổi cách giải quyết hoặc tách PR mới; giữ code/commit/nhánh. Đóng PR thay thế chỉ sau khi đối chiếu thay đổi, không xóa nhánh.
- Nghiệm thu: tự động kiểm thử trước; trường hợp cần thiết dùng STAGING riêng. Người dùng có thể phê duyệt thử trên Production sau khi đủ điều kiện an toàn. Báo trạng thái PASS/FAIL/CHƯA CHẠY có link bằng chứng, không báo hoàn thành nếu chưa xác minh.
- Không tự động merge/deploy chỉ vì một câu trả lời ChatGPT; cần thực thi qua GitHub Actions/Cloudflare và kiểm tra kết quả thực tế.

## Kiến trúc V3.0
1. **Một cơ chế nhận task**: PR riêng, nhãn phạm vi/rủi ro, bản ghi điều kiện nghiệm thu.
2. **CI thông minh hai tầng**: scope-based + integration/safety; duy trì required `CI Policy Gate` đến khi quy tắc thay thế đã chạy và branch protection chuyển an toàn.
3. **Release orchestrator**: một manifest có source SHA, version, Worker deployment ID, Player Web bundle, OTA asset/SHA-256, tình trạng Pages và rollback reference. Không nhân đôi file trong kho Releases.
4. **STAGING cách ly**: Worker/DO độc lập; cấm binding/route Production; kiểm tra live health, bundle, quyền và đường đi người dùng.
5. **Chuyển đổi từng phần**: thay workflow cũ theo nhóm, chỉ tắt workflow cũ khi V3 replacement đã kiểm thử, kiểm tra đúng trigger và không còn dependency/required check. Không xóa workflow lịch sử để làm gọn.

## Kế hoạch chuyển đổi bắt buộc
- GĐ0: đóng băng các thay đổi pipeline không liên quan, kiểm kê 68 workflow cũ và mapping trigger/check/deploy. PR #581 (3D) giữ nguyên trạng thái đóng băng.
- GĐ1: dựng V3 CI và test mapping, chạy song song không can thiệp Production. Không đổi required checks.
- GĐ2: xây release manifest và bộ kiểm tra đối soát Runtime/Worker/Pages/IPA, không thay đổi luồng phát hành hiện tại.
- GĐ3: chuyển từng nhóm kiểm thử cũ sang V3, kiểm tra chi phí và kết quả; tắt trigger trùng khi thay thế đã PASS.
- GĐ4: chuyển deploy/OTA qua một orchestrator có release gate, rollback, checksum và chống trùng; đối chiếu Cloudflare Production/GitHub Releases.
- GĐ5: chỉ sau khi GĐ1–4 đạt, thay branch protection required checks theo PR riêng và vô hiệu hóa cơ chế cũ đã được thay thế.

## Kiểm kê task cũ tại thời điểm phê duyệt
- GitHub mở: chỉ PR #581 (3D, draft/đóng băng); không có Issue độc lập đang mở thuộc quy trình cũ để đóng.
- Không mở lại PR đã đóng. Không xóa mã nguồn/nhánh/Releases/IPA/Production.
- PR #733 đã merge và Worker Production đã deploy; đây là bằng chứng nghiệm thu task mẫu, không phải bằng chứng rằng 68 workflow cũ đã được thay thế.

## Tiêu chí hoàn tất chuyển đổi
- Mỗi luồng test, deploy, backup và OTA đều có V3 replacement đã PASS.
- Không còn trigger cũ trùng, không mất required checks, rollback hoạt động, SHA và manifest khớp Production.
- Release notes tiếng Việt, link tải file .gmwwupdate và .sha256 thực tế; không phá IPA, URL và dữ liệu.
- Chỉ tuyên bố 'V3.0 thay thế kỹ thuật toàn bộ' khi có bằng chứng GĐ1–5 hoàn tất.
