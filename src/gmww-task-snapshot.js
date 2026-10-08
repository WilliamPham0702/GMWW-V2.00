// Fallback public GitHub Issues snapshot generated from the linked repository.
// Live /api/operations/tasks always takes precedence; mark this snapshot as stale.
export const GMWW_TASK_SNAPSHOT_GENERATED_AT="2026-10-08T19:45:00+07:00";
export const GMWW_TASK_SNAPSHOT=[
  {
    "number": 103,
    "title": "[V3.39] Nghiệm thu trạng thái cập nhật Server và Runtime trên IPA",
    "state": "open",
    "state_reason": null,
    "updated_at": "",
    "labels": [],
    "body": "## Lỗi từ ảnh IPA\n- Ứng dụng V3.17, Game Runtime V3.38, Server V—, chỉ báo KHÔNG KIỂM TRA ĐƯỢC nhưng vẫn thông báo 'GMWW đang ở phiên bản mới nhất'.\n\n## Khắc phục đã triển khai\n- Kiểm tra độc lập /api/health và /api/update/manifest; thử lại khi kết nối thất bại.\n- Chỉ công bố 'phiên bản mới nhất' nếu cả Server và manifest đều hợp lệ, cùng phiên bản; không giữ gói manifest cũ nế"
  },
  {
    "number": 106,
    "title": "[Character V4] Quyết định chính thức: bỏ hướng 42 ảnh cũ, thiết kế mới 20 Character / Master-01",
    "state": "open",
    "state_reason": null,
    "updated_at": "",
    "labels": [],
    "body": "## Quyết định chính thức của chủ dự án — 08/10/2026\n**Thay thế hoàn toàn hướng phát triển 42 Character cũ bằng bộ 20 Character mới thiết kế từ đầu**, theo phong cách chibi fantasy biển đã được chọn. Các hình cũ KHÔNG còn là nền tảng tạo Rig hay template nhân vật mới.\n\n### Cách xử lý hệ thống an toàn\n- 42 hình cũ chỉ giữ trong nguồn/backup để tránh mất dữ liệu. **Không xóa tài n"
  },
  {
    "number": 105,
    "title": "[V3.40] Nghiệm thu Giải tán tất cả — mọi người chơi phải về Sảnh chờ",
    "state": "open",
    "state_reason": null,
    "updated_at": "",
    "labels": [],
    "body": "## Lỗi người dùng báo\nSau khi GM nhấn **Giải tán tất cả**, một số người chơi về Sảnh chờ, số còn lại vẫn ở Phòng.\n\n## Khắc phục đã triển khai\n- GM giải tán: xóa mọi người chơi (online, offline, chưa có vị trí, guest), trả số thành viên về 0, thu hồi trạng thái/phiên trò chơi và thông báo WebSocket ngay; không xóa phòng.\n- Lưu danh sách bị mời ra để chặn ứng dụng cũ tự phục hồi "
  },
  {
    "number": 101,
    "title": "P1 — Chờ nghiệm thu V3.37: Trang Chủ fantasy có artwork thật theo phong cách V1",
    "state": "open",
    "state_reason": null,
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu người dùng (08/10/2026)\nNghiên cứu Trang Chủ V1.09 và thiết kế, triển khai Trang Chủ GMWW V3 thay màn placeholder.\n\n## Căn cứ có thể kiểm chứng\n- Repo V1 lưu baseline V1.08; không tìm được file IPA V1.09 để sao chép chính xác pixel.\n- Bộ giao diện GMWW 9.11 trong repo V1 (`src/player-prototype.js`) có bố cục: ảnh banner, hành động chính, khám phá, thành tích/xếp hạng"
  },
  {
    "number": 102,
    "title": "[V3.38] Nghiệm thu công cụ Tập hợp, xếp chỗ và giải tán phòng",
    "state": "open",
    "state_reason": null,
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu nghiệm thu (5 hạng mục)\n- [ ] Gọi người vào phòng không làm menu Tập hợp biến mất; có thể bấm tiếp ngay.\n- [ ] Phân ngẫu nhiên: nhân vật ngồi ngay trên dấu lá của vị trí được phân.\n- [ ] Thủ công: người chơi và vị trí hiển thị song song, thao tác chọn người rồi chọn vị trí.\n- [ ] Chốt vị trí hoạt động sau gọi người, xếp thủ công/ngẫu nhiên; thông báo khi chưa đủ điều"
  },
  {
    "number": 87,
    "title": "P1 — Kiểm tra luồng bình chọn ONLINE và OFFLINE",
    "state": "open",
    "state_reason": null,
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu cần nghiệm thu\nKiểm tra người chơi đều bình chọn trên Player Web khi Online và Offline. GM có quyền điều chỉnh kết quả ở chế độ hỗ trợ, trong khi Online dùng chat/voice theo pha ban ngày, nhóm chat riêng ban đêm theo quyền. Hai chế độ dùng chung làng và character.\n\n## Kết quả cần lưu\nGắn commit/CI và kết quả kiểm thử Production/IPA có thể tái hiện; đóng issue sau khi"
  },
  {
    "number": 86,
    "title": "P1 — Phân bổ chỗ ngồi ngẫu nhiên với vòng trong ưu tiên",
    "state": "open",
    "state_reason": null,
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu cần nghiệm thu\nNút Sắp ngẫu nhiên trong Tập hợp dân làng gán đúng người còn trống, ưu tiên tám slot trong quanh lửa và sau đó mới tới vòng ngoài, tổng cấu hình hiện hành 24 slot. Kiểm tra không trùng người/chỗ, đúng vị trí thật khi Player Web và IPA đồng bộ.\n\n## Kết quả cần lưu\nGắn commit/CI và kết quả kiểm thử Production/IPA có thể tái hiện; đóng issue sau khi nghiệ"
  },
  {
    "number": 82,
    "title": "P1 — Phòng và nhân vật realtime giữa IPA, Worker và Player Web",
    "state": "open",
    "state_reason": null,
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu đối chiếu\nĐối chiếu WebSocket broadcast room scope, trạng thái online/offline, characterAnimation, avatar/tên/trạng thái/vai, vào lại phòng, rời phòng, GM chạm nhanh, reset; tất cả màn nhìn thấy nhân vật cập nhật realtime không cần reload, không lẫn phòng và không bị phantom presence. Kiểm tra tài khoản đã được lưu qua LocalStorage/IndexedDB và server data.\n\n## Kiểm "
  },
  {
    "number": 81,
    "title": "P1 — Auto GM, engine đêm/ngày và flow game nhất quán",
    "state": "open",
    "state_reason": null,
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu đối chiếu\nAuto GM mặc định bật cả ONLINE/OFFLINE nhưng GM can thiệp mọi thời điểm; flow chọn ván mẫu, phân vai, phát vai, vào trận. Đêm 1 có bước Bầy sói dậy nhìn mặt nhau; hành động xử lý đúng thứ tự và tương tác Bảo Vệ/Cắn/Dịch chuyển/Cứu/Giết/Soi/Đóng băng/Tráng gương/Đổi vai. Thời gian thảo luận, chức năng tính giây theo Ván Mẫu; tổng kết cuối đêm, kiểm tra thắng"
  },
  {
    "number": 80,
    "title": "P1 — Artifact: đủ bộ 44 lá, đổi vai/tráng gương và phát lại vai",
    "state": "open",
    "state_reason": null,
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu đối chiếu\nKiểm kê đúng 44 Artifact theo tên/hiệu ứng/hành động/giới hạn; Đổi Vai Trò A↔B phải cập nhật và phát lại lá đúng cho cả hai; Tráng Gương nhận thêm kỹ năng đúng ràng buộc; artifact đầu đêm có thể bật/tắt theo ván; artwork đúng lá, không sai template, không lấy ảnh cũ có bảng tên.\n\n## Kiểm soát trạng thái\nĐây là hạng mục kiểm kê/kiểm thử từ các yêu cầu người "
  },
  {
    "number": 79,
    "title": "P1 — Bộ lá bài 63 vai trò: dữ liệu, hiệu ứng, ràng buộc và kiểm thử",
    "state": "open",
    "state_reason": null,
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu đối chiếu\nKiểm kê cấu hình 63 lá vai trò đã chốt (28 có trước và 35 bổ sung), cấu trúc Phe→Vai trò→Hành động→Hiệu ứng→Giới hạn→Điều kiện→Mục tiêu→Thứ tự→Trạng thái. Không hardcode vai, mở rộng từ config; kiểm tra hai vai còn cần chốt Già Làng/Cô Bé Tí Hí; GM override, thắng thua, đêm, pha, giới hạn 2 bình Phù Thủy, chuyển mục tiêu và trạng thái chết/hồi sinh. Kiểm tr"
  },
  {
    "number": 78,
    "title": "P1 — GM cưỡi sói trắng có animation đi/chạy/tru thật",
    "state": "open",
    "state_reason": null,
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu đối chiếu\nAsset GM cưỡi sói trắng đã được thay nhưng có phản hồi chỉ là hình tĩnh. Cần xác minh chuyển động chân sói khi bước đi/phóng trước, đôi lúc lắc đầu/ngước lên tru; chân sắc nét, không mờ, tỷ lệ cưỡi đúng; động tác hiển thị trên thực tế Player Web/IPA mà không chỉ có khai báo CSS. Không chỉnh artwork khác ngoài yêu cầu.\n\n## Kiểm soát trạng thái\nĐây là hạng mụ"
  },
  {
    "number": 77,
    "title": "P1 — Nhân vật tự di chuyển ngẫu nhiên, động tác Idle và chu kỳ ngồi",
    "state": "open",
    "state_reason": null,
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu đối chiếu\nYêu cầu Player Web: mỗi người không có ghế đã gán được đi tự do trong vùng hợp lệ, không tất cả chạy cùng một hướng hoặc tụ vào lửa; dừng, ngồi khoảng 30 giây, đứng rồi đi tiếp; các animation idle sống động nhìn thấy được, không biến dạng, không di chuyển lên mái nhà/xuống biển. Khi GM đã bố trí chỗ cần tôn trọng vị trí, không auto chiếm slot.\n\n## Kiểm soát"
  },
  {
    "number": 76,
    "title": "P1 — Hoàn thiện 20 character động và bộ chọn đủ 42 character",
    "state": "open",
    "state_reason": null,
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu đối chiếu\nLúc tạo tài khoản dùng trực tiếp character làm avatar, không thumbnail; có 42 character để quản trị lựa chọn theo phạm vi bộ asset, 20 character động ưu tiên dùng thật (đi/chạy/dừng/vươn vai/phản ứng), không để 42 ảnh tĩnh che trạng thái. Phân biệt asset master so với asset dựng cho game; kiểm tra character không che tên/vai/trạng thái và hiển thị đúng trên"
  },
  {
    "number": 71,
    "title": "P0 — Hai phòng độc lập và realtime đa người chơi không lẫn dữ liệu",
    "state": "open",
    "state_reason": null,
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu gốc và tiêu chí rà soát\nCần kiểm tra hai phòng ONLINE và OFFLINE vận hành đồng thời độc lập từ mở/tắt/reset đến mời người/chia vai/vote/chơi/kết thúc; không rò tên, danh sách, vị trí ghế, vai trò hoặc trạng thái giữa các phòng. Đối chiếu test 30 người/phòng, 60 WebSockets PR #48 với nghiệm thu Production; member rời/vào lại nhận đúng phòng, không phát sinh ghost pres"
  },
  {
    "number": 69,
    "title": "P1 — Tập hợp dân làng: chọn tay, hoán đổi, kéo thả vị trí",
    "state": "open",
    "state_reason": null,
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu gốc và tiêu chí rà soát\nYêu cầu: GM có thể chọn người rồi nhấn lá/dấu + để gán, hoặc chọn lá rồi chọn người để gán; nhấn vị trí để hoán đổi A↔B; kéo thả thành viên giữa các vị trí. Hiển thị trạng thái tham gia/Sẵn sàng thích hợp, đồng bộ realtime Player Web, không làm biến mất animation và không cho người chơi tự chiếm chỗ trái quyền GM.\n\n## Trạng thái\nĐang chờ đối c"
  },
  {
    "number": 91,
    "title": "HOÀN TẤT — GMWW V3.32: Xác nhận hoàn thành / Bỏ qua trong Công việc & Tiến độ",
    "state": "closed",
    "state_reason": "completed",
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu người dùng 08/10/2026\nMuốn xác nhận task đã hoàn thành hoặc chủ động bỏ qua từ mục Cài đặt → Công việc & Tiến độ trên server.\n\n## Phạm vi\n- Mỗi công việc đang mở cần 2 thao tác rõ ràng: **Xác nhận hoàn thành** và **Bỏ qua**.\n- Có cảnh báo xác nhận, không click nhầm; phân biệt **Hoàn tất** (closed/completed) với **Bỏ qua** (closed/not_planned) trong Lịch sử.\n- Không c"
  },
  {
    "number": 98,
    "title": "Hoàn thành V3.34 — Thành Viên tinh gọn và đồng bộ Cài Đặt",
    "state": "closed",
    "state_reason": "completed",
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu ngày 08/10/2026\n- Tất cả diễn giải của công việc trong Cài Đặt → Công việc & Tiến độ phải bằng tiếng Việt; vẫn giữ đúng ý nghĩa từng công việc và liên kết nguồn GitHub.\n- Trang Thành Viên sử dụng thiết kế cùng hệ thống với Cài Đặt: các nhóm chức năng có số thứ tự, box kính xanh trong suốt, hiển thị trên một trang cuộn, không phân tab.\n- Giữ nguyên các chức năng tổng "
  },
  {
    "number": 100,
    "title": "Đã hoàn thành — Thu gọn Thành Viên và tối ưu Cài Đặt (V3.35)",
    "state": "closed",
    "state_reason": "completed",
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu ngày 08/10/2026\n- Xếp hạng thành viên: đóng gọn dạng box ẩn; mở khi chạm.\n- Trạng thái thành viên: đèn xanh trực tuyến, đỏ ngoại tuyến.\n- Thu nhỏ tối đa chiều cao mỗi dòng tài khoản, không làm mất các thao tác đặt lại mật khẩu và xóa.\n- Cài Đặt → Cập nhật & đồng bộ: bổ sung thanh tiến trình 0–100% cho đồng bộ/tải dữ liệu, không hiển thị phần trăm ước lượng giả khi ng"
  },
  {
    "number": 75,
    "title": "P1 — Làng 2D toàn màn hình, ban ngày/ban đêm và khu vực di chuyển",
    "state": "closed",
    "state_reason": "completed",
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu đối chiếu\nBảo đảm thế giới làng 2D là không gian chính cho toàn bộ thao tác chứ không là dashboard; màn full-screen, nhân vật/lửa ở sân không ở dưới biển hoặc mái nhà; mở rộng sân chứa tối đa 30 người, cầu dưới còn có thể đi; ngày không có lửa trại, đêm có hiệu ứng lửa phù hợp; không dùng blur cho scene. Nút hành động không cắt Safe Area iPhone.\n\n## Kiểm soát trạng t"
  },
  {
    "number": 74,
    "title": "P1 — Player Web đăng nhập và hiển thị đúng trên laptop, điện thoại",
    "state": "closed",
    "state_reason": "completed",
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu đối chiếu\nYêu cầu 06/10: đăng nhập thành viên phải hoạt động, hiển thị toàn màn hình theo laptop và responsive mobile theo mobile, không ép khung điện thoại ở desktop. Player sau đăng nhập vào sảnh chờ mặc định; đăng nhập/ra/vào lại đúng dữ liệu phòng. Không hiện tên phòng sai thay Làng Asahi; không mất artwork hoặc character.\n\n## Kiểm soát trạng thái\nĐây là hạng mục"
  },
  {
    "number": 73,
    "title": "P1 — Cập nhật popup phiên bản và đồng bộ Runtime/Player Web",
    "state": "closed",
    "state_reason": "completed",
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu gốc và tiêu chí rà soát\nYêu cầu trước đây: khi có runtime/IPA mới, thông báo trong app tương ứng 'cập nhật' hoặc 'cài lại IPA'; nút tải không trỏ bản cũ; cập nhật không vòng lặp, không hiện yêu cầu cài đi cài lại sau khi đã cập nhật. Web phải tự đồng bộ/hướng dẫn refresh phù hợp; đảm bảo cache-bust, trạng thái update manifest, rollback an toàn.\n\n## Trạng thái\nĐang ch"
  },
  {
    "number": 70,
    "title": "P1 — Kiểm tra 24 vị trí lá ngồi không dấu ? và đúng bố cục vòng tròn",
    "state": "closed",
    "state_reason": "completed",
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu gốc và tiêu chí rà soát\nTheo các yêu cầu gần nhất: 24 lá ngồi bố trí trong sân quanh lửa (8 trong, 16 ngoài); icon lá fantasy thay tất cả dấu +/dấu ?, rõ ràng, kích thước hài hòa, không đè nhân vật, không đứng dưới biển và không dùng ghế đồ vật. Vòng làng/cầu/lửa không bị che; test cả ban ngày và ban đêm trên iPhone và laptop.\n\n## Trạng thái\nĐang chờ đối chiếu source"
  },
  {
    "number": 68,
    "title": "P1 — Tập hợp dân làng: gọi toàn bộ thành viên online vào phòng",
    "state": "closed",
    "state_reason": "completed",
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu gốc và tiêu chí rà soát\nTheo yêu cầu ngày 07/10/2026, đổi tên Sắp chỗ ngồi thành TẬP HỢP DÂN LÀNG. Nút Gọi thành viên lấy toàn bộ người đang online trong sảnh chờ vào danh sách phòng, không tự phân ghế ngoài chỉ dẫn. Thành viên Player Web được thông báo khi được gọi/đưa vào phòng; màn người chơi đơn giản, duy trì nút Thoát phòng; kiểm thử đồng thời nhiều thành viên v"
  },
  {
    "number": 67,
    "title": "P1 — Hoàn chỉnh giao diện và chức năng Thiết lập phòng GM",
    "state": "closed",
    "state_reason": "completed",
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu gốc và tiêu chí rà soát\nYêu cầu gần đây: tiêu đề và ô phòng đã tạo gọn; có + thêm phòng; ONLINE/OFFLINE và ON/OFF là các nút cùng phong cách, trình bày cùng hàng và nút Tiếp có icon; bỏ công cụ Số ghế trong UI cuối cùng nếu đã được yêu cầu loại bỏ; chạm một lần để chọn/chỉnh, chạm hai lần mở sửa tên; thao tác Lưu / Reset / Xóa rõ ràng. Không để hai bản giao diện tạo "
  },
  {
    "number": 66,
    "title": "P1 — Hoàn thiện luồng nhiều bước của GM và bước Sảnh chờ",
    "state": "closed",
    "state_reason": "completed",
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu gốc và tiêu chí rà soát\nYêu cầu: luồng tạo phòng / Tập hợp dân làng / các step chuẩn bị game phải có bước Sảnh chờ trong timeline thay vì nút quay về sảnh riêng. Các bước chuyển được tiến/lùi hợp lệ; lúc kết thúc ván quay về sảnh của phòng đang tồn tại, tự trạng thái Sẵn sàng đúng luật; giao diện timeline luôn phản ánh step hiện tại, không làm mất trạng thái trận.\n\n#"
  },
  {
    "number": 65,
    "title": "P1 — Chờ nghiệm thu: đổi vị trí timeline và thanh công cụ Trang Chơi",
    "state": "closed",
    "state_reason": "completed",
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu gốc và tiêu chí rà soát\nYêu cầu 08/10/2026: xoá menu điều hướng dưới hiện tại; chuyển toàn bộ điều khiển Thoát, Auto, Thông tin/trạng thái, Audio, Kết thúc game xuống hàng menu dưới; chuyển timeline các step lên vị trí thanh trên. Menu công cụ dưới phải cùng phong cách box kính mờ, trong nhẹ và cân đối như timeline. Phải kiểm tra trực tiếp cả GM IPA và Player Web tươ"
  },
  {
    "number": 51,
    "title": "P1 — Hoàn thiện Trung tâm vận hành và cảnh báo lỗi (chưa hoàn thành)",
    "state": "closed",
    "state_reason": "completed",
    "updated_at": "",
    "labels": [],
    "body": "## Existing foundation\nGET /api/health/deep and hourly read-only Production monitor are live from PR #46 and #47.\n\n## Remaining product work\n- Add a responsive GM Settings / Health Center view using existing diagnostics and read-only health endpoints.\n- Surface Worker, WebSocket, player presence, room state, Worker/IPA/runtime/update manifest version, and recent failed checks, "
  },
  {
    "number": 84,
    "title": "P2 — Kiểm kê chức năng tối ưu hệ thống và giữ nguyên dữ liệu cũ",
    "state": "closed",
    "state_reason": "completed",
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu đối chiếu\nLịch sử yêu cầu: Cài đặt có 'Tối ưu hoá hệ thống' mặc định bật, gom trang ít dùng để cải thiện hiệu suất; thao tác không xóa LocalStorage/IndexedDB/Blob, sao lưu và duy trì ván mẫu, theme, âm thanh, artwork, thứ tự và thông số khi update/cài đè. Đối chiếu baseline V1.08/V1.09 sang phiên bản mới nếu tính năng/dữ liệu hiện cần dùng.\n\n## Kiểm soát trạng thái\nĐ"
  },
  {
    "number": 52,
    "title": "P2 — Tối ưu hình ảnh, nhân vật chuyển động và bộ nhớ đệm (chưa hoàn thành)",
    "state": "closed",
    "state_reason": "completed",
    "updated_at": "",
    "labels": [],
    "body": "## Existing foundation\nPR #48 tests two 30-player ONLINE/OFFLINE rooms, 60 live WebSockets and forced reset without production writes.\n\n## Work remaining\n- Inventory real transferred bytes of clean 63 role-artwork WebPs, artifact images, 42 chibi images, walk frames and day/night village backgrounds.\n- Keep 3072x2560 canonical artwork masters, preserve the no-nameplate delivery"
  },
  {
    "number": 88,
    "title": "P1 — Kiểm tra bộ artwork vai trò và khung lá bài mới",
    "state": "closed",
    "state_reason": "completed",
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu cần nghiệm thu\nKiểm kê ảnh sạch không bảng tên cho bộ 63 vai và 44 Artifact, bảo đảm khung/tên/phe/mô tả được render bởi app, không cắt tên, viền phe đúng màu và artwork không bị hồi quy do cache. Chất lượng master vai 3072x2560 và thumbnail riêng; đối chiếu trên IPA lẫn Player Web.\n\n## Kết quả cần lưu\nGắn commit/CI và kết quả kiểm thử Production/IPA có thể tái hiện;"
  },
  {
    "number": 89,
    "title": "P1 — Rà soát thư viện, thành viên và lịch sử chơi",
    "state": "closed",
    "state_reason": "completed",
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu cần nghiệm thu\nĐối chiếu tác vụ quản lý người chơi và lịch sử: chỉnh sửa/reset/xóa thành viên đúng quyền, thư viện đủ nhóm Vai trò/Artifact/Phe/Hành động/Hiệu ứng, thống kê số lượng không sai, lịch sử ván đúng dữ liệu, hiển thị tên nhãn đã thống nhất. Các nghiệp vụ hiện có phải được giữ khi tối ưu giao diện.\n\n## Kết quả cần lưu\nGắn commit/CI và kết quả kiểm thử Produ"
  },
  {
    "number": 50,
    "title": "P0 — Bảo mật đăng nhập và quyền GM (chưa hoàn thành)",
    "state": "closed",
    "state_reason": "completed",
    "updated_at": "",
    "labels": [],
    "body": "## Why\nCurrent production still supports passwordless member login and a legacy shared GM credential embedded in runtime code. Admission rate limiting reduces abuse but does not solve identity spoofing.\n\n## Required implementation\n- Design a backward-compatible enrollment/recovery flow (PIN/passkey/OTP subject to gameplay UX), mapping existing member records without deletion.\n-"
  },
  {
    "number": 72,
    "title": "P0 — IPA phát hành đúng phiên bản và kho tải cập nhật thực tế",
    "state": "closed",
    "state_reason": "completed",
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu gốc và tiêu chí rà soát\nĐối chiếu lỗi lịch sử V3.01, 3.11, 3.16, 3.17: phiên bản hiển thị trên trang tải/IPA/native/runtime/Worker phải chính xác, không đóng gói bản cũ; phát hành IPA đúng kho tải, không tên thừa (1), update manifest nhất quán, CI build PASS, cài đè giữ dữ liệu. Phân biệt OTA runtime với bản IPA native cần cài mới; thông báo rõ cho người dùng phải là"
  },
  {
    "number": 83,
    "title": "P0 — Đảm bảo CI/Deploy/Verify Production sau mỗi thay đổi",
    "state": "closed",
    "state_reason": "completed",
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu đối chiếu\nNgười dùng yêu cầu mọi task GMWW chỉ báo hoàn thành khi đã có commit, workflow Validate/Character/Player Web PASS, deploy Cloudflare SUCCESS, verify endpoint/asset/UI Production đúng SHA/release, xác nhận IPA và Player Web đúng phiên bản nếu task liên quan. Kiểm tra lỗi GitHub Actions từng lặp lại và thiết lập chuỗi từ kiểm thử → phát hành → production, khô"
  },
  {
    "number": 85,
    "title": "P0 — Rà soát quy trình OFF, Reset và Xóa phòng",
    "state": "closed",
    "state_reason": "completed",
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu cần nghiệm thu\nNghiệm thu quy tắc tắt/reset phòng: trạng thái phòng phải đúng theo ON/OFF; khi tắt hoặc reset, thành viên quay về sảnh; vào lại không gặp dữ liệu hoặc kết nối phòng cũ. Kiểm tra trên production sau các sửa đổi đã ghi nhận ở V3.18.\n\n## Kết quả cần lưu\nGắn commit/CI và kết quả kiểm thử Production/IPA có thể tái hiện; đóng issue sau khi nghiệm thu."
  },
  {
    "number": 61,
    "title": "P1 — Đang thực hiện: hoàn thiện tư thế ngồi xếp bằng tự nhiên của nhân vật Player Web",
    "state": "closed",
    "state_reason": "completed",
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu người dùng\nNhân vật khi ngồi xếp bằng phải có tư thế thật, không xoạc/chè bè chân, không để chân bị dãn/biến dạng trong lúc chuyển động. Yêu cầu đã được nhắc nhiều lần, cần kiểm tra sản phẩm trực tiếp trước khi kết luận.\n\n## Công việc đang theo dõi\nCác PR triển khai liên quan: #54 và #55. Khi PR được merge và kiểm thử trên Player Web thành công thì mới đóng issue này"
  },
  {
    "number": 64,
    "title": "P0 — Đang thực hiện: kiểm kê đủ mọi yêu cầu GMWW trong Công việc & Tiến độ (08/10/2026)",
    "state": "closed",
    "state_reason": "completed",
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu mới nhất (08/10/2026)\nNgười dùng phát hiện bảng **Cài đặt → Công việc & Tiến độ** chỉ hiển thị 4 việc chưa hoàn thành và 1 lịch sử; yêu cầu đối chiếu toàn bộ các yêu cầu đã giao trong các phiên GMWW, đưa đầy đủ vào bảng, **bao gồm chính task kiểm kê này**.\n\n## Việc cần làm\n- Kiểm kê các task hiện có trên GitHub, đối chiếu backlog từ các cuộc trò chuyện và lịch sử PR/"
  },
  {
    "number": 62,
    "title": "Đã hoàn thành — Gom công cụ Cài Đặt, Lịch sử công việc và giao diện timeline (V3.26)",
    "state": "closed",
    "state_reason": "completed",
    "updated_at": "",
    "labels": [],
    "body": "## Yêu cầu người dùng\n1. Cài Đặt giữ một màn cuộn, công cụ cùng công dụng nằm chung box; không dùng tab.\n2. Xoá Xuất báo cáo; thay bằng Công việc & Tiến độ lấy các việc còn mở, lịch sử hoàn thành phía dưới.\n3. Đồng bộ phong cách nền/box trong suốt của timeline Trang Chơi trên các màn GMWW; không làm mờ nền làng, nhân vật hay artwork.\n\n## Thực hiện\nPR #60 trên nhánh feature/gmww"
  }
];
