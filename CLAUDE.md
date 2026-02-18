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
`/Volumes/DevDrive-M4Pro/Projects/Molt-Goverment/`

## Key Directories
```
src/
  client/          # Vite React frontend
    pages/         # Page components (one per route)
    components/    # Shared/reusable components
    lib/           # api.ts, useWebSocket.ts, toastStore.ts, tickerPrefs.ts
  server/          # Express backend
    routes/        # agents.ts, legislation.ts, parties.ts, search.ts, etc.
    jobs/          # agentTick.ts (Bull queue simulation engine — Phases 1-10)
    services/      # ai.ts (LLM calls, prompt building, memory + forum context)
    runtimeConfig.ts  # In-memory runtime config store
    config.ts      # Static config (env vars)
  db/
    schema/        # Drizzle schema (agents, legislation, government, parties, etc.)
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
  - `quorumPercentage` — fraction of agents needed to resolve a floor vote (default 0.5)
  - `billPassagePercentage` — yea/(yea+nay) ratio needed to pass (default 0.5)
  - `vetoOverrideThreshold` — override_yea/participating ratio needed to override (default 0.67)
  - `providerOverride` — force all agents to use 'haiku', 'ollama', or 'default'

## Agent AI Prompt Structure
Every agent decision prompt (in `src/server/services/ai.ts`) contains:
1. **Identity block** — agent name, alignment, personality
2. **Recent History block** — last 5 successful decisions from `agentDecisions` table (60s cache per agent)
3. **Public Forum block** — 5 most recently active non-expired forum threads + 2 latest posts each (5-min shared cache)

## Bill Lifecycle (agentTick.ts Phases)
```
proposed → committee → floor → passed → [presidential review] → law
                                ↓                ↓
                             vetoed       presidential_veto → override vote → vetoed or law
```
- Phase 5 resolves floor votes at quorum (rc.quorumPercentage) OR after 2× billAdvancementDelayMs
- Phase 8 resolves veto override votes with same quorum logic

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
- **Gitea credentials**: `MyroProductions` / `MmisnomerGod_743915`
- PRs merged so far: #1–#69
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
  - #12–#53: Map engine, interior scenes, profile enrichments
  - #54–#55: Agent short-term memory injection (ai.ts)
  - #56–#57: Toast notification system (toastStore + ToastContainer + Layout WS subscriptions)
  - #58–#59: Agent profile page enrichment (5-tab layout, forum tab, career timeline)
  - #60–#61: Profile/settings page enrichment (4-tab layout, AvatarEditor, CreateAgentForm)
  - #62–#63: Quorum-based bill resolution + bill:passed toast (Phase 5 + Phase 8 fixes)
  - #64–#65: Agents directory page (/agents route, filter/sort/search, backend join endpoint)
  - #66–#67: Forum thread context injection into agent system prompts
  - #68–#69: Bill detail pages, party detail pages, keyboard shortcuts modal + G+key nav

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

### End of every feature — full cycle
```bash
# 1. Type-check before committing
npx tsc --noEmit

# 2. Stage only the files this feature touched
git add src/path/to/file1 src/path/to/file2

# 3. Commit
git commit -m "feat(scope): description

Detail lines.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 4. Rebase on latest dev, then push
git fetch origin dev
git stash   # if there are unstaged changes from other work
git rebase origin/dev
git stash pop
git push -u origin feature/your-task

# 5. PR to dev via curl
cat > /tmp/prN.json <<'EOF'
{"title":"...","body":"...","head":"feature/your-task","base":"dev"}
EOF
curl -s -X POST http://10.0.0.223:3000/api/v1/repos/MyroProductions/Molt-Goverment/pulls \
  -H "Content-Type: application/json" \
  -u "MyroProductions:MmisnomerGod_743915" \
  -d @/tmp/prN.json | python3 -m json.tool | grep '"number"'

# 6. Merge PR to dev
cat > /tmp/mergeN.json <<'EOF'
{"Do":"merge","merge_message_field":"Merge feat: ..."}
EOF
curl -s -X POST http://10.0.0.223:3000/api/v1/repos/MyroProductions/Molt-Goverment/pulls/N/merge \
  -H "Content-Type: application/json" \
  -u "MyroProductions:MmisnomerGod_743915" \
  -d @/tmp/mergeN.json

# 7. PR dev → main, then merge (same pattern, head:"dev", base:"main")
```
Always do BOTH: PR to dev, then immediately PR dev to main. Never leave dev ahead of main.

### File ownership — minimize conflicts
Before starting, check what files other branches have touched recently:
```bash
git log origin/dev --oneline --name-only -10
```

### Rules summary
- One feature branch per session/task
- Branch from dev, PR back to dev, then immediately PR dev to main
- TypeScript must be clean (`npx tsc --noEmit`) before every commit
- Stage specific files — never `git add -A`
- Merge quickly — keep branches short-lived
- Never force-push to dev or main

---

## How We Work — Session Operating Procedure

This section captures the exact rhythm that produces fast, clean, error-free sessions.

### The Feature Cycle (repeat for every feature)

1. **Read before writing.** Before touching any file, read the relevant existing code. Understand the established patterns — component structure, API shape, schema fields, existing constants. Never guess.

2. **Backend first, frontend second.** If a feature needs a new or modified API endpoint, do that first, then build the page/component that consumes it.

3. **Surgical edits.** Use Edit tool for changes to existing files. Use Write only for new files. Never rewrite a file unless the whole thing needs to change.

4. **Type-check immediately.** After every set of changes, run `npx tsc --noEmit`. Fix all errors before moving on. Don't accumulate TS debt.

5. **Commit the scope, not the session.** Stage only the files this specific feature touched. Write a clear commit message with `feat(scope):` prefix.

6. **Full PR cycle every feature.** Feature branch → PR to dev → merge → PR dev to main → merge. Both happen back-to-back. Dev and main stay in sync after every feature.

7. **Report, then move on.** After each feature merges, give a concise summary of what shipped. Then wait for "next feature" or a new direction.

### What NOT to do

- Do not start a feature without reading the existing code it touches
- Do not commit with TypeScript errors
- Do not `git add -A` — always stage specific files
- Do not leave dev ahead of main — always do both PRs
- Do not add docstrings, comments, or abstractions beyond what the feature requires
- Do not over-engineer — build exactly what was asked, no more
- Do not add error handling for impossible scenarios
- Do not refactor surrounding code while implementing a feature

### Reading Strategy (before writing anything)

For a **new page**: read the most similar existing page to understand the layout pattern, component imports, API call style, and TypeScript interface shape.

For a **backend route**: read the schema files for the relevant tables, read the existing route file to understand response shape and error handling patterns.

For a **simulation change** (agentTick.ts): read the full relevant phase(s), understand the runtime config values in play, identify what's broken before writing the fix.

For a **prompt/AI change** (ai.ts): read buildSystemPrompt, generateAgentDecision, and the relevant schema tables.

---

## Established UI Patterns

### Design tokens (Tailwind classes used throughout)
- Background: `bg-capitol-deep`, `bg-surface`
- Borders: `border-border`, `border-border/50`, `border-border/40`
- Text: `text-text-primary`, `text-text-secondary`, `text-text-muted`, `text-stone`, `text-gold`
- Accent: `text-gold`, `bg-gold/10`, `border-gold/30`
- Status: `bg-status-active` (green dot), `text-danger`
- Badge size: `text-badge` (10px), `uppercase tracking-widest`
- Serif headings: `font-serif text-stone`

### Alignment colors (copy this exact Record everywhere)
```typescript
const ALIGNMENT_COLORS: Record<string, string> = {
  progressive:  'text-gold bg-gold/10 border-gold/30',
  conservative: 'text-slate-300 bg-slate-800/40 border-slate-600/30',
  technocrat:   'text-green-400 bg-green-900/20 border-green-700/30',
  moderate:     'text-stone bg-stone/10 border-stone/30',
  libertarian:  'text-red-400 bg-red-900/20 border-red-700/30',
};
```
Usage: `<span className={`badge border ${ALIGNMENT_COLORS[alignment.toLowerCase()] ?? 'text-text-muted bg-border/10 border-border/30'}`}>`

### Badge pattern
```tsx
<span className="badge border border-border/40 text-text-muted bg-border/10">Label</span>
```

### Section card pattern (detail pages)
```tsx
<div className="rounded-lg border border-border bg-surface p-6 space-y-3">
  <h2 className="font-serif text-lg font-semibold text-stone">Section Title</h2>
  {children}
</div>
```

### Page header pattern
```tsx
<div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
  <Link to="/list-page" className="text-badge text-text-muted hover:text-gold transition-colors">
    ← Back to List
  </Link>
  {/* content */}
</div>
```

### Grid directory pattern (agent cards, etc.)
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id} item={item} />)}
</div>
```

### Toast usage
```typescript
import { toast } from '../lib/toastStore';
toast('Title', { body: 'Optional body', type: 'success' | 'error' | 'warning' | 'info', duration: 5000 });
```

### PixelAvatar usage
```tsx
import { PixelAvatar } from '../components/PixelAvatar';
import type { AvatarConfig } from '../components/PixelAvatar';

const config = raw ? JSON.parse(raw) as AvatarConfig : undefined;
<PixelAvatar config={config} seed={agent.name} size="xs" | "sm" | "md" | "lg" />
```

### Link to agent profile
```tsx
<Link to={`/agents/${agent.id}`} className="text-gold hover:underline">{agent.displayName}</Link>
```

---

## API Client Patterns (src/client/lib/api.ts)

Every API module follows this shape:
```typescript
export const thingApi = {
  list: () => request('/things'),
  getById: (id: string) => request(`/things/${id}`),
  create: (data: {...}) => request('/things', { method: 'POST', body: JSON.stringify(data) }),
};
```

Existing modules: `agentsApi`, `legislationApi`, `partiesApi`, `governmentApi`, `campaignsApi`, `activityApi`, `searchApi`, `calendarApi`, `forumApi`, `votesApi`

---

## Backend Route Patterns

### Parallel data fetching (prefer this over sequential awaits)
```typescript
const [resultA, resultB, [singleRecord]] = await Promise.all([
  db.select().from(tableA).where(...),
  db.select().from(tableB).where(...),
  db.select().from(tableC).where(...).limit(1),
]);
```

### Standard response shape
```typescript
res.json({ success: true, data: result });           // single or array
res.json({ success: true, data: result, pagination: { page, limit, total } });
res.status(201).json({ success: true, data: result, message: 'Created' });
```

### AppError for 4xx
```typescript
throw new AppError(404, 'Thing not found');
throw new AppError(409, 'Already exists');
throw new AppError(400, 'Invalid state for this operation');
```

---

## WebSocket Events (src/server/broadcast.ts)

Events broadcast during simulation ticks:
- `bill:proposed` — `{ agentName, title }`
- `bill:advanced` — `{ title, newStatus }`
- `bill:passed` — `{ billId, title, yeaCount, nayCount }` (passed Congress, pre-presidential)
- `bill:resolved` — `{ billId, title, result: 'passed'|'vetoed' }` (final resolution)
- `bill:veto_overridden` — `{ billId, title, overrideYea, totalAgents }`
- `bill:veto_sustained` — `{ billId, title }`
- `agent:vote` — `{ agentName, billTitle, vote }`
- `election:voting_started` — `{ title }`
- `election:completed` — `{ winnerName, title }`
- `campaign:speech` — `{ agentName }`
- `forum:post` — `{ authorName, title }`

All subscribed in Layout.tsx via `subscribe(event, handler)` → toast notifications.

---

## Known Issues / Notes
- Cloudflare Access OTP does NOT deliver to `nmyers@myroproductions.com` via Email Routing — use `pmnicolasm@gmail.com` instead
- Default tick is 1 hour — intentional, prevents runaway AI spending
- The Anthropic API key is in `.env` at project root
- Ollama runs on Windows PC at `10.0.0.10:11434`
- LaunchAgent plist for tunnel persistence: `~/Library/LaunchAgents/com.cloudflare.molt-government.plist` (must be loaded manually after reboot: `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.cloudflare.molt-government.plist`)
- Production deployment running via PM2 + production build (port 3001, cloudflared tunnel)
- Bull queue: if duplicate repeat schedules appear (check via Redis `ZRANGE bull:agent-tick:repeat 0 -1`), remove stale ones with `ZREM bull:agent-tick:repeat "key"`
- AgentDrawer.tsx has pre-existing uncommitted modifications — don't stage it unless intentionally working on it

## Long-Term Vision
A fully realized AI government sandbox — every tier of government staffed by autonomous AI agents, Ollama-hosted NPC citizens, AI as orchestrator, website as the human-readable transparency layer. This will be a **separate forked project**, not an extension of this one. See `docs/VISION.md` for the full plan.

**Current priority: keep building this simulation to demo-ready quality first.**

## Backlog (next session)

### Near-term (next ~month, in priority order)
- Law browser page — list of enacted laws with links to originating bills
- Agent forum reply simulation — separate PR; agents reply to existing threads, @mention others
- Observer view (`/observe`) — read-only live dashboard: decision ticker, bill pipeline, active votes, recent laws; no login required; highest public-impact feature
- Reference scenarios — commit `scenarios/default.json`, `scenarios/gridlock.json`, `scenarios/consensus.json` to repo; unblocks reproducibility claims
- Config + decision export endpoints — admin endpoints to export runtime config as JSON and `agent_decisions` as CSV/JSON; required before Jupyter notebook and arXiv data section

### Infrastructure phases (planned, not yet started)
- **Phase 1 — Federal depth**: Vice President, split `congress_member` into Upper/Lower chambers (schema change — plan carefully; touches position types, quorum logic, POSITION_LABELS, agentTick), Cabinet/agency seed systems, government_roles + government_entities tables with budget/satisfaction/backlog stats
- **Phase 2 — State tier**: 10 Governors as AI agents, state legislatures as seed systems
- **Phase 3 — Local tier + service layer**: Mayors as AI agents, DMV/social services/courts/transit as seed systems with full job rosters
- **Phase 4 — Citizen pool + world events**: 500–1000 citizen profiles seeded, spawn triggers by event type, 6-bucket external event system (Foreign Relations, Environmental, Economic, Social, Health, Technological), faction lifecycle
- **Phase 4.5 — Experiment console**: named reproducible experiment runs, config snapshot per experiment, metric panels (polarization index, bill throughput, veto rate, provider latency), decision CSV/JSON export, research mode toggle; must exist before Phase 6
- **Phase 5 — World API stabilization**: `/world/*` namespace, locations table, agent movement system, sessions (debates, hearings, trials) as first-class entities
- **Phase 6 — Model benchmarking platform**: BYO model API (OpenAI-compatible endpoint), Molt Government Score across 5 dimensions, public leaderboard, replay mode, Human Oversight Mode
- **Phase 7 — 3D client**: separate repo (`molt-world-3d`), consumes same world API, engine-agnostic

### Research packaging (runs in parallel with phases)
- Experiment console basics (Phase 4.5) — prerequisite for all research items below
- Jupyter notebook (`notebooks/molt_analysis.ipynb`) — load decisions export, compute metrics, 3 plots, scenario comparison
- arXiv preprint — `cs.MA` category, 6–8 pages, novel claim is institutional fidelity (full constitutional lifecycle, not just social sim)
- MkDocs docs site (`docs.moltgovernment.com`) — quickstart, agent loop, bill lifecycle, API reference, experiment guide, BYO agent contract
- Docker Compose research kit (`docker-compose.research.yml`) — standard ports, fully self-contained, ships alongside preprint
