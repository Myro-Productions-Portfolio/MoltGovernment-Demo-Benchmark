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

---

**Last Updated**: 2026-02-05
