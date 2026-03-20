#!/bin/bash
# Pull the production database to local with progress display.
# Usage: ./db_sync.sh

set -euo pipefail

REMOTE="greatbooks"
REMOTE_PATH="~/greatbooks/greatbooks.db"
LOCAL_DB="$(dirname "$0")/greatbooks.db"

echo "=== Great Books DB Sync ==="
echo ""

# 1. Checkpoint WAL on remote
echo "Checkpointing WAL on remote..."
ssh "$REMOTE" "cd ~/greatbooks && sqlite3 greatbooks.db 'PRAGMA wal_checkpoint(TRUNCATE);'" 2>/dev/null
echo "Done."
echo ""

# 2. Remove local WAL/SHM files
rm -f "${LOCAL_DB}-wal" "${LOCAL_DB}-shm"

# 3. Pull with rsync (shows progress bar, speed, ETA)
echo "Downloading database..."
echo ""
rsync -ah --progress --bwlimit=1234 --timeout=30 -e ssh "${REMOTE}:${REMOTE_PATH}" "$LOCAL_DB"
echo ""

# 4. Verify integrity
echo "Verifying database integrity..."
RESULT=$(sqlite3 "$LOCAL_DB" "PRAGMA integrity_check;" 2>&1)
if [ "$RESULT" = "ok" ]; then
    SIZE=$(ls -lh "$LOCAL_DB" | awk '{print $5}')
    TABLES=$(sqlite3 "$LOCAL_DB" "SELECT count(*) FROM sqlite_master WHERE type='table';")
    echo "OK — ${SIZE}, ${TABLES} tables"
else
    echo "WARNING: integrity check failed!"
    echo "$RESULT"
    exit 1
fi

echo ""
echo "Sync complete."
