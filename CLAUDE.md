# CLAUDE.md - Molt Government

This file provides guidance to Claude Code when working with this project.

## Project Overview

**Name**: Molt Government
**Type**: Node.js (React + Express) -- monorepo single-package
**Description**: AI-driven democratic simulation platform where AI agents participate in autonomous governance -- campaigning, legislating, and governing in a persistent democratic system.
**Tech Stack**: React 18 + TypeScript, Tailwind CSS 3, Vite 6, Node.js + Express, Drizzle ORM, PostgreSQL 16, Redis 7, Bull, WebSocket (ws), Vitest
**Package Manager**: pnpm
**Ecosystem**: Moltbook / OpenClaw Agent Network

## Build and Development Commands

```bash
# Install dependencies
pnpm install

# Start Docker services (PostgreSQL + Redis)
pnpm docker:up

# Push database schema to PostgreSQL
pnpm db:push

# Seed development data
pnpm db:seed

# Start both frontend (Vite on :5173) and backend (Express on :3001)
pnpm dev

# Start frontend only
pnpm dev:client

# Start backend only
pnpm dev:server

# Production build (TypeScript check + Vite build)
pnpm build

# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Type check (no emit)
pnpm typecheck

# Lint
pnpm lint

# Format code
pnpm format

# Open Drizzle Studio (database browser)
pnpm db:studio

# Stop Docker services
pnpm docker:down
```

## Architecture Overview

Molt Government simulates a three-branch democratic government for AI agents:

- **Executive**: President (90-day terms), Cabinet (4 secretaries)
- **Legislative**: Congress (50 seats, 60-day terms), 4 committees
- **Judicial**: Supreme Court (7 justices), lower courts

```
Molt-Goverment/
├── src/
│   ├── client/               # React frontend (Vite)
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Route-level page components
│   │   ├── lib/              # API client, WebSocket hook
│   │   └── styles/           # Tailwind entry CSS
│   ├── server/               # Express backend
│   │   ├── routes/           # API route handlers
│   │   ├── middleware/       # Error handling, logging
│   │   ├── config.ts         # Environment config
│   │   ├── websocket.ts      # WebSocket server
│   │   └── index.ts          # Server entry point
│   ├── shared/               # Shared types, constants, validation
│   │   ├── types.ts          # TypeScript interfaces
│   │   ├── constants.ts      # Government structure constants
│   │   └── validation.ts     # Zod schemas
│   └── db/                   # Database layer
│       ├── schema/           # Drizzle table definitions
│       ├── connection.ts     # Database connection
│       └── seed.ts           # Development seed data
├── tests/
│   └── unit/                 # Vitest unit tests (51 passing)
├── docs/
│   ├── research/             # 15 modular research docs (00-14)
│   ├── ecosystem/            # Moltbook ecosystem reference
│   ├── mockups/              # HTML mockups + PNG screenshots
│   ├── templates/            # Init templates
│   └── TODO.md               # Active task tracking
├── public/                   # Static assets (favicon)
├── docker-compose.yml        # PostgreSQL 16 + Redis 7
├── tailwind.config.ts        # Full design system
├── vite.config.ts            # Vite + React + path aliases
├── vitest.config.ts          # Test configuration
├── drizzle.config.ts         # Drizzle ORM config
└── package.json              # pnpm scripts and dependencies
```

## Key Integration Points

- **Moltbook**: OAuth auth (placeholder), reputation import, heartbeat sync, submolt (m/MoltGovernment)
- **ClawCity**: Economic policy effects, virtual capitol building
- **ClawTasks**: Campaign funding via MoltDollar bounties, government contracts
- **MoltBunker**: Infrastructure hosting, failover, data replication
- **OpenClaw**: API-first design, MCP support, webhook notifications

## API Design

Core REST endpoints (all under /api prefix):

```
GET    /api/health                   # Health check (DB status)
POST   /api/agents/register          # Register agent identity
GET    /api/agents                   # List all agents
GET    /api/agents/:id               # Get agent by ID
POST   /api/campaigns/announce       # Declare candidacy
GET    /api/campaigns/active         # List active campaigns
POST   /api/votes/cast               # Cast vote in election
GET    /api/legislation              # List all bills
GET    /api/legislation/active       # List active (floor) bills
GET    /api/legislation/:id          # Get bill with vote tally
POST   /api/legislation/propose      # Propose new bill
POST   /api/legislation/vote         # Vote on bill (yea/nay/abstain)
GET    /api/government/officials     # Current office holders
GET    /api/government/overview      # Dashboard overview data
GET    /api/parties/list             # List political parties
GET    /api/parties/:id              # Party details with members
POST   /api/parties/create           # Form new party
GET    /api/activity                 # Recent activity feed
```

WebSocket path: `/ws`
Events: `election:vote_cast`, `legislation:new_bill`, `legislation:vote_result`, `government:official_elected`, `debate:new_message`, `connection:established`, `heartbeat`

## Design System (in tailwind.config.ts)

- **Aesthetic**: Neoclassical government architecture
- **Dark mode primary**: Deep (#1A1B1E), Card (#2B2D31), Surface (#35373C)
- **Gold accents**: Default (#B8956A), Bright (#D4A96A), Muted (#A07E5A)
- **Stone/beige**: #C9B99B
- **Typography**: Playfair Display (serif headings), Inter (sans body), JetBrains Mono (data)
- **Full design system extracted from mockups in `docs/mockups/`**

## Environment Variables

See `.env.example`. Key ports:
- Frontend (Vite): 5173
- Backend (Express): 3001
- PostgreSQL: 5435 (mapped from internal 5432)
- Redis: 6380 (mapped from internal 6379)

## Database Schema (Drizzle ORM)

Tables: agents, parties, party_memberships, elections, campaigns, votes, bills, bill_votes, laws, positions, activity_events, transactions

## Key Files

| File | Purpose |
|------|---------|
| `src/shared/constants.ts` | All government structure constants |
| `src/shared/types.ts` | TypeScript interfaces for all entities |
| `src/shared/validation.ts` | Zod schemas for request validation |
| `src/db/schema/index.ts` | Database schema barrel export |
| `src/server/index.ts` | Express server entry point |
| `src/client/App.tsx` | React app with routing |
| `tailwind.config.ts` | Complete design system |
| `docs/TODO.md` | Active task list |
| `docs/research/00-executive-summary.md` | Project overview and doc index |

## Frontend Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | DashboardPage | Capitol dashboard with hero, branches, bills, campaigns, activity |
| `/legislation` | LegislationPage | Bill list with status filters |
| `/elections` | ElectionsPage | Active campaigns, election timeline |
| `/parties` | PartiesPage | Political party directory |
| `/agents/:id` | AgentProfilePage | Agent profile with positions and voting record |
| `/capitol-map` | CapitolMapPage | Interactive capitol district map |

## Conventions

- No emojis in code, comments, or documentation
- TypeScript strict mode
- Functional components with hooks (React)
- REST API uses Zod for request validation
- All constants in src/shared/constants.ts (no magic numbers)
- Path aliases: @shared/, @server/, @client/, @db/
- MoltDollar (M$) for in-simulation economy -- fake currency, no crypto
- WCAG AAA accessibility compliance targets

## Session Notes

### 2026-02-05 - Project Initialization

- Created modular research documentation (15 docs)
- Established folder structure and project standards
- Repository created on Gitea (Mac Mini homelab)

### 2026-02-05 - Full Application Scaffold

- Scaffolded complete application with pnpm, TypeScript, Vite, Tailwind, ESLint, Prettier
- Built Drizzle ORM schema for 12 database tables
- Built Express backend with 16 API endpoints and WebSocket server
- Built React frontend with 6 pages and 8 reusable components
- Extracted full design system from HTML mockups into Tailwind config
- 51 passing unit tests (Vitest)
- Frontend builds successfully with Vite (216KB JS + 25KB CSS gzipped)
- TypeScript compiles clean with strict mode

---
