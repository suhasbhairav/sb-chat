#!/bin/sh
set -eu

retry() {
  label="$1"
  shift
  attempts="${BATUK_STARTUP_RETRY_ATTEMPTS:-30}"
  delay="${BATUK_STARTUP_RETRY_SECONDS:-2}"
  count=1

  until "$@"; do
    if [ "$count" -ge "$attempts" ]; then
      echo "$label failed after $attempts attempts." >&2
      return 1
    fi
    echo "$label not ready yet. Retrying in ${delay}s (${count}/${attempts})..."
    count=$((count + 1))
    sleep "$delay"
  done
}

node scripts/validate-enterprise-env.mjs
retry "Better Auth migration" npm run auth:migrate
retry "Batuk product data migration" npm run data:migrate

exec npm run start
