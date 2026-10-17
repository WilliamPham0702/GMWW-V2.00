# GMWW Production release ownership

Production is published by `.github/workflows/deploy-production.yml`, after
tested main code is selected. The workflow restores canonical assets, prepares
the Runtime package and build-verified catalog, checks version progression,
deploys, then verifies the live manifest and file SHA-256 values.

Cloudflare Builds is validation only. Its main-branch trigger must use:

```
npx wrangler deploy --dry-run
```

The trigger previously had an empty build command and `npx wrangler deploy`.
That published a raw source checkout before GitHub Actions prepared the OTA.
The checkout deliberately contains a null release catalog and an older tracked
latest manifest. A new Runtime version could therefore be deployed without its
matching package, causing HTTP 503 until the prepared GitHub deployment replaced
it. On 2026-10-17, V3.122 publication reproduced a 503 between deployments at
00:33:11 UTC and 00:34:00 UTC; the prepared deployment then served build-verified
V3.122. This is evidence of a release-path race, not proof that every historical
503 had this cause.

The Cloudflare trigger was changed to dry-run and read back successfully on
2026-10-17. Its branch filter remains main. No storage, credentials, namespaces,
Native files or user data were changed by this configuration correction.

Do not restore a second direct Production deployment path. If a release fails,
retain the prior verified Worker deployment for rollback; do not delete room,
member, game or artwork data. Device OTA acceptance is separate from server
deployment verification. Startup recovery in V3.122 returns to the bundled
Runtime through the existing Native bridge; it is not a previous-OTA slot and
does not detect all asynchronous initialization or later gameplay failures.
