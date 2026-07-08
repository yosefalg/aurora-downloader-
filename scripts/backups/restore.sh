#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <backup_file>"
  exit 1
fi

BACKUP_FILE="$1"

echo "Restoring from $BACKUP_FILE..."

if [[ "$BACKUP_FILE" == *.sql.gz ]]; then
  gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL"
elif [[ "$BACKUP_FILE" == *.tar.gz ]]; then
  tar -xzf "$BACKUP_FILE" -C "$DOWNLOAD_PATH"
else
  echo "Unknown backup format"
  exit 1
fi

echo "Restore complete"
