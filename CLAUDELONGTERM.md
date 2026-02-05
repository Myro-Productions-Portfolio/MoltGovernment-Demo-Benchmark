# CLAUDELONGTERM.md - Molt Government

This file tracks long-term patterns, decisions, and learnings about this project.

## Architectural Decisions

### 2026-02-05: Tech Stack Selection

**Decision**: React 18 + TypeScript frontend, Node.js + Express backend, PostgreSQL + Redis

**Rationale**: Matches ClawCity's stack for ecosystem consistency. TypeScript provides type safety across full stack. PostgreSQL handles persistent government records. Redis for real-time vote tallies and session management. Bull for scheduled election processing.

**Status**: Decided

### 2026-02-05: Modular Research Documentation

**Decision**: Break monolithic research into 15 numbered modules under `docs/research/`

**Rationale**: Each topic (mechanics, architecture, design, etc.) is independently reviewable and updatable. Numbered prefix maintains reading order. Cross-linked via executive summary index.

**Status**: Implemented

## Patterns & Conventions

- No emojis anywhere in the project
- Research docs numbered 00-14 with descriptive names
- All docs cross-link back to `00-executive-summary.md`
- Ecosystem reference kept separate from project research

## Known Issues & Gotchas

- Windows creates `nul` artifact files -- add to .gitignore
- Moltbook had a critical security vulnerability (Jan 31, 2026) -- unsecured database. Factor into security design.
- Molt Road flagged by Vectra AI for underground marketplace risks -- consider reputation/trust implications

## Performance Optimizations

- Redis caching for real-time vote tallies
- Bull queue for scheduled election processing (avoid blocking main thread)
- WebSocket for live updates instead of polling
- MoltBunker for 99.99% uptime with geo-redundant replication

## Infrastructure & Credentials

### Gitea Git Server (Mac Mini Homelab)

| Item | Value |
|------|-------|
| Web UI (LAN) | http://10.0.0.223:3000 |
| Web UI (Tailscale) | http://100.85.249.61:3000 |
| SSH Clone (LAN) | ssh://git@10.0.0.223:2222 |
| SSH Clone (Tailscale) | ssh://git@100.85.249.61:2222 |
| Username | MyroProductions |
| Email | pmnicolasm@gmail.com |
| Password | MmisnomerGod_743915 |

### Git Remote (This Project)

| Item | Value |
|------|-------|
| Origin URL | http://100.85.249.61:3000/MyroProductions/Molt-Goverment.git |
| Branch | main |
| Protocol | HTTPS via Tailscale |

### Clone Commands

```bash
# HTTPS (Tailscale -- works from anywhere on tailnet)
git clone http://100.85.249.61:3000/MyroProductions/Molt-Goverment.git

# HTTPS (LAN only)
git clone http://10.0.0.223:3000/MyroProductions/Molt-Goverment.git

# SSH (Tailscale)
git clone ssh://git@100.85.249.61:2222/MyroProductions/Molt-Goverment.git

# SSH (LAN)
git clone ssh://git@10.0.0.223:2222/MyroProductions/Molt-Goverment.git
```

### Mac Mini SSH Access

| Item | Value |
|------|-------|
| User | myroproductions |
| Host (Tailscale) | 100.85.249.61 |
| Host (LAN) | 10.0.0.223 |
| SSH Command | ssh myroproductions@100.85.249.61 |
| Claude Config | /Users/myroproductions/.claude/CLAUDE.md |
| Claude Long-Term | /Users/myroproductions/.claude/CLAUDELONGTERM.md |

### Windows Development Machine

| Item | Value |
|------|-------|
| Hostname | NICMCMDCNTR |
| IP (Tailscale) | 100.94.59.40 |
| RAM | 32GB |
| Storage | C: 1.8TB, D: 1.8TB |
| Project Path | D:\Projects\01-New\Molt-Goverment |

### SSH Key Setup (Windows to Gitea)

Add to `C:\Users\myers\.ssh\config`:
```
Host gitea
    HostName 10.0.0.223
    Port 2222
    User git
    IdentityFile ~/.ssh/id_ed25519
```

Public key to add at http://10.0.0.223:3000/user/settings/keys:
```bash
type C:\Users\myers\.ssh\id_ed25519.pub
```

### AI Command Center API

| Item | Value |
|------|-------|
| Base URL | http://localhost:3939 |
| Health Check | GET /api/health |
| Auth | X-API-Key header (if configured) |

### HashiCorp Vault (Secrets Management)

| Item | Value |
|------|-------|
| URL | http://localhost:8200 |
| Engine | KV v2 at `secret/` |
| Credentials File | `C:\Users\myers\docker\vault\VAULT_CREDENTIALS.txt` |
| Docker Container | `vault` (hashicorp/vault:latest) |
| Config Path | `C:\Users\myers\docker\vault\config\vault-config.hcl` |

**Vault Secret Paths for This Project:**

| Secret | Vault Path | .env Variable |
|--------|-----------|---------------|
| Anthropic API Key | `secret/data/api-keys/anthropic` | `ANTHROPIC_API_KEY` |
| OpenAI API Key | `secret/data/api-keys/openai` | `OPENAI_API_KEY` |
| Supabase (if used) | `secret/data/api-keys/supabase` | `SUPABASE_*` |
| Neon (if used for PG) | `secret/data/api-keys/neon` | `DATABASE_URL` |
| Vercel (deployment) | `secret/data/api-keys/vercel` | `VERCEL_TOKEN` |
| Stripe (payments) | `secret/data/api-keys/stripe` | `STRIPE_*` |
| Web3Forms | `secret/data/api-keys/web3forms` | `WEB3FORMS_*` |

**Reading a secret (CLI):**
```bash
curl -s -H "X-Vault-Token: <TOKEN>" http://127.0.0.1:8200/v1/secret/data/api-keys/<name>
```

**Reading a secret (Docker exec):**
```bash
docker exec vault vault kv get secret/api-keys/<name>
```

**Note:** Never store the root token or unseal key in project files. Reference `VAULT_CREDENTIALS.txt` on the local machine only.

---

**Last Updated**: 2026-02-05
