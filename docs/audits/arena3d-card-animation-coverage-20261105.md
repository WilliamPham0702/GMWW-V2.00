# Arena 3D — Đối chiếu 107 lá với hoạt ảnh 3D (05/11/2026)

Nguồn: `docs/audits/card-rule-catalog-20261028.json` (Core, 28/10) đối chiếu `CORE_ACTION_FAMILY` ở `stage11-core-action-bridge.mjs` trên HEAD nhánh 3D.

**Chỉ đo độ phủ HOẠT ẢNH 3D theo mã hành động. Đây KHÔNG phải chứng nhận gameplay parity** (chưa kiểm điều kiện, tương tác chéo, undo, reconnect, quyền xem từng lá). Chưa chạy trên trình duyệt hay iPhone.

| Nhóm | Tổng | Đủ 3D | Thiếu 3D | Thụ động |
|---|---|---|---|---|
| Vai trò | 63 | 25 | 35 | 3 |
| Artifact | 44 | 7 | 37 | 0 |

Trạng thái executor theo Core: 21 có executor nhưng chưa chứng nhận mọi tương tác; 13 một phần; 27 chưa có executor chuyên biệt; 37 chưa hoàn thiện executor chuyên biệt; 8 đã chốt mô tả chưa hoàn thiện; 1 không cần action chủ động.

| Loại | Mã lá | Tên | 3D | Trạng thái Core | Mã hành động chưa có hoạt ảnh |
|---|---|---|---|---|---|
| Vai | role_old_witch | Phù Thuỷ Già | Đủ 3D | Có executor; chưa chứng nhận mọi tương tác | — |
| Vai | role_fairy | Yêu Tinh | Đủ 3D | Có executor; chưa chứng nhận mọi tương tác | — |
| Vai | role_assassin | Sát Thủ | Đủ 3D | Một phần | — |
| Vai | role_maiden | Thiếu Nữ | Đủ 3D | Một phần | — |
| Vai | role_snow_wolf | Sói Tuyết | Đủ 3D | Có executor; chưa chứng nhận mọi tương tác | — |
| Vai | role_guard | Bảo Vệ | Đủ 3D | Có executor; chưa chứng nhận mọi tương tác | — |
| Vai | role_alpha_wolf | Sói Trùm | Đủ 3D | Có executor; chưa chứng nhận mọi tương tác | — |
| Vai | role_wolf | Sói Thường | Đủ 3D | Có executor; chưa chứng nhận mọi tương tác | — |
| Vai | role_witch | Phù Thủy | Đủ 3D | Có executor; chưa chứng nhận mọi tương tác | — |
| Vai | role_hunter | Thợ Săn | Đủ 3D | Một phần | — |
| Vai | role_spiritualist | Nhà Tinh Thần Học | Đủ 3D | Có executor; chưa chứng nhận mọi tương tác | — |
| Vai | role_drunk | Say Rượu | Đủ 3D | Có executor; chưa chứng nhận mọi tương tác | — |
| Vai | role_cursed | Kẻ Bị Nguyền | Thụ động | Chưa có executor chuyên biệt | — |
| Vai | role_thug | Du Côn | Đủ 3D | Có executor; chưa chứng nhận mọi tương tác | — |
| Vai | role_bigfoot | Chân To | Thụ động | Chưa có executor chuyên biệt | — |
| Vai | role_piper | Kẻ Thổi Sáo | Đủ 3D | Có executor; chưa chứng nhận mọi tương tác | — |
| Vai | role_wolf_seer | Sói Tiên Tri | Đủ 3D | Một phần | — |
| Vai | role_wolf_cub | Sói Con | Đủ 3D | Một phần | — |
| Vai | role_wolf_hunter | Sói Thợ Săn | Đủ 3D | Một phần | — |
| Vai | role_seer | Tiên Tri | Đủ 3D | Có executor; chưa chứng nhận mọi tương tác | — |
| Vai | role_villager | Dân Làng | Thụ động | Không cần action chủ động | — |
| Vai | role_destroyer | Kẻ Huỷ Diệt | Đủ 3D | Có executor; chưa chứng nhận mọi tương tác | — |
| Vai | role_clone | Nhân Bản | Đủ 3D | Một phần | — |
| Vai | role_aura_seer | Tiên Tri Hào Quang | Đủ 3D | Có executor; chưa chứng nhận mọi tương tác | — |
| Vai | role_knight | Hiệp Sĩ | Đủ 3D | Có executor; chưa chứng nhận mọi tương tác | — |
| Vai | role_fox | Hồ Ly | Đủ 3D | Có executor; chưa chứng nhận mọi tương tác | — |
| Vai | role_bear_god | Thần Gấu | Đủ 3D | Có executor; chưa chứng nhận mọi tương tác | — |
| Vai | role_thief | Kẻ Trộm | Đủ 3D | Chưa có executor chuyên biệt | — |
| Vai | role_grudge_victim | Oan Nhân | THIẾU 3D | Chưa có executor chuyên biệt | action-grudge-designate |
| Vai | role_apprentice_seer | Tiên Tri Tập Sự | THIẾU 3D | Chưa có executor chuyên biệt | action-apprentice-seer-inherit |
| Vai | role_cupid | Cupid | THIẾU 3D | Chưa có executor chuyên biệt | action-cupid-pair |
| Vai | role_elder | Già Làng | THIẾU 3D | Đã chốt mô tả; chưa hoàn thiện executor | 18 |
| Vai | role_fool | Kẻ Ngốc | THIẾU 3D | Chưa có executor chuyên biệt | action-fool-escape |
| Vai | role_peeking_girl | Cô Bé Ti Hí | THIẾU 3D | Chưa có executor chuyên biệt | action-peek |
| Vai | role_sect_leader | Trưởng Phái | THIẾU 3D | Chưa có executor chuyên biệt | 25 |
| Vai | role_three_brothers | Ba Anh Em | THIẾU 3D | Chưa có executor chuyên biệt | action-three-brothers-recognize |
| Vai | role_cavalier | Kỵ Sỹ | THIẾU 3D | Chưa có executor chuyên biệt | action-knight-stab |
| Vai | role_avenger | Kẻ Báo Thù | THIẾU 3D | Chưa có executor chuyên biệt | action-avenger-target |
| Vai | role_diseased | Con Bệnh | THIẾU 3D | Chưa có executor chuyên biệt | action-disease-self |
| Vai | role_strongman | Lực Sỹ | THIẾU 3D | Chưa có executor chuyên biệt | action-strongman-bite |
| Vai | role_news_bearer | Người Loan Tin | THIẾU 3D | Chưa có executor chuyên biệt | action-news-role |
| Vai | role_judge | Thẩm Phán | THIẾU 3D | Chưa có executor chuyên biệt | action-judge-double |
| Vai | role_maid | Hầu Gái | THIẾU 3D | Chưa có executor chuyên biệt | action-maid-inherit |
| Vai | role_digan_girl | Cô Gái Digan | THIẾU 3D | Có executor; chưa chứng nhận mọi tương tác | action-digan-scry |
| Vai | role_prince | Hoàng Tử | THIẾU 3D | Chưa có executor chuyên biệt | action-g7-prince-stab |
| Vai | role_crow | Con Quạ | THIẾU 3D | Chưa có executor chuyên biệt | action-g7-crow-votes |
| Vai | role_rotten_seer | Tiên Tri Thối | THIẾU 3D | Có executor; chưa chứng nhận mọi tương tác | action-rotten-seer-check |
| Vai | role_black_woman | Bà Da Đen | THIẾU 3D | Chưa có executor chuyên biệt | action-black-woman-leave |
| Vai | role_old_man | Ông Già | THIẾU 3D | Chưa có executor chuyên biệt | action-old-man-lifespan |
| Vai | role_peace_lover | Người Yêu Hòa Bình | THIẾU 3D | Chưa có executor chuyên biệt | action-peace-lover-save |
| Vai | role_ghost | Hồn Ma | THIẾU 3D | Chưa có executor chuyên biệt | action-ghost-message |
| Vai | role_mad_doctor | Bác Sỹ Điên | THIẾU 3D | Chưa có executor chuyên biệt | action-mad-doctor-cure |
| Vai | role_demon_wolf | Sói Quỷ | THIẾU 3D | Chưa có executor chuyên biệt | action-demon-wolf-convert |
| Vai | role_fire_wolf | Sói Lửa | THIẾU 3D | Một phần | action-fire-wolf-bite |
| Vai | role_wolf_brother | Lang Huynh Đệ | THIẾU 3D | Một phần | action-wolf-brother-bite |
| Vai | role_lycan | Lycan | THIẾU 3D | Một phần | action-lycan-hidden |
| Vai | role_human_wolf | Người Sói | THIẾU 3D | Có executor; chưa chứng nhận mọi tương tác | action-human-wolf-mark |
| Vai | role_lone_wolf | Sói Lạc Bầy | THIẾU 3D | Một phần | action-lone-wolf-join |
| Vai | role_stone_wolf | Sói Đá | THIẾU 3D | Một phần | action-stone-wolf-life |
| Vai | role_wild_child | Con Hoang | THIẾU 3D | Chưa có executor chuyên biệt | action-wild-child-idol |
| Vai | role_hybrid_wolf | Sói Lai | THIẾU 3D | Một phần | action-hybrid-wolf-switch |
| Vai | role_vampire | Vampire | THIẾU 3D | Có executor; chưa chứng nhận mọi tương tác | action-vampire-check |
| Vai | role_cult | Tà Đạo | THIẾU 3D | Chưa có executor chuyên biệt | action-cult-add, action-cult-kill, action-cult-death-link |
| Artifact | artifact_01 | Hổ Phách Bình Minh | THIẾU 3D | Chưa hoàn thiện executor chuyên biệt | artifact_action_reclaim |
| Artifact | artifact_02 | Bùa Hộ Mệnh | Đủ 3D | Chưa hoàn thiện executor chuyên biệt | — |
| Artifact | artifact_03 | Thạch Anh Tri Thức | THIẾU 3D | Chưa hoàn thiện executor chuyên biệt | artifact_action_view |
| Artifact | artifact_04 | Máu Dịch Bệnh | THIẾU 3D | Chưa hoàn thiện executor chuyên biệt | action-disease-self |
| Artifact | artifact_05 | Cung Săn Mệnh | THIẾU 3D | Chưa hoàn thiện executor chuyên biệt | action-grudge-designate |
| Artifact | artifact_06 | Ấn Dân Làng | THIẾU 3D | Chưa hoàn thiện executor chuyên biệt | artifact_action_disable_function |
| Artifact | artifact_07 | Hơi Thở Lão Già | THIẾU 3D | Đã chốt mô tả; chưa hoàn thiện executor | action-grudge-designate |
| Artifact | artifact_08 | Mũ Ngốc | THIẾU 3D | Chưa hoàn thiện executor chuyên biệt | artifact_action_force_vote |
| Artifact | artifact_09 | Vạc Ma Thuật | THIẾU 3D | Chưa hoàn thiện executor chuyên biệt | artifact_action_check_villager |
| Artifact | artifact_10 | Ngọc May Mắn | THIẾU 3D | Chưa hoàn thiện executor chuyên biệt | artifact_action_exchange |
| Artifact | artifact_11 | Vuốt Sói | THIẾU 3D | Chưa hoàn thiện executor chuyên biệt | action-lone-wolf-join |
| Artifact | artifact_12 | Áo Choàng Hoàng Tử | THIẾU 3D | Chưa hoàn thiện executor chuyên biệt | action-fool-escape |
| Artifact | artifact_13 | Đồng Xu Tuổi Trẻ | THIẾU 3D | Đã chốt mô tả; chưa hoàn thiện executor | artifact_action_reveal_role |
| Artifact | artifact_14 | Gậy Mụ Già | THIẾU 3D | Chưa hoàn thiện executor chuyên biệt | action-black-woman-leave |
| Artifact | artifact_15 | Kim Cương Phủ Nhận | THIẾU 3D | Đã chốt mô tả; chưa hoàn thiện executor | artifact_action_negate |
| Artifact | artifact_16 | Nhật Ký Mất Ngủ | THIẾU 3D | Chưa hoàn thiện executor chuyên biệt | artifact_action_check_awake |
| Artifact | artifact_17 | Ngọc Ghen Tuông | THIẾU 3D | Chưa hoàn thiện executor chuyên biệt | artifact_action_steal |
| Artifact | artifact_18 | Mắt Tiên Tri | Đủ 3D | Chưa hoàn thiện executor chuyên biệt | — |
| Artifact | artifact_19 | Bình Giấc Mơ | THIẾU 3D | Đã chốt mô tả; chưa hoàn thiện executor | artifact_action_lock_function |
| Artifact | artifact_20 | Trái Tim Vô Tâm | THIẾU 3D | Chưa hoàn thiện executor chuyên biệt | artifact_action_block_vote |
| Artifact | artifact_21 | Ấn Thị Trưởng | THIẾU 3D | Chưa hoàn thiện executor chuyên biệt | artifact_action_double_vote |
| Artifact | artifact_22 | Mặt Nạ Câm Lặng | THIẾU 3D | Chưa hoàn thiện executor chuyên biệt | artifact_action_silence |
| Artifact | artifact_23 | Tráng Gương | THIẾU 3D | Chưa hoàn thiện executor chuyên biệt | artifact_action_copy_function |
| Artifact | artifact_24 | Sương Hào Quang | THIẾU 3D | Chưa hoàn thiện executor chuyên biệt | artifact_action_check_third_faction |
| Artifact | artifact_25 | Hắc Ngọc Hủy Diệt | THIẾU 3D | Chưa hoàn thiện executor chuyên biệt | artifact_action_destroy |
| Artifact | artifact_26 | Quả Cầu Phán Đoán | THIẾU 3D | Chưa hoàn thiện executor chuyên biệt | artifact_action_judge_two_wolves |
| Artifact | artifact_27 | Mặt Dây Chuyền Kiêu Hãnh | THIẾU 3D | Chưa hoàn thiện executor chuyên biệt | action-ghost-message |
| Artifact | artifact_28 | Lăng Kính Quyền Năng | THIẾU 3D | Chưa hoàn thiện executor chuyên biệt | artifact_action_limit_wolf_targets |
| Artifact | artifact_29 | Nhẫn Sự Thật | Đủ 3D | Chưa hoàn thiện executor chuyên biệt | — |
| Artifact | artifact_30 | Trượng Luân Hồi | THIẾU 3D | Đã chốt mô tả; chưa hoàn thiện executor | action-maid-inherit |
| Artifact | artifact_31 | Hồng Ngọc Cơ Duyên | THIẾU 3D | Chưa hoàn thiện executor chuyên biệt | artifact_action_activate_two |
| Artifact | artifact_32 | Lam Ngọc Định Mệnh | THIẾU 3D | Đã chốt mô tả; chưa hoàn thiện executor | artifact_action_link |
| Artifact | artifact_33 | Quyền Trượng Phục Sinh | Đủ 3D | Chưa hoàn thiện executor chuyên biệt | — |
| Artifact | artifact_34 | Khăn Hồn Ma | THIẾU 3D | Chưa hoàn thiện executor chuyên biệt | action-ghost-message |
| Artifact | artifact_35 | Khiên Bảo Hộ | Đủ 3D | Chưa hoàn thiện executor chuyên biệt | — |
| Artifact | artifact_36 | Khăn Choàng Hổ Thẹn | THIẾU 3D | Chưa hoàn thiện executor chuyên biệt | artifact_action_turn_away |
| Artifact | artifact_37 | Khăn Choàng Nguyền Rủa | THIẾU 3D | Chưa hoàn thiện executor chuyên biệt | action-demon-wolf-convert |
| Artifact | artifact_38 | Thương Cuồng Nộ | Đủ 3D | Chưa hoàn thiện executor chuyên biệt | — |
| Artifact | artifact_39 | Trượng Tiên Tri | Đủ 3D | Chưa hoàn thiện executor chuyên biệt | — |
| Artifact | artifact_40 | Đá Hoán Đổi | THIẾU 3D | Chưa hoàn thiện executor chuyên biệt | artifact_action_swap_role |
| Artifact | artifact_41 | Bùa Tai Ương | THIẾU 3D | Chưa hoàn thiện executor chuyên biệt | action-judge-double |
| Artifact | artifact_42 | Hư Không Vô Tận | THIẾU 3D | Đã chốt mô tả; chưa hoàn thiện executor | artifact_action_custom |
| Artifact | artifact_43 | Lá Phiếu Âm Giới | THIẾU 3D | Chưa hoàn thiện executor chuyên biệt | artifact_action_dead_vote |
| Artifact | artifact_44 | Vòng Hoa Hòa Bình | THIẾU 3D | Chưa hoàn thiện executor chuyên biệt | action-peace-lover-save |
