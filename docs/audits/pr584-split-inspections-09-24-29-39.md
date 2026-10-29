# 4 Artifact soi — trích từng bước từ PR #584

Artifact #09 (Vạc Ma Thuật), #24 (Sương Hào Quang), #29 (Nhẫn Sự Thật), #39 (Trượng Tiên Tri). Nguồn bất biến: backup `backup/pr584-preserved-20261029-51c407c7`, tracker #623.

Chuyển nguyên blob module `src/gmww-day-artifact-inspection.js`. Test `card-executors-day-inspection-planners-20261029.test.mjs` chỉ gồm các test pure planner lấy từ bản gốc, **không phải toàn bộ test ở PR #584**. Bản test đầy đủ (bao gồm kiểm tra contract `src/index.js`) vẫn ở snapshot tại `tests/card-executors-day-artifact-inspections-20261028.test.mjs`, blob `fa56ec7248aea83aee2228071bda3bdbc15f932f` và **bắt buộc chuyển về trước khi merge**.

Draft, chưa có API integration / GM/Player Web / privacy receipt / quota / DEMO / audio / undo / Worker HTTP E2E. Không merge hoặc deploy nhánh này khi chưa hoàn thành và required CI SUCCESS. Không đổi IPA/dữ liệu.
