#!/usr/bin/env bash
# Upsert an encrypted env var on a Vercel project, scoped to one target
# environment (production | preview | development). Deletes the existing
# entry (if any) for that target, then creates the new one. Idempotent.
#
# Usage:
#   vercel-upsert-env.sh <projectId> <key> <value> <target>
#
# Required env:
#   VERCEL_TOKEN, VERCEL_TEAM_ID

set -euo pipefail

PROJECT_ID="${1:-}"
KEY="${2:-}"
VALUE="${3:-}"
TARGET="${4:-}"

if [ -z "$PROJECT_ID" ] || [ -z "$KEY" ] || [ -z "$VALUE" ] || [ -z "$TARGET" ]; then
  echo "usage: $0 <projectId> <key> <value> <target>" >&2
  exit 1
fi
if [ -z "${VERCEL_TOKEN:-}" ] || [ -z "${VERCEL_TEAM_ID:-}" ]; then
  echo "missing VERCEL_TOKEN or VERCEL_TEAM_ID" >&2
  exit 1
fi

API="https://api.vercel.com"
TEAM="teamId=$VERCEL_TEAM_ID"

# List existing env entries for this key across all targets. We only want
# to remove the one matching THIS target so other environments stay intact.
existing_json=$(curl -fsS \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  "$API/v10/projects/$PROJECT_ID/env?$TEAM&decrypt=false")

existing_id=$(
  node -e '
    const d = JSON.parse(require("fs").readFileSync(0, "utf8"));
    const [key, target] = process.argv.slice(1);
    const envs = d.envs ?? [];
    const match = envs.find(
      (e) => e.key === key && Array.isArray(e.target) && e.target.includes(target),
    );
    process.stdout.write(match?.id ?? "");
  ' "$KEY" "$TARGET" <<< "$existing_json"
)

if [ -n "$existing_id" ]; then
  echo "deleting existing $KEY (id=$existing_id) on $TARGET"
  curl -fsS -X DELETE \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    "$API/v9/projects/$PROJECT_ID/env/$existing_id?$TEAM" \
    > /dev/null
fi

echo "creating $KEY on $TARGET"
body=$(node -e '
  const [key, value, target] = process.argv.slice(1);
  process.stdout.write(JSON.stringify({ key, value, type: "encrypted", target: [target] }));
' "$KEY" "$VALUE" "$TARGET")

curl -fsS -X POST \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  "$API/v10/projects/$PROJECT_ID/env?$TEAM" \
  -d "$body" \
  > /dev/null

echo "upserted $KEY=*** on $TARGET"
