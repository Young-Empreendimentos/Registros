#!/usr/bin/env bash
# Deploy via SSH no Hetzner (rode na sua máquina, com acesso SSH ao servidor)
set -euo pipefail

HOST="${DEPLOY_HOST:?Defina DEPLOY_HOST (IP do Hetzner)}"
USER="${DEPLOY_USER:-root}"
DIR="${DEPLOY_DIR:-/opt/registros}"
BRANCH="${DEPLOY_BRANCH:-master}"

echo "→ Deploy em ${USER}@${HOST}:${DIR} (branch ${BRANCH})"

ssh "${USER}@${HOST}" bash -s <<EOF
set -e
cd ${DIR}
git fetch origin
git checkout ${BRANCH}
git pull origin ${BRANCH}
docker compose build
docker compose up -d
docker compose ps
echo "OK — logs: docker compose -f ${DIR}/docker-compose.yml logs -f app"
EOF

echo "Deploy concluído. Teste: https://seu-dominio/login"
