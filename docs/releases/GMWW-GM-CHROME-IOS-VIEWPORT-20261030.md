# GMWW · GM Server Chrome iPhone — viewport cố định (30/10/2026)

## Triệu chứng
- Ảnh thực tế: Chrome iPhone mở GM Server ở bước **Sảnh chờ**, nhìn thấy thanh trình duyệt và cảm giác cảnh làng cao hơn vùng game; thao tác có thể khiến giao diện không cố định như Safari/Edge.
- Giao diện này thuộc **GM Server (six-step timeline)**, không thuộc Player Web đã sửa bằng PR #631.
- Gốc kỹ thuật: \`#app\` và \`body.play-immersive #start .play-shell\` sử dụng \`100dvh\` nhưng không đồng bộ lại chiều cao vùng hiển thị khi Chrome iOS thay đổi thanh trình duyệt.

## Thay đổi
- Chỉ với iOS Chrome (\`CriOS/\`), đo \`visualViewport.height\` và \`offsetTop\`, đồng bộ khi cuộn/thay đổi thanh Chrome, xoay máy và bật/tắt bàn phím.
- Khóa khung \`#app\`, \`#stage\`, \`#start\` và \`#playShell\` vào vùng viewport; không kéo toàn bộ trang; các trang quản lý vẫn cho phép cuộn nội dung bên trong.
- Safari, Edge, Player Web và ứng dụng GM IPA không đổi. Không chỉnh luật chơi, API, phòng, dữ liệu DO hay Runtime OTA.

## Kiểm thử / nghiệm thu
- Regression: \`node --test tests/gm-chrome-ios-viewport-20261030.test.mjs\` (viewport động, không-scroll trang, Chrome-only, Safari/Edge không đổi).
- Kiểm tra trực tiếp iPhone Chrome vẫn cần thực hiện sau khi phát hành: xem Sảnh chờ → Tập hợp → Vào trận; vuốt nền; xoay máy; mở bàn phím/box; xác nhận dock không tràn.
- Thanh địa chỉ và điều hướng do **Chrome** quản lý, web không thể tự xóa khi chạy trong tab trình duyệt. Phạm vi fix là vùng **trang game**, không xóa UI của Chrome.

## Phát hành / rollback
- Chỉ đưa lên Production sau khi required CI SUCCESS và có phê duyệt. Nếu gặp lỗi, revert commit GMWW.html của PR này, không đụng OTA/IPA/dữ liệu.
