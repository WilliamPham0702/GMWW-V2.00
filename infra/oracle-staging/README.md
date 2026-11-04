# GMWW Oracle STAGING — isolated local engine (not live failover)

## Status
Source bootstrap only. No Oracle VM has been provisioned or deployed by this PR. The shared game engine is `src/index.js` executed by local Wrangler/workerd with a separate SQLite Durable Object emulator. It is NOT connected to existing Cloudflare rooms or Oracle Production.

## Use on a privately administered STAGING VM
```bash
npm ci --ignore-scripts --no-audit --no-fund
bash infra/oracle-staging/start-local.sh
```
The launcher binds to 127.0.0.1:8787 and isolates state in `.wrangler/oracle-staging` (Git ignored). For an Oracle VM, set `GMWW_ORACLE_STATE_DIR=/var/lib/gmww-oracle-staging` on an empty dedicated directory. Do not pass Cloudflare deploy credentials. No public listener, reverse proxy, DNS, service/daemon, TLS or automatic failover is created.

## Gates not satisfied
- Oracle VM identity and Always Free resources verified, network/firewall configured.
- Parity of full HTTP, login, secure WebSocket, reconnect, chat, data schema and durable persistence validated against a target commit.
- User/account/room history migrated and verified in a **separate staging test dataset**; never copy production secrets or rooms automatically.
- TLS reverse proxy and access controls approved; health, alerts, recovery, backup; no switching mid-game.
- Both backends have identical version, release manifest and schema; GM chooses backend only after last match.
Until all gates succeed, Cloudflare remains the only approved live backend. Link `gamemasoi.pages.dev` is a 302 redirect to Cloudflare, not to this staging VM.
