# Consolidated IPA release plan

Release V3.161: reproduce missing startup resources in native IPA; add all current runtime startup resources and Character40 files; verify staged and Xcode output dependency closure. Bump runtime metadata to 3.161 preserving minimum shell 3.110 and storage keys. Resolve published IPA metadata only from verified GitHub release asset, with safe fallback. Run npm test and version guards. PR and CI before merge; build official unsigned IPA using existing Xcode workflow; verify SHA-256 and deploy catalogue after release. Retain previous release for rollback.
