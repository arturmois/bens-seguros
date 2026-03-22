#!/bin/bash
set -euo pipefail

BACKUP_DIR="/opt/bens-seguros/backups"
DATE=$(date +%Y-%m-%d_%H-%M)
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

# Source env vars for credentials
source /opt/bens-seguros/.env

# PostgreSQL
docker compose -f /opt/bens-seguros/docker-compose.prod.yml \
  exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" \
  | gzip > "$BACKUP_DIR/postgres_${DATE}.sql.gz"

# Verify PostgreSQL backup is not empty
if [ ! -s "$BACKUP_DIR/postgres_${DATE}.sql.gz" ]; then
  echo "ERROR: PostgreSQL backup is empty!" >&2
  exit 1
fi

# MongoDB
docker compose -f /opt/bens-seguros/docker-compose.prod.yml \
  exec -T mongodb mongodump --archive \
  -u "$MONGO_USER" -p "$MONGO_PASSWORD" --authenticationDatabase admin \
  | gzip > "$BACKUP_DIR/mongo_${DATE}.archive.gz"

# Verify MongoDB backup is not empty
if [ ! -s "$BACKUP_DIR/mongo_${DATE}.archive.gz" ]; then
  echo "ERROR: MongoDB backup is empty!" >&2
  exit 1
fi

# Upload to Cloudflare R2
if command -v rclone &> /dev/null; then
  rclone copy "$BACKUP_DIR" r2:bens-backups/${DATE}/ || {
    echo "WARNING: R2 upload failed!" >&2
  }
fi

# Clean old local backups (only after successful backup)
find "$BACKUP_DIR" -type f -mtime +${RETENTION_DAYS} -delete

echo "[$(date)] Backup completed: postgres + mongo"
