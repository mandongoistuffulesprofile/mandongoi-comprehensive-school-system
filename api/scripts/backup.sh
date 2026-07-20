#!/bin/bash
# Database Backup Script for Mandongoi School System
# Usage: ./scripts/backup.sh [output-dir]
# Default output dir: ../backups/

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${1:-$PROJECT_DIR/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Load .env for DATABASE_URL
if [ -f "$PROJECT_DIR/.env" ]; then
  export $(grep -v '^\s*#' "$PROJECT_DIR/.env" | grep -v '^\s*$' | xargs)
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL not set"
  exit 1
fi

BACKUP_FILE="$BACKUP_DIR/mandongoi_${TIMESTAMP}.sql.gz"

echo "Starting backup to: $BACKUP_FILE"
pg_dump "$DATABASE_URL" --no-owner --no-acl | gzip > "$BACKUP_FILE"

echo "Backup complete: $(du -h "$BACKUP_FILE" | cut -f1)"

# Keep only last 10 backups
ls -t "$BACKUP_DIR"/mandongoi_*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm
echo "Cleaned up old backups (kept last 10)"
