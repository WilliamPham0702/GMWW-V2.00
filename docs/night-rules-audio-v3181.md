# V3.181 — Night rules and audio

Fixes:
- Divination resolves inspected players independently of the private notice recipient. Hydrates authoritative private role records for faction comparisons. DEMO viewer displays and speaks results once; results are excluded from public DEMO broadcasts.
- GM delivery and server sanitization retain nightImmune. Wolf bites check immunity at the final transferred destination; night kills respect immunity while consuming the action. Explicit GM overrides and Destroyer self-backlash remain available.
- Audio migrations preserve existing IDs (IndexedDB keys), URLs and file metadata; missing sourceKey values no longer discard unrelated system clips. Seeded empty slots no longer shadow configured clips. Late previous-turn audio loads cannot replace a newer cue.
- Day announcement always queues “Đêm qua làng chúng ta có” + number 0–30 + “người chết”.

Compatibility: existing matches delivered before this patch may lack nightImmune entirely. Reassign roles/start a fresh match after upgrading; this patch does not guess missing flags or rewrite active matches. IPA shell unchanged. Runtime release notes included in the update manifest generator.

Verification: regression tests exercise the real server method bodies, role transport, immunity, audio migration, asynchronous cue race and DEMO projection. A new HTTP/workerd integration test is wired into Check Player Web Worker CI. Local workerd startup is unavailable in this environment (`uv_interface_addresses` error); GitHub CI must validate it before merge. Physical iPhone playback and the user's privately uploaded IndexedDB files/external URLs require acceptance on the device; repository inspection cannot validate those unseen files.

Rollback: revert the PR commit and publish a newer runtime revision through the normal verified deployment workflow. No schema migration, data deletion or namespace changes.
