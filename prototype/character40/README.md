# GMWW Shared Motion — 4 Actions

Isolated review candidate for 40 accepted character designs. This preview has no game database, Durable Object, KV, R2, account or room bindings. It does not replace the live character catalog.

Each character has an individual accepted original and a transparent 48-frame atlas: eight views, eight idle, eight walk right, eight walk left, eight run right, eight run left. Source rectangles follow alpha gutters; the renderer preserves aspect ratio and uses no body-part slicing, skew or mirror simulation.

Character 15 source files remain unchanged. The shared controller adopts its 610 ms walk, 360 ms run and 540 ms turn durations, while rendering newly drawn frames. Stride values require visual calibration; tests do not establish identity fidelity, natural gait or absence of foot sliding. Turn artwork and row directions must be reviewed individually before acceptance.

Backup branch: `backup/characters-before-40-replacement-20261019-049373d4`; baseline `049373d4ba94c4efab61822de67766096808765e`. The committed backup inventory pins legacy resources. This is a repository backup, not an export of live game data.

Release gates: user accepts preview; implement GM/Player adapters preserving all IDs and account links (including legacy 41/42); verify regression, OTA inventory, manifest, SHA-256 and iPhone; PR and CI; explicit approval before merge/Production. Never remove legacy artwork or alter source Character 15.
