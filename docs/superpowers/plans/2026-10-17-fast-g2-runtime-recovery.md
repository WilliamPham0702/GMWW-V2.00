# FAST G2.3 — startup recovery on the existing IPA

GM authorized sequential FAST G2–G4 implementation and confirmed the installed
Native shell is V3.110. Baseline main bcefb54 (PR #271), Runtime V3.121.

Scope: Runtime V3.122, no Native/Xcode changes or data schema changes. Load an
independent recovery bootstrap before app.js; app execution explicitly signals
readiness. If an OTA Runtime newer than the shell never signals ready within
45 seconds, persist a once-per-version marker and invoke the existing Native
rollbackRuntime bridge, which returns to the bundled Runtime. Healthy startup,
browser-only execution, bundled/newer shell, malformed shell and unavailable
marker storage do not automatically roll back. Never remove game data. This
does not repair native installation failure, detect every later gameplay error,
or provide a previous-OTA slot absent from the installed Native implementation.

Packaging must reject referenced local startup scripts that are absent. All
packaged files retain per-file SHA-256 verification. Replace stale current-
release test literals with shared synchronization assertions (Worker, app, HTML,
asset cache revisions, npm lockfiles and Native project), retaining historical
fixtures and all gameplay assertions. Historical legacy rescue remains tested at
its existing compatibility boundary, rather than synthesizing partial rescue
packages for future versions with unknown dependencies.

Execution inline: red tests first; implement; run full regression tests and
package checks; upload isolated staging; test changed downloads and WebKit
startup failure/healthy/loop/data retention; inspect all CI on exact PR head;
merge/deploy only when checks succeed; verify Production. Keep previous Worker
deployment available for rollback. Physical iPhone activation and fallback are
separate acceptance steps and remain unproven until device evidence arrives.

G2 is still open pending full release-classification/recovery audit and device
acceptance. G3/G4 must not be reported complete by this increment.
