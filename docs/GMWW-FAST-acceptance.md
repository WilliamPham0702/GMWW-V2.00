# GMWW FAST — G3/G4 final acceptance scope

## Architecture decision: selective refactoring completed

G1 CI/CD (#269) and owner-accepted G2 OTA are retained. G3 covered interaction
retention, actor admission, lifecycle expiry, configuration, private cards,
village/player state, public room DTOs, readable GM source, readable Player JS,
and original embedded Player artwork/HTML sources. The final source extraction
is in #295, following #274/#275/#278/#286/#287/#290/#291/#293/#294.

Authoring entry points:
- `src/gmww-*-rules.js`, eligibility, cycle-expiry, retention, wolf-resolution,
  private-card and public-room contracts: shared testable game policies/DTOs.
- `server-game/src/*.part` -> `assemble-gm-app.mjs --write`.
- `src/player-web-src/*.part` -> `assemble-player-web.mjs --write`.
- `src/player-page-src/*.part` and `embedded/*.data` -> `assemble-player-page.mjs --write`.
- All assemblers support `--verify`; regression tests require exact byte parity.
- `src/index.js` remains the Worker router and stateful Durable Object coordinator.
  Splitting that coordinator or changing bindings solely for line count is deferred:
  no demonstrated release/test benefit justifies additional storage/runtime risk.

No storage-key, database-schema, account, role, Artifact, artwork, native IPA,
or Runtime asset migration. Generated Player assets retain their exact bytes.

## Real defect found by acceptance

The actual HTTP path stores `assignments` as public summaries and full role cards
under existing `roles:<loginId>` / `role:<loginId>` records. Battle validation was
reading `summary.roleCard || {}`, silently losing configured usage limits. The
old method harness injected summaries directly, so it did not catch this gap.

Validation now reads the matching current-match private role record, retaining
summary fallback for legacy callers. No payload/schema expansion is required.
A regression test fails on the previous source with expected
`ROLE_NIGHT_ACTION_EXHAUSTED`, and passes on the fix. The workerd test also caught
missing each-night limits before the fix.

## G4 acceptance layers (do not conflate)

| Layer | Execution | Evidence and scope |
|---|---|---|
| Lab in Library | Offline reference simulator | Clearly says MÔ PHỎNG THAM CHIẾU / CHƯA kiểm thử Engine thực; tests run all five scenarios for 3 and 10 nights. Never evidence of live DO execution. |
| Rule modules | Production functions imported into Node | Queue/timeline, Artifact reservation, role quotas, actor status, wolf precedence and cycle expiry. |
| DO method integration | Original production methods + isolated clone-on-read memory | Three-night freeze/disable, Fairy invalid seats, cross-match isolation, multi-target partial failure, stale undo, exact retry, roles and Artifact. This is not workerd/SQLite. |
| HTTP/WebSocket integration | Real local workerd Worker and SQLite Durable Objects | `worker-engine-multinight-e2e.mjs`: register/join/seat/deal/start, 3 nights, same-order grouped roles, single-use Artifact/stock/quota/undo, freeze/expel/death blocking, disabled_2n expiry, Guard-Wolf-Fairy final-target precedence, kill/revive, per-night/once-game limits, idempotency/collision, GM and Player WebSocket cycle events, reconnect and private receipt/seat/config preservation. No storage doubles or extracted methods. |
| Browser integration | Real Worker plus Playwright browsers | Existing private-card, night-timeline, home and Runtime recovery suites. WebKit viewport is not a physical iPhone. |

Run against the isolated localhost Worker used by CI:

```
npm ci
npm test
npm run check
# start: npx wrangler dev --local --ip 127.0.0.1 --port 8787
node tests/worker-private-delivery-e2e.mjs
node tests/worker-engine-multinight-e2e.mjs
node tools/smoke-30-players.mjs --run
```

The Engine acceptance runner refuses non-loopback targets. It is a mandatory
step in Check Player Web Worker; failures block the successful main check that
triggers Production deployment. Browser checks now include Player source/HTML
fragments and this acceptance script in their change filters.

## Data, rollback and closure gates

- Assertions preserve room roster/Seats, delivered private receipt IDs, assignment
  identities and game config across action/undo/multi-night processing.
- Artifact undo restores use/quota and effects; a repeated undo is idempotent.
- The method harness additionally injects a partial multi-target rejection and
  proves snapshot restoration; it also rejects undo after a newer state/turn.
- Production verification is read-only: Health/deep health, Runtime manifest and
  downloaded file SHA-256. No test rooms or user-account writes in Production.
- Retain the pre-release Cloudflare version as rollback target; no migration means
  rollback needs only the prior Worker deployment, not data restoration. Do not
  roll back legitimate gameplay writes or restore a whole user database.
- No Native changes: no IPA reinstall. Physical iPhone activation/visual acceptance
  is not established by CI; G2 remains owner-accepted, not reopened here.
- Completion requires all mandatory final PR CI SUCCESS, merged commit, final
  Production deployment SUCCESS and actual endpoint/hash verification. Links and
  deployment/version IDs belong in the final report, not inferred from this file.

This covers the agreed FAST Engine interaction families. It does not certify
every possible custom role/Artifact permutation or physical device behavior.
PR #277 Trạng Thái and Character Preview remain independent and untouched.
