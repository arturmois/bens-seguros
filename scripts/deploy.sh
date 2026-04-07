#!/bin/bash
set -euo pipefail

# === Unified deploy script ===
# Usage: ./deploy.sh <service> <tag>
#   service: "server" | "chat"
#   tag: docker image tag (git SHA short or "latest")

COMPOSE_FILE="/opt/bens-seguros/docker-compose.prod.yml"
DEPLOY_DIR="/opt/bens-seguros"

# --- Validate arguments ---
SERVICE="${1:-}"
TAG="${2:-}"

if [ -z "$SERVICE" ] || [ -z "$TAG" ]; then
  echo "Usage: $0 <server|chat> <tag>"
  exit 1
fi

# --- Map service to containers ---
case "$SERVICE" in
  server)
    CONTAINERS="server worker"
    HEALTH_CONTAINER="bens-seguros-server-1"
    TAG_FILE="${DEPLOY_DIR}/.current-server-tag"
    ;;
  chat)
    CONTAINERS="chat-server chat-worker"
    HEALTH_CONTAINER="bens-seguros-chat-server-1"
    TAG_FILE="${DEPLOY_DIR}/.current-chat-tag"
    ;;
  *)
    echo "ERROR: service must be 'server' or 'chat', got '${SERVICE}'"
    exit 1
    ;;
esac

cd "$DEPLOY_DIR"

# --- Save current tag for rollback ---
PREV_TAG=$(cat "$TAG_FILE" 2>/dev/null || echo "none")
echo "Current tag: ${PREV_TAG} -> New tag: ${TAG}"

# --- Pull new images ---
echo "Pulling images with tag ${TAG}..."
export TAG
docker compose -f "$COMPOSE_FILE" pull $CONTAINERS

# --- Run Prisma migrations using the NEW image (server only) ---
# Uses docker run (not exec) so the new image's --chown=app:app permissions apply.
if [ "$SERVICE" = "server" ]; then
  DOCKERHUB_USER=$(grep '^DOCKERHUB_USERNAME=' "${DEPLOY_DIR}/.env" | cut -d= -f2)
  DB_URL=$(grep '^DATABASE_URL=' "${DEPLOY_DIR}/.env" | cut -d= -f2-)
  IMAGE="${DOCKERHUB_USER}/bens-server:${TAG}"
  NETWORK=$(docker inspect bens-seguros-postgres-1 --format='{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{end}}' 2>/dev/null || echo "bens-seguros_default")
  echo "Running Prisma migrations with new image ${IMAGE}..."
  docker run --rm --network="$NETWORK" \
    -e DATABASE_URL="${DB_URL}" \
    "$IMAGE" npx prisma migrate deploy || {
    echo "ERROR: Prisma migration failed! Aborting deploy."
    exit 1
  }
fi

# --- Deploy containers (force recreate to use newly pulled image) ---
echo "Deploying ${CONTAINERS}..."
docker compose -f "$COMPOSE_FILE" up -d --force-recreate $CONTAINERS

# --- Reload nginx ---
echo "Reloading nginx..."
docker exec bens-seguros-nginx-1 nginx -t && docker exec bens-seguros-nginx-1 nginx -s reload

# --- Poll health check (120s timeout) ---
poll_health() {
  local container="$1"
  local timeout="$2"
  local elapsed=0

  echo "Waiting for ${container} to become healthy (timeout: ${timeout}s)..."
  while [ $elapsed -lt "$timeout" ]; do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "unknown")
    if [ "$STATUS" = "healthy" ]; then
      echo "${container} is healthy! (${elapsed}s)"
      return 0
    fi
    sleep 5
    elapsed=$((elapsed + 5))
  done

  echo "ERROR: ${container} not healthy after ${timeout}s (status: ${STATUS})"
  return 1
}

if ! poll_health "$HEALTH_CONTAINER" 120; then
  echo "Health check failed! Rolling back to ${PREV_TAG}..."
  if [ "$PREV_TAG" != "none" ]; then
    export TAG=${PREV_TAG}
    docker compose -f "$COMPOSE_FILE" up -d --force-recreate $CONTAINERS

    if ! poll_health "$HEALTH_CONTAINER" 120; then
      echo "CRITICAL: Rollback also failed! Manual intervention required."
      exit 2
    fi
    echo "Rollback successful."
  fi
  exit 1
fi

# --- Smoke test: cross-subdomain cookie Domain attribute (server only) ---
if [ "$SERVICE" = "server" ]; then
  echo "Running smoke test (cookie Domain check)..."
  COOKIE_CHECK=$(curl -s -D - -X POST https://api.bensseg.com/api/auth/sign-in/email \
    -H "Content-Type: application/json" \
    -d '{"email":"smoke-test@bensseg.com","password":"invalid"}' \
    2>&1 | grep -c "Domain=bensseg.com" || true)
  if [ "$COOKIE_CHECK" -lt 1 ]; then
    echo "WARNING: Cross-subdomain cookie Domain attribute missing!"
    echo "Auth may not work between app.bensseg.com and api.bensseg.com"
  fi
fi

# --- Save successful tag ---
echo "${TAG}" > "$TAG_FILE"
echo "Deploy successful! Service: ${SERVICE}, Tag: ${TAG}"
