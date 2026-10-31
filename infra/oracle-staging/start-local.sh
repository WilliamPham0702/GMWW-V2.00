#!/usr/bin/env bash
# Oracle STAGING bootstrap: same Worker source with LOCAL emulated Durable Objects.
# This does not migrate Production rooms and is not a failover target.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [[ -n "${CLOUDFLARE_API_TOKEN:-}" || -n "${CLOUDFLARE_API_KEY:-}" ]]; then
  echo "Refusing Oracle STAGING with Cloudflare deploy credentials in environment." >&2
  exit 1
fi

STATE="${GMWW_ORACLE_STATE_DIR:-$ROOT/.wrangler/oracle-staging}"
if [[ "$STATE" != /* || "$STATE" == "/" || "$STATE" == "$ROOT" || "$STATE" == "$ROOT/.wrangler" ]]; then
  echo "Refusing unsafe Oracle STAGING persistence path." >&2
  exit 1
fi
# Protect existing state before any chmod, directory creation or marker write.
if [[ -L "$STATE" || ( -e "$STATE" && ! -d "$STATE" ) ]]; then
  echo "Refusing symlink or non-directory Oracle STAGING path." >&2
  exit 1
fi
MARKER="$STATE/.gmww-oracle-staging-only"
if [[ -d "$STATE" && ! -e "$MARKER" ]] &&
   find "$STATE" -mindepth 1 -maxdepth 1 -print -quit | grep -q .; then
  echo "Refusing existing unmarked data; do not use Production/previous game state." >&2
  exit 1
fi
mkdir -p -- "$STATE"
chmod 700 -- "$STATE"
if [[ ! -e "$MARKER" ]]; then
  printf '%s\n' 'GMWW-ORACLE-STAGING-ONLY' > "$MARKER"
fi
if [[ "$(cat "$MARKER")" != "GMWW-ORACLE-STAGING-ONLY" ]]; then
  echo "Refusing unknown state marker." >&2
  exit 1
fi

PORT="${GMWW_ORACLE_PORT:-8787}"
if [[ ! "$PORT" =~ ^[0-9]+$ ]] || (( 10#$PORT < 1024 || 10#$PORT > 65535 )); then
  echo "Invalid Oracle STAGING port" >&2
  exit 1
fi
[[ -f node_modules/.bin/wrangler ]] || {
  echo "Run npm ci --ignore-scripts first; pinned Wrangler is required." >&2
  exit 1
}
echo "Oracle STAGING local-only on 127.0.0.1:$PORT with isolated Durable Object state."
echo "NOT APPROVED for production failover, real rooms, public internet or live data."
exec node_modules/.bin/wrangler dev --local --config wrangler.jsonc \
  --ip 127.0.0.1 --port "$PORT" --inspector-ip 127.0.0.1 \
  --persist-to "$STATE"
