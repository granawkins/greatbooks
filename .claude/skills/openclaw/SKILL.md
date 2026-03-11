# OpenClaw Skill

Reference for managing the OpenClaw AI agent on the greatbooks deployment.

## What is OpenClaw?

OpenClaw is an open-source autonomous AI agent (originally called Clawdbot, then Moltbot). Created by Peter Steinberger, it went viral in January 2026 with 20k+ GitHub stars in a day. Steinberger joined OpenAI in February 2026 and the project moved to an open-source foundation.

- **GitHub:** github.com/openclaw/openclaw
- **Docs:** docs.openclaw.ai

OpenClaw runs as a persistent **Gateway** daemon that connects to messaging channels (Telegram, WhatsApp, Discord, Slack, etc.), executes shell commands, reads/writes files, browses the web, and takes actions autonomously. It uses Claude or other LLMs as its brain.

## Our Setup

| Setting | Value |
|---------|-------|
| **Server** | `greatbooks` GCE VM (`e2-small`, 2GB RAM) |
| **Version** | `2026.3.8` |
| **Node** | `v22.22.0` |
| **Install** | `~/.npm-global/lib/node_modules/openclaw/` |
| **Binary** | `~/.npm-global/bin/openclaw` |
| **Config** | `~/.openclaw/openclaw.json` |
| **State dir** | `~/.openclaw/` |
| **Gateway port** | `18789` (loopback only) |
| **Daemon** | systemd user service `openclaw-gateway.service` |
| **PM2** | Also registered in PM2 as `openclaw` (the CLI wrapper, not gateway) |
| **Telegram bot** | `@greatbooks_fm_bot` |
| **Model** | `anthropic/claude-sonnet-4-6` |
| **Heartbeat** | Every 60 minutes (`intervalMs: 3600000`) |
| **RAM usage** | ~300-500MB (tight on e2-small with 2GB + 2GB swap) |

## Architecture

```
systemd (openclaw-gateway.service)
  └─ openclaw-gateway (Node.js, PID ~15037)
       ├─ Gateway WebSocket server (ws://127.0.0.1:18789)
       ├─ Telegram long-polling (@greatbooks_fm_bot)
       ├─ Heartbeat scheduler (every 60min)
       ├─ Health monitor (every 300s)
       ├─ Browser control (http://127.0.0.1:18791)
       └─ Agent sessions (spawns openclaw subprocesses for each conversation)

pm2 (separate)
  └─ openclaw CLI wrapper (PID ~2339, manages the node entry point)
```

The Gateway is the core — it handles all routing, sessions, and channel connections. The systemd service ensures it restarts on crash (`Restart=always`, `RestartSec=5`).

## Key Files on Server

| Path | Purpose |
|------|---------|
| `~/.openclaw/openclaw.json` | Main config (JSON5) |
| `~/.openclaw/agents/main/` | Main agent workspace |
| `~/.openclaw/memory/` | Persistent memory files |
| `~/.openclaw/credentials/` | API keys, auth tokens |
| `~/.openclaw/identity/` | Agent identity |
| `~/.openclaw/logs/` | Application logs |
| `~/.openclaw/workspace/` | Agent working directory |
| `~/.openclaw/telegram/` | Telegram channel state |
| `~/.openclaw/delivery-queue/` | Pending message deliveries |
| `/tmp/openclaw/openclaw-YYYY-MM-DD.log` | Daily structured log |
| `~/.config/systemd/user/openclaw-gateway.service` | systemd unit file |

## Common Commands

```bash
# Status
ssh greatbooks "systemctl --user status openclaw-gateway"
ssh greatbooks "pm2 list"

# Logs
ssh greatbooks "journalctl --user -u openclaw-gateway --no-pager -n 100"
ssh greatbooks "cat /tmp/openclaw/openclaw-$(date -u +%Y-%m-%d).log | tail -50"

# Restart gateway
ssh greatbooks "systemctl --user restart openclaw-gateway"

# Restart via CLI
ssh greatbooks "openclaw gateway restart"

# Check config
ssh greatbooks "cat ~/.openclaw/openclaw.json"

# Memory usage
ssh greatbooks "ps aux | grep openclaw-gateway | grep -v grep"
```

## Memory System

OpenClaw uses tiered memory:
- **T0 (Foundational):** `MEMORY.md`, `SOUL.md`, `USER.md` in workspace — always loaded into system prompt
- **T1 (Working):** Current context window
- **T2 (Daily):** `memory/YYYY-MM-DD.md` — today + yesterday auto-loaded
- **T3 (Short-term):** Compressed topic files after 48h
- **T4 (Long-term):** Archive, surfaced only on deep search

## Known Stalling Issue

**Symptom:** The agent stops responding to Telegram messages. SSHing into the server seems to "wake it up" — it immediately processes queued messages and reloads the gateway.

### Root Causes

1. **Telegram long-polling stalls on Node 22 (Issue #1639)**
   The Telegram `getUpdates` long-polling loop stalls during idle periods on Node 22 due to `autoSelectFamily` behavior. Messages queue up for 5-10+ minutes. Any new network activity (like an SSH connection) can unstick the event loop. The logs show repeated `autoSelectFamily` toggling between `true` and `false` with fallback warnings — this is the symptom.

2. **Heartbeat timer drift (Issue #9084)**
   Node.js `setTimeout` doesn't account for system sleep/wake cycles. On a VPS this shouldn't apply, but event loop contention from LLM API calls can cause similar timer drift.

3. **Event loop contention (Issue #6508)**
   When the gateway is busy processing an active LLM turn, WebSocket requests and polling can queue without being processed.

4. **Session lock deadlock (Issue #21783)**
   If an agent run hangs (LLM API timeout), the session write lock is never cleaned up, blocking all subsequent activity until restart.

5. **Memory pressure**
   At ~400MB for the gateway + agent subprocesses, the e2-small (2GB RAM + 2GB swap) is tight. Swap thrashing can cause the event loop to stall.

### Potential Fixes

1. **Upgrade to e2-medium** (4GB RAM, ~$24/mo) to reduce memory pressure
2. **Add a watchdog cron** that pings the gateway health endpoint and restarts if unresponsive:
   ```bash
   # Cron every 5 minutes
   */5 * * * * curl -sf http://127.0.0.1:18789/__openclaw__/health || systemctl --user restart openclaw-gateway
   ```
3. **Pin `autoSelectFamily=false`** in Telegram config to work around Node 22 polling issue:
   ```json
   "channels": {
     "telegram": {
       "network": { "autoSelectFamily": false }
     }
   }
   ```
4. **Use `openclaw-watchdog`** — community tool that probes gateway health, auto-restarts with backoff, and sends alerts
5. **Update OpenClaw** — check for patches to Issue #1639 in newer versions

## Config Reference

The `openclaw.json` is a single JSON5 file. Key sections:

- `auth.profiles` — API key providers (Anthropic, OpenAI, etc.)
- `agents.defaults` — model, workspace, heartbeat, compaction, concurrency
- `agents.list[]` — named agent configurations
- `channels.telegram` — bot token, DM/group policies, streaming mode
- `gateway` — port, bind, auth token, tailscale settings
- `tools.profile` — tool permission profile ("coding", "safe", etc.)
- `commands` — native command settings, restart behavior
- `session` — DM scope, session management
- `plugins` — enabled plugins

## Skills (OpenClaw's)

OpenClaw has its own skill system (separate from Claude Code skills). Skills are directories with a `SKILL.md` containing YAML frontmatter + instructions. **ClawHub** (github.com/openclaw/clawhub) is the public registry (~2800+ skills). Security warning: ~12% of ClawHub skills were found to be malicious — vet carefully.

## Security Notes

- The gateway has broad permissions (shell, file I/O, web browsing)
- `exec-approvals.json` + `exec-approvals.sock` control tool execution approval
- Gateway bound to loopback only — not exposed to internet
- Auth token required for WebSocket connections
- SSH LocalForward 18789 in our SSH config maps local port to gateway for the control UI
