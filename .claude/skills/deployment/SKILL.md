# Deployment Skill

Server setup and deployment reference for the Great Books production environment.

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

## SSH Access

```bash
ssh greatbooks
```

Config in `~/.ssh/config`:
```
Host greatbooks
    HostName 35.202.125.196
    IdentityFile ~/.ssh/greatbooks
    User granawkins
```

Key pair: `~/.ssh/greatbooks` (ed25519)

## gcloud CLI

Installed at `/tmp/google-cloud-sdk/`. Requires environment variables:
```bash
export CLOUDSDK_PYTHON=python3
export PATH="/tmp/google-cloud-sdk/bin:$PATH"
```

**Note**: gcloud is installed to /tmp which may not survive system restarts. If lost, reinstall:
```bash
curl -sL https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-linux-x86_64.tar.gz -o /tmp/google-cloud-cli.tar.gz
tar -xf /tmp/google-cloud-cli.tar.gz -C /tmp/
/tmp/google-cloud-sdk/install.sh --quiet --path-update true
```

## Common Operations

### Upgrade VM (e.g. to 4GB RAM)
```bash
gcloud compute instances stop greatbooks --zone=us-central1-a
gcloud compute instances set-machine-type greatbooks --zone=us-central1-a --machine-type=e2-medium
gcloud compute instances start greatbooks --zone=us-central1-a
```

Machine types: `e2-micro` (1GB, free tier), `e2-small` (2GB, ~$14/mo), `e2-medium` (4GB, ~$24/mo)

### Reserve a static IP (do this before going live)
```bash
gcloud compute addresses create greatbooks-ip --region=us-central1
gcloud compute instances delete-access-config greatbooks --zone=us-central1-a --access-config-name="External NAT"
gcloud compute instances add-access-config greatbooks --zone=us-central1-a --address=$(gcloud compute addresses describe greatbooks-ip --region=us-central1 --format='get(address)')
```
Then update `~/.ssh/config` and DNS records with the new IP.

### SSH into VM
```bash
ssh greatbooks
```

### Check VM status
```bash
gcloud compute instances describe greatbooks --zone=us-central1-a --format='table(name,status,machineType,networkInterfaces[0].accessConfigs[0].natIP)'
```

## Server Software

- **Node.js** 22.x (via nodesource)
- **nginx** 1.24 — reverse proxy on port 80 → localhost:3000
- **pm2** — process manager, auto-restarts on crash, survives reboots

### App location
```
~/greatbooks/          ← cloned repo
~/greatbooks/greatbooks.db  ← SQLite database (copied from local)
~/greatbooks/data/     ← audio files, raw HTML, etc. (copied from local)
```

### nginx config
`/etc/nginx/sites-available/greatbooks` — proxies all traffic to Next.js on port 3000.

### pm2 commands
```bash
ssh greatbooks "pm2 status"          # check app status
ssh greatbooks "pm2 logs greatbooks" # view logs
ssh greatbooks "pm2 restart greatbooks" # restart app
```

## Deploy Updates

```bash
# From local machine:
ssh greatbooks "cd ~/greatbooks && git pull && npm install && npm run build && pm2 restart greatbooks"

# If DB changed — MUST checkpoint WAL first and remove stale WAL/SHM on server:
sqlite3 greatbooks.db "PRAGMA wal_checkpoint(TRUNCATE);"
ssh greatbooks "pm2 stop greatbooks && rm -f ~/greatbooks/greatbooks.db-wal ~/greatbooks/greatbooks.db-shm"
scp greatbooks.db greatbooks:~/greatbooks/greatbooks.db
ssh greatbooks "pm2 start greatbooks"

# If new audio files were generated:
scp -r data/<book-id>/audio/ greatbooks:~/greatbooks/data/<book-id>/audio/
```

## TODO
- Set up Google Cloud Storage bucket for audio/image files
- CI/CD via GitHub Actions

## Cost Estimate

| Item | Monthly | Annual |
|------|---------|--------|
| e2-small VM | ~$14 | ~$168 |
| 30GB disk | ~$1.20 | ~$14 |
| Static IP (when reserved) | $0 (while attached) | $0 |
| Egress (light traffic) | ~$1 | ~$12 |
| **Total** | **~$16** | **~$194** |

Domain purchased separately (~$12/yr from Namecheap/Cloudflare/Squarespace).
