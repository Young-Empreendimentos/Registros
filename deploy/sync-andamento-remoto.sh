#!/usr/bin/env bash
# Roda no servidor Hetzner (sem npm no host — usa Docker one-shot)
set -euo pipefail

DIR="${DEPLOY_DIR:-/opt/registros}"
cd "$DIR"

git pull origin master

docker run --rm \
  -v "${DIR}:/app" \
  -w /app \
  --env-file "${DIR}/.env.local" \
  node:20-alpine \
  sh -c 'npm ci && npx tsx scripts/sync-andamento-canonico.ts'

echo "OK — andamentos sincronizados"
