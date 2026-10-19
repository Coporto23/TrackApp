#!/usr/bin/env bash
# Despliega una versión de TrackApp en un entorno del VPS. Lo ejecuta el pipeline
# (GitHub Actions) por SSH; también sirve a mano para volver a una versión anterior.
#   uso: deploy.sh <qa|prod> <image-tag>   (el token de GHCR, si hay, llega por stdin)
set -euo pipefail

ENV_NAME="${1:?uso: deploy.sh <qa|prod> <image-tag>}"
IMAGE_TAG="${2:?uso: deploy.sh <qa|prod> <image-tag>}"
GHCR_USER="${GHCR_USER:-}"
DIR="/opt/trackapp/${ENV_NAME}"

cd "$DIR"
[[ -f .env ]] || { echo "Falta $DIR/.env (ver deploy/README.md)" >&2; exit 1; }
echo "IMAGE_TAG=${IMAGE_TAG}" > image.env

compose() {
  docker compose -p "trackapp-${ENV_NAME}" --env-file .env --env-file image.env -f docker-compose.prod.yml "$@"
}

# Token temporal del job (solo vive durante el despliegue).
if [[ -n "$GHCR_USER" ]]; then
  read -r GHCR_TOKEN
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
  trap 'docker logout ghcr.io >/dev/null 2>&1 || true' EXIT
fi

echo "==> Descargando imágenes ${IMAGE_TAG}"
compose --profile migrate pull
echo "==> Base de datos"
compose up -d --wait db
echo "==> Migraciones"
compose run --rm migrate
echo "==> App"
compose up -d --wait app
docker image prune -f >/dev/null
echo "==> ${ENV_NAME} desplegado con ${IMAGE_TAG}"
