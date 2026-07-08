#!/bin/bash
set -e

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Database backup
echo "Backing up PostgreSQL..."
pg_dump "$DATABASE_URL" > "$BACKUP_DIR/db_$DATE.sql"
gzip "$BACKUP_DIR/db_$DATE.sql"

# Redis backup
echo "Backing up Redis..."
redis-cli BGSAVE
sleep 2
cp /data/dump.rdb "$BACKUP_DIR/redis_$DATE.rdb" || true

# Downloads backup (if local)
if [ -d "$DOWNLOAD_PATH" ]; then
  echo "Backing up downloads..."
  tar -czf "$BACKUP_DIR/downloads_$DATE.tar.gz" -C "$DOWNLOAD_PATH" .
fi

# Upload to S3 (if configured)
if [ -n "$S3_BACKUP_BUCKET" ]; then
  echo "Uploading to S3..."
  aws s3 sync "$BACKUP_DIR" "s3://$S3_BACKUP_BUCKET/backups/"
fi

# Cleanup old backups
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "redis_*.rdb" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "downloads_*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup complete: $DATE"
