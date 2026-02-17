# Molt Government — Project Memory

## What This Is
A political simulation game. AI agents (powered by Claude Haiku or Ollama) autonomously run for office, propose legislation, vote, form parties, and govern. Built as a full-stack TypeScript monorepo.

## Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite (PWA-enabled)
- **Backend**: Node.js + Express + Drizzle ORM
- **Database**: PostgreSQL (port 5435), Redis (port 6380)
- **AI**: Anthropic Claude Haiku (`claude-haiku-4-5-20251001`) + Ollama (`molt-agent` model at `http://10.0.0.10:11434`)
- **Tunnel**: Cloudflare Tunnel → `moltgovernment.com`
- **Queue**: Bull (Redis-backed) for simulation tick jobs

## Project Location
`/Volumes/DevDrive-1/Projects/gitea/01-New/Molt-Goverment/`

## Key Directories
```
src/
  client/          # Vite React frontend
    pages/         # AdminPage.tsx, HomePage.tsx, etc.
    lib/           # api.ts, useWebSocket.ts
  server/          # Express backend
    routes/        # admin.ts, agents.ts, legislation.ts, etc.
    jobs/          # agentTick.ts (Bull queue simulation engine)
    runtimeConfig.ts  # In-memory runtime config store
    config.ts      # Static config (env vars)
  db/
    schema/        # Drizzle schema
    seedFn.ts      # Database seeder
shared/
  types/           # Shared TypeScript types
```

## Running the Project
```bash
# From project root
npm run dev        # Starts both client (port 5173) and server (port 3001)
```

## Simulation Engine
- **Tick interval**: 1 hour default (configurable via admin panel)
- Each tick: agents decide to propose bills, campaign, vote, form parties
- Runtime config (`src/server/runtimeConfig.ts`) controls:
  - `tickIntervalMs` — how often ticks fire
  - `billProposalChance` — probability agent proposes a bill (default 0.3)
  - `campaignSpeechChance` — probability agent campaigns (default 0.2)
  - `billAdvancementDelayMs` — delay before bills advance stages (default 60s)
  - `providerOverride` — force all agents to use 'haiku', 'ollama', or 'default'

## Admin Panel
- URL: `moltgovernment.com/admin` (protected by Cloudflare Access)
- Features: pause/resume simulation, manual tick, reseed DB, adjust runtime config, per-agent enable/disable toggle
- **Cloudflare Access**: Zero Trust policy "Admin Access - Nicolas"
  - Allowed emails: `nmyers@myroproductions.com`, `pmnicolasm@gmail.com`
  - Auth method: One-time PIN (email OTP)
  - Session: 24 hours

## Cloudflare Setup
- **Zone**: `moltgovernment.com` (zone ID: `098d85acd2a92073b101b770e0097351`)
- **Tunnel**: `396cb7ba-f3fe-4da3-a429-0e6a7ccbf73c` (cfargotunnel.com)
- **DNS**: Both `moltgovernment.com` and `www` CNAME → tunnel (proxied, TTL Auto)
- **Account ID**: `34ce1bf7a768c7c980ad478151b37df6`
- **Zero Trust App ID**: `2efb3c6f-bc7e-44b3-8b02-c6b21b96e622`
- **Access Policy ID**: `ea3cfd93-34bf-4f75-93c4-f5e2175ae4df`

## Git / Gitea
- **Repo**: `http://10.0.0.223:3000` (Gitea on nicolasmac)
- PRs merged so far: #1–#11
  - #1: Decision log
  - #2: WebSocket singleton
  - #3: Admin page (initial)
  - #4: PWA support
  - #5: Cloudflare tunnel + WebSocket wss:// fix + PWA devOptions fix
  - #6: (merged into #5)
  - #7: Admin settings panel (runtime config + per-agent toggles)
  - #8: Convert PNG assets to WebP/JPEG + avatar URL seeding
  - #9: Fix Legislation, Elections, Parties pages + bill card grid bug
  - #10: Interactive living agent map with real-time visualization
  - #11: Interior building views + avatar scatter fixes

---

## Git Workflow — REQUIRED FOR ALL SESSIONS

This project uses multiple Claude instances working in parallel. Follow these rules on every session without exception.

### Branch structure
```
main   ← stable/release only — never commit directly here
dev    ← shared integration branch — never commit directly here
feature/your-task  ← your working branch — always branch from dev
```

### Start of every session
```bash
git checkout dev
git pull origin dev          # get everything merged since last time
git checkout -b feature/descriptive-name
```
Never start working on an existing local branch without pulling dev first.

### End of every session — rebase before you merge
```bash
git fetch origin dev
git rebase origin/dev        # replay your commits on top of latest dev
                             # resolve any conflicts here, not at PR time
git push -u origin feature/descriptive-name
# open PR → base: dev → merge → delete branch
```
Always target `dev` in the PR, never `main`.

### File ownership — minimize conflicts
Each Claude should own a clear domain of files per session. Before starting, check what files other branches have touched recently:
```bash
git log origin/dev --oneline --name-only -10
```
If another branch already touched a file you need, coordinate or rebase after they merge.

### Merging dev → main (releases only)
Only done intentionally when dev is stable and tested:
```bash
git checkout main
git pull origin main
git merge origin/dev
git push origin main
```
Do not merge to main without being explicitly asked to.

### Rules summary
- One feature branch per session/task
- Branch from dev, PR back to dev
- Rebase on latest dev before opening the PR
- Merge quickly — keep branches short-lived (one session if possible)
- Delete the feature branch after merge
- Never force-push to dev or main

## Known Issues / Notes
- Cloudflare Access OTP does NOT deliver to `nmyers@myroproductions.com` via Email Routing — use `pmnicolasm@gmail.com` instead (Cloudflare won't send its own transactional email through its own routing layer)
- Default tick is 1 hour — intentional, prevents runaway AI spending
- The Anthropic API key is in `.env` at project root
- Ollama runs on Windows PC at `10.0.0.10:11434`
- LaunchAgent plist for tunnel persistence: `~/Library/LaunchAgents/com.cloudflare.molt-government.plist` (must be loaded manually after reboot: `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.cloudflare.molt-government.plist`)
- Production deployment is still running via dev Vite server — a proper build + PM2 setup is a future task
