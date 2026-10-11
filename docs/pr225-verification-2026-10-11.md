# PR #225 verification and follow-up

Observed on 2026-10-11. This is a partial implementation report, not acceptance of the complete night engine.

## Existing release

- PR #225 was already merged before this work began.
- PR head: `fbe315ba3837cf9353227b92669ce99b1d1c0557`.
- Main merge: `81accf0b5e2e422cfcb72d16f5f16bcb68c5dbd9`.
- Six PR workflows succeeded: Worker, Character Engine, Player Card Browsers, 30-Player Realtime Room, Character V4, GR01 Backup Integrity.
- Main workflows succeeded: Worker, Player Card Browsers, GR01 Backup Integrity.
- Existing automatic Deploy Production run `38113203793`, job `114392855524`, including the Verify Production step, succeeded.
- Direct `/api/health` and `/api/update/manifest?current=3.89` both reported Runtime V3.89. No V3.90 release was established.
- No deployment was initiated by this follow-up. No production room, assignment, artwork or database was mutated.

## Follow-up PR #227

Based on the exact merged main above. Fixes:

1. Auto GM schedules and completes the zero-duration village-wakeup step.
2. Repeated cycle completion cannot reset day timing or expire effects again.
3. Battle action labels read `state.actions.role` and `state.actions.artifacts`, rather than assuming one flat array.
4. Artifact buttons identify their Artifact and owner; used Artifacts do not hide role actions.
5. Final wakeup is selectable; Next includes the expected current turn.
6. Artifact use checks the current stored owner, Artifact ID, configured action and all requested players before consumption.
7. A multi-target confirmation binds its nonce to the action, effect type and target list. Reusing that nonce for different targets is rejected.
8. Single-use retries remain idempotent without allowing later-night reuse. Request ID collisions across owners are rejected.
9. Interaction/activation handlers are serialized with cycle changes. Successful interaction receipts prevent replayed revives from clearing subsequent deaths.
10. Display normalization retains exactly one priority window and wakeup step.

Validation: 741 Node tests pass, including production-method integration tests using isolated storage; Wrangler dry-run passes. The first follow-up commit passed all six GitHub workflows, including the new isolated iPhone-sized WebKit test of actual battle handlers/markup. The final receipt-change commit must also pass before any release decision.

The browser test verifies role and Artifact names, ownership payload, multi-target confirmation, used filtering, countdown, timeline navigation and touch-pointer swipe handling. It does not establish acceptance on a physical iPhone or a complete live match.

## Requested scenario coverage

| Scenario | Evidence / remaining gap |
| --- | --- |
| No Artifact | Real runtime builder retains one empty priority window |
| Priority use | Actual GM interaction handler consumes once |
| Skip then use at role | Navigation does not consume stock; role use succeeds |
| Reuse rejected | Different nonce, different targets and later-night single-use attempts rejected |
| Multiple owners per role | Grouped runtime and distinct owner-scoped UI action IDs tested |
| Non-owner | Invalid owner, stale ownership and unknown action rejected |
| Timeline/swipe | WebKit interaction test and stale-turn server test |
| Manual/Auto completion | Both reach morning once; Auto no longer stalls at zero duration |
| Player synchronization | Existing private-card browser CI plus morning room-state broadcast test; full effect-pipeline synchronization still unverified |
| Data preservation | Isolated sentinel checks and GR01 CI; no production mutation performed |

## Blocking gaps: do not merge this draft as a complete night engine

The supplied GMWW-V1.11.ipa was inspected. Its `resolveMorning` uses bite targets, protected/saved players and queued kills before advancing the phase. It also handles role-specific immunity/conversion through stored match state.

The current Worker `applyCycle` does not implement equivalent resolution. The GM battle UI classifies bite/protection as `effect_notice`; the Worker records notices but does not accumulate their combat meaning. Death is otherwise applied immediately. Therefore the current model does not yet prove:

- a bite blocked by protection or a later save;
- death, freeze, revival and redirected effects resolved in their configured order;
- configured per-function usage/cooldown and server-enforced target-count limits;
- actual role swap/copy effects and refreshed private delivery;
- zero-target actions, which the current battle UI disables;
- atomic all-target application: current UI submits targets sequentially;
- full legacy-client compatibility for new confirmation bindings.

Implementing these requires a persisted, configuration-driven action/effect ledger and an atomic morning resolver integrated with current room state and private delivery. Do not infer gameplay effects from translated action names or copy V1.11's hard-coded role branches into the Worker. In-progress match compatibility and replay behavior need integration tests before enabling the new path.

## Release gate

Keep #227 Draft. It is not the completed end-to-end task. Main automatically deploys successful Worker builds, so merging the follow-up would trigger Production and requires separate deployment authorization. Before release, choose a new coordinated Runtime version (the draft retains V3.89), verify OTA from installed V3.89, complete the blocking engine work, rerun all required CI at the final HEAD and recheck main.
