# Kiểm toán rule 63 Vai Trò và 44 Artifact — 28/10/2026

Đối chiếu đủ 107 lá trong bản tham chiếu export 18/10 và ưu tiên luật canonical hiện tại. Không có dữ liệu tài khoản/phòng trong bản trích xuất. Không có liên kết Action/Effect bị thiếu; nhiều ID chưa có executor gameplay. Có ID, icon hoặc thông báo không đồng nghĩa hoàn thiện rule.

**Chưa phải nghiệm thu toàn bộ.** Các khoảng trống mô tả rõ vẫn cần xây dựng; không phải tất cả đều chờ người dùng giải thích. Export 18/10 không chứng minh mọi chỉnh sửa mới trên iPhone đã được đối chiếu.

Đã chốt mới: Tiên Tri Hào Quang đọc tên Vai Trò; Tráng Gương/Đá Hoán Đổi cấp lại lượt mới. Mô tả đã đồng bộ; executor sao chép/hoán đổi vẫn chưa xây dựng đầy đủ.

## Vai Trò

| Lá | Action ID | Kết quả/còn thiếu |
| --- | --- | --- |
| Phù Thuỷ Già | action_exile, action_revive | Có executor; chưa chứng nhận mọi tương tác. Xem các test đã chạy trong release notes. |
| Yêu Tinh | action_transfer_bite | Có executor; chưa chứng nhận mọi tương tác. Xem các test đã chạy trong release notes. |
| Sát Thủ | action_assassin_mark | Một phần. Có đánh dấu và phản hồi bí mật; thiếu điều kiện thắng riêng trong computeWinProposal. |
| Thiếu Nữ | action_visit_house | Một phần. Có thăm Sói/chết theo và tránh Cắn khi vắng nhà; chưa xác minh mọi nguồn chết khác. |
| Sói Tuyết | action_snow_wolf_freeze, action_wolf_bite | Có executor; chưa chứng nhận mọi tương tác. Xem các test đã chạy trong release notes. |
| Bảo Vệ | action_protect | Có executor; chưa chứng nhận mọi tương tác. Xem các test đã chạy trong release notes. |
| Sói Trùm | action_wolf_bite | Có executor; chưa chứng nhận mọi tương tác. Xem các test đã chạy trong release notes. |
| Sói Thường | action_wolf_bite | Có executor; chưa chứng nhận mọi tương tác. Xem các test đã chạy trong release notes. |
| Phù Thủy | action_witch_save, action_witch_kill | Có executor; chưa chứng nhận mọi tương tác. Xem các test đã chạy trong release notes. |
| Thợ Săn | action_hunt | Một phần. Có chết liên kết; thiếu kiểm tra chuyên biệt cấm chọn Phe Ba trong gmBattleAction. |
| Nhà Tinh Thần Học | action_compare_faction | Có executor; chưa chứng nhận mọi tương tác. Xem các test đã chạy trong release notes. |
| Say Rượu | action_drunk_draw | Có executor; chưa chứng nhận mọi tương tác. Xem các test đã chạy trong release notes. |
| Kẻ Bị Nguyền | Không có action chủ động | Chưa có executor chuyên biệt. Cần xây dựng thực thi đầy đủ: Bạn là một người dân lương thiện nhưng bị trúng lời nguyền của một Phù Thủy độc ác. Khi bị Sói cắn, bạn không chết và sẽ trở thành Sói vào đêm tiếp theo. Nếu được Bảo Vệ khỏi vết Sói cắn hoặc được Phù Thủy cứu, lời nguyền không kích hoạt và bạn vẫn là Dân Làng. |
| Du Côn | action_stab | Có executor; chưa chứng nhận mọi tương tác. Xem các test đã chạy trong release notes. |
| Chân To | Không có action chủ động | Chưa có executor chuyên biệt. Cần xây dựng thực thi đầy đủ: Ban đầu bạn thuộc Phe Dân. Nếu ngày đầu tiên không có ai bị treo cổ, bạn trở thành Sói và tham gia Sói Cắn từ đêm tiếp theo. |
| Kẻ Thổi Sáo | action_scan_three | Có executor; chưa chứng nhận mọi tương tác. Xem các test đã chạy trong release notes. |
| Sói Tiên Tri | action_find_seer | Một phần. Có Soi Tiên Tri; mô tả cũ không Cắn chung bị thay bởi luật canonical cho Cắn chung. |
| Sói Con | action_wolf_bite | Một phần. Có Cắn chung; chưa có hai mục tiêu Cắn đúng một đêm sau cái chết. |
| Sói Thợ Săn | action_wolf_bite, action_hunter_mark | Một phần. Có Cắn chung; chưa có đánh dấu/chết liên kết/chọn lại khi mục tiêu chết; hunterLinkedDeaths không nhận Sói Thợ Săn. |
| Tiên Tri | action_seer | Có executor; chưa chứng nhận mọi tương tác. Xem các test đã chạy trong release notes. |
| Dân Làng | Không có action chủ động | Không cần action chủ động.  |
| Kẻ Huỷ Diệt | action_destroyer_scry, action_destroyer_kill | Có executor; chưa chứng nhận mọi tương tác. Xem các test đã chạy trong release notes. |
| Nhân Bản | action_clone_target | Một phần. Có kế thừa từ đêm sau; chưa xác minh đầy đủ quota/trạng thái sử dụng của nguồn. |
| Tiên Tri Hào Quang | action_aura_read | Có executor; chưa chứng nhận mọi tương tác. Xem các test đã chạy trong release notes. |
| Hiệp Sĩ | action_knight_last_strike | Có executor; chưa chứng nhận mọi tương tác. Xem các test đã chạy trong release notes. |
| Hồ Ly | action_fox_scan | Có executor; chưa chứng nhận mọi tương tác. Xem các test đã chạy trong release notes. |
| Thần Gấu | action_bear_scan | Có executor; chưa chứng nhận mọi tương tác. Xem các test đã chạy trong release notes. |
| Kẻ Trộm | action_thief_change_role | Chưa có executor chuyên biệt. Cần xây dựng thực thi đầy đủ: Từ đêm 3 được chọn 1 lá Vai Trò trong bộ bài để đổi vai trò hoặc không đổi, khi đổi thì các thông tin chức năng, điều kiện thắng thay đổi theo vai trò mới |
| Oan Nhân | action-grudge-designate | Chưa có executor chuyên biệt. Cần xây dựng thực thi đầy đủ: Vào buổi sáng khi bị lên giàn treo cổ, nếu bạn bị vote chết, bạn có quyền chọn 1 người chơi khác chết vào sáng hôm sau. Nếu mục tiêu chết trước thời điểm xử lý, hiệu ứng bị hủy. |
| Tiên Tri Tập Sự | action-apprentice-seer-inherit | Chưa có executor chuyên biệt. Cần xây dựng thực thi đầy đủ: Bạn thuộc Phe Dân Làng. Khi tất cả Tiên Tri trong ván đã chết, nếu bạn vẫn còn sống, bạn sẽ kế nhiệm thành Tiên Tri và bắt đầu sử dụng chức năng từ đêm kế tiếp. Nếu ván bắt đầu không có Tiên Tri, bạn kế nhiệm ngay từ Đêm 1. Tiên Tri được hồi sinh sau đó không làm mất chức năng đã kế nhiệm. |
| Cupid | action-cupid-pair | Chưa có executor chuyên biệt. Cần xây dựng thực thi đầy đủ: Đêm đầu tiên, bạn chọn hai người để ghép thành một cặp tình nhân. Bạn có thể chọn chính mình. Hai người được ghép sẽ trở thành Phe Ba và có sinh mạng liên kết. |
| Già Làng | 18 | Đã chốt: 2 mạng, trong 4 đêm đầu Rung Chuông chặn mọi tác động gây chết trong đêm, mỗi lần mất 1 mạng, còn 0 mạng thì chết. **Chưa có executor bảo vệ toàn đêm, trừ mạng và xử lý chết.** |
| Kẻ Ngốc | action-fool-escape | Chưa có executor chuyên biệt. Cần xây dựng thực thi đầy đủ: Nếu bạn bị Treo Cổ lần đầu, bạn không chết nhưng sẽ mất quyền bỏ phiếu đến hết ván. Nếu bị Treo Cổ lần nữa, bạn sẽ chết. |
| Cô Bé Ti Hí | action-peek | Chưa có executor chuyên biệt. Cần xây dựng thực thi đầy đủ: Từ Đêm 1, mỗi đêm bạn có thể Hí Mắt để quan sát những Sói thức dậy trong đêm đó. Bầy Sói quyết định trên Player Web bạn có bị phát hiện hay không. Nếu bị phát hiện, bạn chết ngay; Bảo Vệ và Bất Tử Ban Đêm không ngăn được cái chết này. |
| Trưởng Phái | 25 | Chưa có executor chuyên biệt. Cần xây dựng thực thi đầy đủ: Mỗi đêm, bạn chọn một người chơi khác để kết nạp thành Giáo Dân. Người được kết nạp giữ Phe hiện tại và nhận trạng thái Giáo Dân. Khi bạn chết, tất cả Giáo Dân do bạn kết nạp sẽ chết theo. Giáo Dân chết không ảnh hưởng đến bạn. |
| Ba Anh Em | action-three-brothers-recognize | Chưa có executor chuyên biệt. Cần xây dựng thực thi đầy đủ: Bạn thuộc Phe Dân Làng. Trong đêm đầu tiên, bạn sẽ nhận biết hai người chơi còn lại mang vai trò Ba Anh Em. Sau đó bạn không có chức năng chủ động. |
| Kỵ Sỹ | action-knight-stab | Chưa có executor chuyên biệt. Cần xây dựng thực thi đầy đủ: Bạn thuộc Phe Dân Làng. Một lần trong cả ván, vào ban ngày, bạn có thể công khai vai trò Kỵ Sỹ và chọn một người chơi khác còn sống để Đâm. Nếu mục tiêu thuộc Phe Sói, mục tiêu chết; nếu chọn sai, bạn chết. Vai trò của mục tiêu không bị công khai. |
| Kẻ Báo Thù | action-avenger-target | Chưa có executor chuyên biệt. Cần xây dựng thực thi đầy đủ: Trong đêm đầu tiên, bạn chọn một người chơi khác làm mục tiêu. Phe của bạn thay đổi theo phe hiện tại của người đó và bạn thắng theo phe đang có. Bạn không thể đổi mục tiêu. Nếu mục tiêu chết, bạn giữ nguyên phe tại thời điểm đó. |
| Con Bệnh | action-disease-self | Chưa có executor chuyên biệt. Cần xây dựng thực thi đầy đủ: Bạn thuộc Phe Dân Làng. Trong đêm đầu tiên, bạn được chọn một người chơi còn sống, kể cả chính mình, để gắn trạng thái Bị Bệnh. Trạng thái này tồn tại đến khi được chữa hoặc kết thúc ván và không tự gây chết hay ngăn sử dụng chức năng. |
| Lực Sỹ | action-strongman-bite | Chưa có executor chuyên biệt. Cần xây dựng thực thi đầy đủ: Bạn thuộc Phe Dân Làng. Bạn có khả năng sống sót qua một lần Sói Cắn có thể gây chết trong cả ván. Nếu Bảo Vệ đã ngăn chặn vết cắn, khả năng của bạn sẽ không bị tiêu hao. Khi khả năng kích hoạt, danh tính Lực Sỹ được công khai. |
| Người Loan Tin | action-news-role | Chưa có executor chuyên biệt. Cần xây dựng thực thi đầy đủ: Mỗi đêm, bạn chọn một người chơi khác để Loan Tin. Bạn không được chọn cùng một người trong hai đêm liên tiếp. Sáng hôm sau, vai trò của người được chọn tại thời điểm bạn sử dụng chức năng sẽ được công bố, kể cả khi người đó đã chết hoặc đổi vai trò. |
| Thẩm Phán | action-judge-double | Chưa có executor chuyên biệt. Cần xây dựng thực thi đầy đủ: Bạn thuộc Phe Dân Làng. Một lần trong cả ván, trước phiên Treo Cổ đầu tiên của một ngày, bạn có thể kích hoạt Phán Quyết Kép. Sau phiên Treo Cổ đầu tiên, cả làng sẽ tiến hành thêm một phiên bỏ phiếu và Treo Cổ đầy đủ. |
| Hầu Gái | action-maid-inherit | Chưa có executor chuyên biệt. Cần xây dựng thực thi đầy đủ: Bạn thuộc Phe Dân Làng. Sau khi một người bị Treo Cổ, bạn có thể nhận vai trò của người đó. Khi kế thừa, bạn nhận cả phe, điều kiện thắng, chức năng và trạng thái sử dụng chức năng của người bị Treo Cổ. |
| Cô Gái Digan | action-digan-scry | Có executor; chưa chứng nhận mọi tương tác. Xem các test đã chạy trong release notes. |
| Hoàng Tử | action-g7-prince-stab | Chưa có executor chuyên biệt. Cần xây dựng thực thi đầy đủ: Bạn thuộc Phe Dân Làng. Một lần trong cả ván, vào ban ngày, bạn có thể công khai vai trò Hoàng Tử và chọn một người chơi khác còn sống để Đâm. Nếu mục tiêu thuộc Phe Sói hoặc Phe Ba, mục tiêu chết. Nếu mục tiêu thuộc Phe Dân Làng, bạn sẽ chết. |
| Con Quạ | action-g7-crow-votes | Chưa có executor chuyên biệt. Cần xây dựng thực thi đầy đủ: Bạn thuộc Phe Dân Làng. Mỗi đêm, bạn được chọn một người chơi khác còn sống. Trong phiên bỏ phiếu Treo Cổ ngày hôm sau, người đó tự động nhận thêm 2 phiếu bất lợi. Bạn có thể chọn cùng một người trong những đêm liên tiếp. |
| Tiên Tri Thối | action-rotten-seer-check | Có executor; chưa chứng nhận mọi tương tác. Xem các test đã chạy trong release notes. |
| Bà Da Đen | action-black-woman-leave | Chưa có executor chuyên biệt. Cần xây dựng thực thi đầy đủ: Bạn thuộc Phe Dân Làng. Mỗi đêm, bạn chọn một người chơi khác còn sống để buộc họ rời làng vào ngày hôm sau. Người rời làng không được bỏ phiếu, sử dụng chức năng hoặc bị người khác chọn trong ngày đó. Họ sẽ trở lại khi đêm tiếp theo bắt đầu. Bạn không được chọn cùng một người trong hai đêm liên tiếp. |
| Ông Già | action-old-man-lifespan | Chưa có executor chuyên biệt. Cần xây dựng thực thi đầy đủ: Phe Dân. Đêm chết = tổng số Người Chơi thuộc Phe Sói lúc bắt đầu ván + 1. Cái chết do tuổi già xuyên Bảo Vệ và Bất Tử Ban Đêm nhưng vẫn có thể được Hồi Sinh. Sau khi được Hồi Sinh, Ông Già không chết lại do tuổi già. |
| Người Yêu Hòa Bình | action-peace-lover-save | Chưa có executor chuyên biệt. Cần xây dựng thực thi đầy đủ: Phe Dân. Trong mọi phiên bỏ phiếu/Treo Cổ ban ngày, kể cả phiên thứ hai do Thẩm Phán, Người Yêu Hòa Bình chỉ được biểu quyết CỨU. Phiếu CỨU được ghi nhận riêng và không tính vào phiếu Treo Cổ. |
| Hồn Ma | action-ghost-message | Chưa có executor chuyên biệt. Cần xây dựng thực thi đầy đủ: Phe Dân. Sau khi chết, mỗi ngày được nhập đúng 1 từ trên Player Web làm manh mối về Phe, chức năng hoặc Sói/Không Sói. Không được nhắc tên Người Chơi; GM duyệt trước khi công bố. Nếu vi phạm sẽ mất quyền gửi thông điệp đến hết ván. |
| Bác Sỹ Điên | action-mad-doctor-cure | Chưa có executor chuyên biệt. Cần xây dựng thực thi đầy đủ: Phe Dân. Có một Bình Cứu dùng 1 lần/ván vào ban đêm để Giải Độc trạng thái Bị Bệnh do Con Bệnh gây ra. Chọn 1 người và được chọn bản thân; sau khi giải độc mục tiêu trở lại bình thường. |
| Sói Quỷ | action-demon-wolf-convert | Chưa có executor chuyên biệt. Cần xây dựng thực thi đầy đủ: Phe Sói. Tối đa 3 lần/ván, Sói Quỷ kích hoạt Cắn Chuyển Hóa trên Player Web; GM xác nhận để thay thế Sói Cắn chung. Mục tiêu không chết, giữ Vai Trò và trạng thái sống; đêm kế tiếp chuyển sang Phe Sói. |
| Sói Lửa | action_wolf_bite, action-fire-wolf-bite | Một phần. Có Cắn chung; thiếu Lửa Lan khi là Sói duy nhất, người sát bên và chết sáng hai ngày sau. |
| Lang Huynh Đệ | action_wolf_bite, action-wolf-brother-bite | Một phần. Có Cắn chung; thiếu thay chết bằng chuyển phe đêm sau khi là Sói duy nhất. |
| Lycan | action-lycan-hidden, action_wolf_bite | Một phần. Đã sửa soi ra không Sói; chưa chặn thức/nhập đàn tới đêm sau khi mọi Sói khác chết. |
| Người Sói | action-human-wolf-mark | Có executor; chưa chứng nhận mọi tương tác. Xem các test đã chạy trong release notes. |
| Sói Lạc Bầy | action-lone-wolf-join, action_wolf_bite | Một phần. Có Cắn chung; chưa chặn nhận biết/Cắn ở đêm 1–2 và nhập đàn đêm 3. |
| Sói Đá | action_wolf_bite, action-stone-wolf-life | Một phần. Có Cắn chung; thiếu mạng Da Đá chặn một nguồn chết trừ Treo Cổ. |
| Con Hoang | action-wild-child-idol | Chưa có executor chuyên biệt. Cần xây dựng thực thi đầy đủ: Phe Dân ban đầu. Đầu game chọn 1 Hình Tượng. Khi Hình Tượng chết, Con Hoang lập tức chuyển sang Phe Sói nhưng giữ nguyên Vai Trò. Nếu chuyển phe trong đêm, Con Hoang tham gia Cắn từ đêm kế tiếp. |
| Sói Lai | action_wolf_bite, action-hybrid-wolf-switch | Một phần. Đã tôn trọng phe hiện tại trong nhận biết đàn; chưa có chuyển Dân đầu Đêm 5/thu hồi quyền đàn. |
| Vampire | action-vampire-check | Có executor; chưa chứng nhận mọi tương tác. Xem các test đã chạy trong release notes. |
| Tà Đạo | action-cult-add, action-cult-kill, action-cult-death-link | Chưa có executor chuyên biệt. Cần xây dựng thực thi đầy đủ: Phe Ba. Từ Đêm 1, trong 5 đêm đầu mỗi đêm chọn Thêm 1 thành viên Tà Đạo hoặc Giết 1 người. Người gia nhập mất chức năng hiện tại. Sau Đêm 5 không tuyển thêm nhưng vẫn được Giết. Khi Tà Đạo chết, toàn bộ thành viên chết theo. Thắng khi các phe còn lại bị tiêu diệt hết. |

## Artifact

| Lá | Action ID | Kết quả/còn thiếu |
| --- | --- | --- |
| Hổ Phách Bình Minh | artifact_action_reclaim | Chưa hoàn thiện executor chuyên biệt. Thiếu thu hồi lá đã dùng và phát lá mới. |
| Bùa Hộ Mệnh | action_protect | Chưa hoàn thiện executor chuyên biệt. Thiếu chuyển chủ mỗi bình minh và bảo vệ đúng người giữ/thời hạn. |
| Thạch Anh Tri Thức | artifact_action_view | Chưa hoàn thiện executor chuyên biệt. Thiếu xem riêng lá chưa lật và yêu cầu chủ lật trên Player Web. |
| Máu Dịch Bệnh | action-disease-self | Chưa hoàn thiện executor chuyên biệt. Thiếu nhiễm bệnh và sự kiện Cắn chết khiến đàn mất Cắn đêm sau. |
| Cung Săn Mệnh | action-grudge-designate | Chưa hoàn thiện executor chuyên biệt. Thiếu yêu cầu mục tiêu chỉ định nạn nhân và xử lý phản hồi. |
| Ấn Dân Làng | artifact_action_disable_function | Chưa hoàn thiện executor chuyên biệt. Thiếu khóa chức năng và thu hồi quyền đã phát. |
| Hơi Thở Lão Già | action-grudge-designate | **Đã có executor Server ngày/đêm:** đánh dấu tại chu kỳ N, chỉ giải quyết chết vào bình minh sau đêm N+1, tôn trọng miễn nhiễm/Đuổi, giữ idempotent và hoàn tác ban đêm. Chờ nghiệm thu trên thiết bị. |
| Mũ Ngốc | artifact_action_force_vote | Chưa hoàn thiện executor chuyên biệt. Thiếu cưỡng chế phiếu GIẾT trên Server. |
| Vạc Ma Thuật | artifact_action_check_villager | Chưa hoàn thiện executor chuyên biệt. Thiếu xác nhận Dân thường và kết quả riêng. |
| Ngọc May Mắn | artifact_action_exchange | Chưa hoàn thiện executor chuyên biệt. Thiếu đổi lá/kích hoạt lá mới trong cùng chuỗi giao dịch. |
| Vuốt Sói | action-lone-wolf-join | Chưa hoàn thiện executor chuyên biệt. Thiếu nhập Phe Sói giữ chức năng gốc. |
| Áo Choàng Hoàng Tử | action-fool-escape | Chưa hoàn thiện executor chuyên biệt. Thiếu miễn chết do Treo Cổ; không tương đương Kẻ Ngốc một lần. |
| Đồng Xu Tuổi Trẻ | artifact_action_reveal_role | Đã chốt: không công bố Vai Trò thật thì chết. **Chưa có executor theo dõi công bố và giải quyết hậu quả.** |
| Gậy Mụ Già | action-black-woman-leave | Chưa hoàn thiện executor chuyên biệt. Thiếu rời làng đúng ngày, khóa quyền và tự trở về. |
| Kim Cương Phủ Nhận | artifact_action_negate | **Đã có executor Server Ban Ngày:** chỉ thu hồi Artifact dùng không giới hạn đã thực sự kích hoạt; tombstone chống tái xuất hiện sau reconnect, chặn tiếp tục sử dụng, không xóa lịch sử. Hiệu ứng đã thực thi trước đó không bị hồi tố. Chưa nghiệm thu GM/Player Web trên thiết bị. |
| Nhật Ký Mất Ngủ | artifact_action_check_awake | Chưa hoàn thiện executor chuyên biệt. Thiếu lịch sử ai thực sự thức và xác định hàng xóm. |
| Ngọc Ghen Tuông | artifact_action_steal | Chưa hoàn thiện executor chuyên biệt. Thiếu đổi chủ lá chưa lật/cấp lá mới/ledger theo chủ. |
| Mắt Tiên Tri | action_find_seer | Chưa hoàn thiện executor chuyên biệt. Thiếu gắn vào lượt Tiên Tri/chia sẻ cùng kết quả; action_find_seer hiện không đúng ý nghĩa này. |
| Bình Giấc Mơ | artifact_action_lock_function | **Đã có executor Server ngày/đêm:** tạo trạng thái disabled_2n chặn vai trò, tự hết hạn sau 2 chu kỳ ngày/đêm, kiểm tra sở hữu/quota và rollback đêm. Cần nghiệm thu GM/Player Web trên thiết bị trước phát hành. |
| Trái Tim Vô Tâm | artifact_action_block_vote | Chưa hoàn thiện executor chuyên biệt. Có vote_ban Ban Ngày; cần hoàn thiện flow bình minh và giới hạn sở hữu. |
| Ấn Thị Trưởng | artifact_action_double_vote | Chưa hoàn thiện executor chuyên biệt. Thiếu trọng số hai phiếu trong gallows. |
| Mặt Nạ Câm Lặng | artifact_action_silence | Chưa hoàn thiện executor chuyên biệt. Thiếu Câm và khóa quyền nói đúng ngày. |
| Tráng Gương | artifact_action_copy_function | Chưa hoàn thiện executor chuyên biệt. Đã chốt cấp lại lượt mới; còn thiếu executor sao chép thêm chức năng số 2. |
| Sương Hào Quang | artifact_action_check_third_faction | Chưa hoàn thiện executor chuyên biệt. Thiếu kiểm tra/xác nhận Phe Ba. |
| Hắc Ngọc Hủy Diệt | artifact_action_destroy | Chưa hoàn thiện executor chuyên biệt. Thiếu hủy bí mật lá chưa lật/thu hồi action. |
| Quả Cầu Phán Đoán | artifact_action_judge_two_wolves | Chưa hoàn thiện executor chuyên biệt. Thiếu hai Sói→Dân thắng; sai→chủ chết. |
| Mặt Dây Chuyền Kiêu Hãnh | action-ghost-message | Chưa hoàn thiện executor chuyên biệt. Thiếu chia sẻ riêng vai thật của chủ; không tương đương Hồn Ma. |
| Lăng Kính Quyền Năng | artifact_action_limit_wolf_targets | Chưa hoàn thiện executor chuyên biệt. Thiếu ràng buộc Cắn vào đúng ba người và thời hạn. |
| Nhẫn Sự Thật | action_seer | Chưa hoàn thiện executor chuyên biệt. Thiếu xác nhận Sói đúng nghĩa Artifact trong day handler. |
| Trượng Luân Hồi | action-maid-inherit | Đã chốt: khi chết sử dụng Artifact để hồi sinh, giữ nguyên Vai Trò trước khi chết. **Chưa có executor hồi sinh tại trigger chết.** |
| Hồng Ngọc Cơ Duyên | artifact_action_activate_two | Chưa hoàn thiện executor chuyên biệt. Thiếu chuỗi lần lượt lật và giải quyết hai Artifact. |
| Lam Ngọc Định Mệnh | artifact_action_link | Đã chốt: sao chép Artifact người khác và được dùng cùng. **Chưa có executor cấp bản sao và giải quyết hai người sử dụng.** |
| Quyền Trượng Phục Sinh | action_revive | Chưa hoàn thiện executor chuyên biệt. Thiếu tự hồi sinh khi bị loại; noTarget hiện mâu thuẫn validation yêu cầu mục tiêu chết. |
| Khăn Hồn Ma | action-ghost-message | Chưa hoàn thiện executor chuyên biệt. Thiếu nhập một chữ cái từ người bị loại hôm trước. |
| Khiên Bảo Hộ | action_protect | Chưa hoàn thiện executor chuyên biệt. Thiếu lưu bảo vệ đêm kế tiếp; không dùng effect_notice ban ngày như bảo vệ đêm. |
| Khăn Choàng Hổ Thẹn | artifact_action_turn_away | Chưa hoàn thiện executor chuyên biệt. Thiếu quay mặt và xác định quyền bị khóa. |
| Khăn Choàng Nguyền Rủa | action-demon-wolf-convert | Chưa hoàn thiện executor chuyên biệt. Thiếu chặn Cắn chết/chuyển Sói/tiêu hao đúng một lần. |
| Thương Cuồng Nộ | action_witch_kill | Chưa hoàn thiện executor chuyên biệt. Có Giết qua effect_kill; thiếu công khai vai chủ. |
| Trượng Tiên Tri | action_destroyer_scry | Chưa hoàn thiện executor chuyên biệt. Thiếu soi riêng Vai Trò trong day handler. |
| Đá Hoán Đổi | artifact_action_swap_role | Chưa hoàn thiện executor chuyên biệt. Đã chốt cấp lại lượt mới; còn thiếu executor hoán đổi hai vai/phe/quyền/snapshot/timeline. |
| Bùa Tai Ương | action-judge-double | Chưa hoàn thiện executor chuyên biệt. Thiếu phiên Treo Cổ thứ hai đầy đủ. |
| Hư Không Vô Tận | artifact_action_custom | Đã chốt: GM giao luật và xử lý thủ công khi Offline. **Không tự động thực thi luật chưa được GM giao.** |
| Lá Phiếu Âm Giới | artifact_action_dead_vote | Chưa hoàn thiện executor chuyên biệt. Thiếu cho người chết bỏ phiếu; đã sửa nguy cơ hiểu dead_vote thành kill. |
| Vòng Hoa Hòa Bình | action-peace-lover-save | Chưa hoàn thiện executor chuyên biệt. Thiếu cấm phiếu GIẾT đúng chủ và thời hạn; không tương đương cấm mọi phiếu. |

## Các luật vừa chốt (28/10) — còn thiếu executor

Già Làng: 2 mạng, Rung Chuông chặn mọi chết đêm đó, mất 1 mạng/lần, 0 mạng thì chết; Hơi Thở Lão Già: đánh dấu, chết đêm hôm sau; Bình Giấc Mơ: khóa 2 ngày đêm; Đồng Xu Tuổi Trẻ: không công bố Vai Trò thì chết; Kim Cương Phủ Nhận: loại Artifact dùng mãi mãi đã sử dụng khỏi ván; Trượng Luân Hồi: hồi sinh khi chết với Vai Trò cũ; Lam Ngọc Định Mệnh: sao chép Artifact để dùng cùng; Hư Không Vô Tận: GM tự giao luật khi chơi Offline.

Đã đồng bộ thông tin lá/function trong migration, nhưng **chưa** xác nhận các tác động/gameplay nêu trên hoạt động. Các mốc/chi tiết chưa chốt rõ không được tự suy diễn thành rule engine.

## Các hạn chế chung còn lại

Cooldown/trigger, mạng phụ, nhiều lần kế thừa, quota các chức năng độc lập của Artifact và điều kiện thắng đặc biệt chưa hoàn chỉnh. Giữ field trong payload không đồng nghĩa đã thực thi. Các executor chưa có ở Ban Ngày trả lỗi rõ ràng thay vì trừ lượt/báo thành công giả. Nhánh đã được push qua kết nối GitHub; chưa CI SUCCESS/Server/Production/iPhone.
