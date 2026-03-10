# Deployment Skill

Deploy code, data, and database updates to the Great Books production server.

## Infrastructure

| Resource | Value |
|----------|-------|
| **Cloud** | Google Cloud Platform |
| **Project ID** | `greatbooks-app` |
| **GCP Account** | `granthawkins88@gmail.com` |
| **Billing Account** | Earmark (`018761-888595-29BC0B`) |
| **VM Name** | `greatbooks` |
| **Zone** | `us-central1-a` |
| **Machine Type** | `e2-small` (2 vCPU shared, 2GB RAM) |
| **OS** | Ubuntu 24.04 LTS |
| **Boot Disk** | 30GB standard persistent |
| **External IP** | `35.202.125.196` (static — `greatbooks-ip`) |
| **Firewall** | `allow-http` (tcp:80), `allow-https` (tcp:443) |
| **Domain** | `greatbooks.earmark.fm` |
| **SSL** | Let's Encrypt (certbot, auto-renews) |
| **SSH** | `ssh greatbooks` (config in `~/.ssh/config`) |
| **Stack** | nginx → Next.js (port 3000) via pm2 |
| **App dir** | `~/greatbooks/` (cloned repo + DB + data/) |

## Deploy Commands

### Code changes
```bash
ssh greatbooks "cd ~/greatbooks && git pull && npm install && npm run build && pm2 restart greatbooks"
```

### Database updates (checkpoint WAL first)
```bash
sqlite3 greatbooks.db "PRAGMA wal_checkpoint(TRUNCATE);"
ssh greatbooks "pm2 stop greatbooks && rm -f ~/greatbooks/greatbooks.db-wal ~/greatbooks/greatbooks.db-shm"
scp greatbooks.db greatbooks:~/greatbooks/greatbooks.db
ssh greatbooks "pm2 start greatbooks"
```

### Data files (audio, covers, etc.)

**IMPORTANT: `scp -r dir/` creates a nested subdirectory on the remote.** Use trailing `/.` or specify files directly:
```bash
# WRONG — creates data/book/audio/audio/ on server:
scp -r data/book/audio/ greatbooks:~/greatbooks/data/book/audio/

# RIGHT — copies contents into existing directory:
scp data/book/audio/*.mp3 greatbooks:~/greatbooks/data/book/audio/

# RIGHT — rsync handles this correctly:
rsync -av data/book/audio/ greatbooks:~/greatbooks/data/book/audio/

# Covers:
rsync -av public/covers/ greatbooks:~/greatbooks/public/covers/
```

## Debugging

```bash
ssh greatbooks "pm2 logs greatbooks --lines 50 --nostream"  # recent logs
ssh greatbooks "pm2 status"                                  # process health
ssh greatbooks "free -h && df -h /"                          # resources
```

## VM Management (gcloud)

Requires `/tmp/google-cloud-sdk/` (may need reinstall after reboot).

```bash
export CLOUDSDK_PYTHON=python3 PATH="/tmp/google-cloud-sdk/bin:$PATH"

# Resize VM
gcloud compute instances stop greatbooks --zone=us-central1-a
gcloud compute instances set-machine-type greatbooks --zone=us-central1-a --machine-type=e2-medium
gcloud compute instances start greatbooks --zone=us-central1-a
```

Machine types: `e2-micro` (1GB, free tier), `e2-small` (2GB, ~$14/mo), `e2-medium` (4GB, ~$24/mo)
