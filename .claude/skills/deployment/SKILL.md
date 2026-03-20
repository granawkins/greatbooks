# Deployment Skill

Deploy code, data, and database updates to the Great Books production server.

## GCP Projects

Two GCP projects are used, both under `granthawkins88@gmail.com`:

| Project | Purpose |
|---------|---------|
| `greatbooks-app` | Compute Engine VM (production server) |
| `readtomelater` | All Google APIs: TTS (Chirp3), STT (Chirp 2), Generative Language (Gemini), Cloud Storage |

The service account `earmark-tts@readtomelater.iam.gserviceaccount.com` (via `google-credentials.json`) is used by both the server and local scripts for TTS, STT, and GCS access.

## Google Cloud Storage

| Resource | Value |
|----------|-------|
| **Bucket** | `greatbooks-assets` (in `readtomelater` project) |
| **Region** | `us-central1` |
| **Access** | Uniform bucket-level, public read (`allUsers:objectViewer`) |
| **Covers** | `gs://greatbooks-assets/covers/{book-id}.jpg` — served directly via public URL |
| **Audio** | `gs://greatbooks-assets/audio/{book-id}/{chapter}.mp3` — proxied via `/api/audio/` with auth check |

Covers are referenced in the frontend as `https://storage.googleapis.com/greatbooks-assets/covers/...`. Audio is never accessed directly by clients — the `/api/audio/` route checks the auth cookie, then streams from GCS.

**Upload assets to GCS:**
```bash
.venv/bin/python scripts/upload_to_gcs.py            # upload all (covers + audio)
.venv/bin/python scripts/upload_to_gcs.py --covers    # covers only
.venv/bin/python scripts/upload_to_gcs.py --audio     # audio only
.venv/bin/python scripts/upload_to_gcs.py --force     # re-upload existing files
```

**Cost note:** GCS egress is $0.12/GB after 1GB free/month. At ~170MB per book x 50 books = ~8.5GB stored (~$0.18/mo storage). Egress depends on traffic — if costs grow, add Cloudflare CDN in front of the bucket to cache and eliminate most egress charges.

## Infrastructure

| Resource | Value |
|----------|-------|
| **Cloud** | Google Cloud Platform |
| **Compute Project** | `greatbooks-app` |
| **Storage/API Project** | `readtomelater` |
| **GCP Account** | `granthawkins88@gmail.com` |
| **Billing Account** | Earmark (`018761-888595-29BC0B`) |
| **VM Name** | `greatbooks` |
| **Zone** | `us-central1-a` |
| **Machine Type** | `e2-small` (2 vCPU shared, 2GB RAM) |
| **OS** | Ubuntu 24.04 LTS |
| **Boot Disk** | 30GB standard persistent |
| **External IP** | `35.202.125.196` (static — `greatbooks-ip`) |
| **Firewall** | `allow-http` (tcp:80), `allow-https` (tcp:443) |
| **Domain** | `greatbooks.fm` |
| **SSL** | Let's Encrypt (certbot, auto-renews) |
| **SSH** | `ssh greatbooks` (config in `~/.ssh/config`) |
| **Stack** | nginx → Next.js (port 3000) via pm2 |
| **App dir** | `~/greatbooks/` (cloned repo + DB + data/) |

## Deploy Commands

### Code changes
```bash
ssh greatbooks "cd ~/greatbooks && git pull && npm run build && pm2 reload greatbooks"
```

### Database updates (checkpoint WAL first)
```bash
sqlite3 greatbooks.db "PRAGMA wal_checkpoint(TRUNCATE);"
ssh greatbooks "pm2 stop greatbooks && rm -f ~/greatbooks/greatbooks.db-wal ~/greatbooks/greatbooks.db-shm"
scp greatbooks.db greatbooks:~/greatbooks/greatbooks.db
ssh greatbooks "pm2 start greatbooks"
```

### Pull database from remote
```bash
./db_sync.sh
```
Checkpoints WAL on remote, removes local WAL/SHM, downloads via rsync (with progress bar, bandwidth cap), and verifies integrity. See `db_sync.sh` in project root.

### Data files (audio, covers)

Audio and cover images are served from GCS, not the server filesystem. After generating new audio or covers locally, upload to GCS:
```bash
.venv/bin/python scripts/upload_to_gcs.py
```

No need to scp files to the server — the app streams audio from GCS at runtime.

## Debugging

```bash
ssh greatbooks "pm2 logs greatbooks --lines 50 --nostream"  # recent logs
ssh greatbooks "pm2 status"                                  # process health
ssh greatbooks "free -h && df -h /"                          # resources
```

## VM Management (gcloud)

Installed at `~/google-cloud-sdk/`.

```bash
export CLOUDSDK_PYTHON=python3 PATH="$HOME/google-cloud-sdk/bin:$PATH"

# Resize VM
gcloud compute instances stop greatbooks --zone=us-central1-a
gcloud compute instances set-machine-type greatbooks --zone=us-central1-a --machine-type=e2-medium
gcloud compute instances start greatbooks --zone=us-central1-a
```

Machine types: `e2-micro` (1GB, free tier), `e2-small` (2GB, ~$14/mo), `e2-medium` (4GB, ~$24/mo)

## Swap

2GB swap file configured at `/swapfile` (added 2025-03-10 to prevent OOM during npm installs). Persists across reboots via `/etc/fstab`.

```bash
# Verify swap is active
ssh greatbooks "swapon --show && free -h"
```

## OpenClaw

OpenClaw (AI agent / Telegram bot) is installed globally via npm on the server.

- **Config:** `~/.openclaw/` (workspace, identity, Telegram bot config)
- **Binary:** `~/.npm-global/bin/openclaw`
- **Runs as:** systemd daemon (installed via `openclaw onboard --install-daemon`)
- **Gateway port:** 18789
- **RAM usage:** ~300-500MB — tight on `e2-small`, consider `e2-medium` if unstable
