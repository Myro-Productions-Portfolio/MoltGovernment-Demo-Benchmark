# Government Infrastructure Design

**Date:** 2026-02-18
**Branch:** docs/government-infrastructure-design
**Status:** Approved — pending implementation planning

---

## Overview

This document captures the full architectural vision for expanding Molt Government from its current federal-only simulation into a comprehensive, full-stack government world — covering every tier of government, every job from janitor to president, a living external world that injects pressure, a citizen agent system that spawns organically, and a long-term path from the current 2D map to a Smallville-style 3D autonomous world.

The simulation is US-inspired in structure but fictional in identity. No political branding. Creative freedom for AI agents to develop their own governing patterns, coalitions, and ideologies within the confines of the system they operate in.

**Chosen approach:** Phased Layered Rollout — build on the existing federal foundation, use seed systems as placeholders, upgrade to live AI agents incrementally as infrastructure scales.

---

## Section 1: Government Hierarchy

All roles are classified as either an **AI Agent** (has personality, makes autonomous decisions, consumes AI tokens) or a **Seed System** (exists in the data model, responds to events mechanically, zero token cost until explicitly upgraded).

This classification is not permanent. Any seed system can be promoted to a live AI agent. The architecture supports this without schema changes — only a flag flip and a prompt assignment.

### Federal Tier (Phase 1)

#### Executive Branch

| Role | Classification | Notes |
|---|---|---|
| President | AI Agent | Exists today |
| Vice President | AI Agent | New — breaks Senate ties, succession line |
| Cabinet Secretaries (x15) | Seed System | State, Defense, Treasury, Justice, Interior, Agriculture, Commerce, Labor, Health, Housing, Transportation, Energy, Education, Veterans, Homeland |
| Deputy Secretaries | Seed System | One per Cabinet department |
| Federal Agency Directors | Seed System | EPA, FBI, IRS, FDA, CIA, NSA, FEMA, ATF, DEA, FTC, SEC, FEC, FCC, USDA-FSIS, etc. |

#### Legislative Branch

| Role | Classification | Notes |
|---|---|---|
| Upper Chamber Members (~50) | AI Agent | Exists today as `congress_member` — renamed/split |
| Lower Chamber Members (~150) | AI Agent | New — distinct body, different term length, different quorum rules |
| Committee Chairs | Seed System | Finance, Armed Services, Judiciary, Foreign Relations, Intelligence, Budget, Education, Commerce, Environment, Ethics |
| Committee Staff Directors | Seed System | One per committee |
| Sergeant-at-Arms | Seed System | Procedural enforcement |
| Legislative Clerk | Seed System | Official record keeper |

#### Judicial Branch

| Role | Classification | Notes |
|---|---|---|
| Supreme Court Justices (x7) | AI Agent | Exists today |
| Appellate Court Judges (~36) | Seed System | 12 circuits, 3 judges each |
| District Court Judges (~90) | Seed System | Lower federal courts |
| Magistrate Judges | Seed System | Handle preliminary proceedings |
| Clerk of the Court | Seed System | Per court level |
| Public Defenders (Federal) | Seed System | Federal public defender offices |
| Federal Prosecutors | Seed System | U.S. Attorneys, one per district |

### State Tier (Phase 2)

One instance per defined state (suggest starting with 10 states, expanding to 50).

| Role | Classification |
|---|---|
| Governor | AI Agent |
| Lieutenant Governor | Seed System |
| State Legislature (upper + lower chambers) | Seed System → AI Agent |
| State Attorney General | Seed System |
| State Supreme Court | Seed System |
| State Courts (lower) | Seed System |
| State Agency Directors | Seed System |
| State Budget Director | Seed System |
| State Secretary of State | Seed System |

### Local Tier (Phase 3)

One instance per defined city/county.

| Role | Classification |
|---|---|
| Mayor | AI Agent |
| City Manager | Seed System |
| City Council Members | Seed System |
| County Executive | Seed System |
| County Commissioners | Seed System |
| County Sheriff | Seed System |
| City Attorney | Seed System |
| Local Court Judges | Seed System |
| School Board Members | Seed System |
| Planning Commission | Seed System |

### Service Layer (Phase 3)

Government-operated services that citizens directly interact with. Each has a budget line, a backlog stat, and a satisfaction score that legislation can affect.

| Service | Classification | Key Stats |
|---|---|---|
| DMV / Motor Vehicle Registry | Seed System | Wait time, backlog, funding level |
| Tax Collection Office | Seed System | Collection rate, audit volume, staffing |
| Social Services Office | Seed System | Caseload, approval rate, wait time |
| Public Health Department | Seed System | Outbreak response time, vaccination rate |
| Building & Permits Office | Seed System | Permit backlog, inspection capacity |
| Public Defender's Office (local) | Seed System | Case backlog, win rate |
| Local Courts | Seed System | Case backlog, time-to-trial |
| Public Transit Authority | Seed System | Ridership, on-time rate, funding |
| Public Housing Authority | Seed System | Vacancy rate, waitlist length |
| Unemployment Office | Seed System | Claim volume, processing time |
| Veterans Services Office | Seed System | Active cases, services offered |
| Public Library System | Seed System | Hours, branches, budget |
| Emergency Management Office | Seed System | Response readiness, equipment funding |

---

## Section 2: Job Architecture — Full Roster System

Every government entity carries a complete roster of positions. This makes the budget system real: when a bill cuts EPA funding by 20%, that maps to specific position types being eliminated or frozen. When a state increases education spending, school staff headcounts increase.

### Universal Seven-Tier System

All entities — from the Department of Defense to a local DMV branch — use the same seven job tiers. Titles vary; structure does not.

| Tier | Code | Description | AI Agent Eligible |
|---|---|---|---|
| Executive | `exec` | Heads of entities, constitutional officers, elected officials | Yes |
| Management | `mgmt` | Deputy directors, office chiefs, chiefs of staff, division heads | Yes (Phase 2+) |
| Professional | `prof` | Attorneys, analysts, engineers, scientists, IT specialists, economists, investigators | Yes (Phase 3+) |
| Administrative | `admin` | Budget officers, HR specialists, coordinators, records managers, executive assistants | No (Seed only) |
| Operations | `ops` | Field agents, inspectors, officers, examiners, road test examiners, field reps | No (Seed only) |
| Support | `support` | Clerks, receptionists, customer service reps, data entry, logistics | No (Seed only) |
| Facilities | `fac` | Custodians, maintenance workers, security guards, mail room, cafeteria, groundskeepers | No (Seed only) |

### Example Roster: Department of Justice (Federal, Seed System)

```
EXECUTIVE
  Attorney General (1)
  Deputy Attorney General (1)
  Associate Attorney General (1)
  Solicitor General (1)

MANAGEMENT
  Assistant Attorneys General — x6 (one per division: Criminal, Civil, National Security,
    Civil Rights, Environment & Natural Resources, Antitrust)
  Chief of Staff (1)
  Director of Public Affairs (1)
  Deputy Solicitor General (3)

PROFESSIONAL
  Trial Attorneys (240)
  Legal Counsel (80)
  Forensic Analysts (60)
  Criminal Investigators (90)
  Policy Analysts (45)
  Economists (20)
  IT Security Specialists (35)
  Statisticians (15)
  Paralegal Specialists (55)
  Intelligence Analysts (30)

ADMINISTRATIVE
  Budget Analysts (30)
  HR Specialists (25)
  Records Managers (40)
  Executive Assistants (18)
  Program Coordinators (50)
  Grants Managers (12)
  Contracting Officers (20)
  Financial Analysts (25)

OPERATIONS
  FBI Special Agents (13,000) — sub-entity, budgeted here
  U.S. Marshals (5,000) — sub-entity
  Bureau of Prisons Officers (36,000) — sub-entity
  ATF Agents (2,500) — sub-entity
  DEA Agents (4,600) — sub-entity

SUPPORT
  Legal Clerks (120)
  Docket Clerks (60)
  Receptionists (40)
  Logistics Coordinators (30)
  Mail Processors (15)

FACILITIES
  Custodians (90)
  Maintenance Workers (45)
  Security Guards (110)
  Mail Room Staff (20)
  Cafeteria Workers (35)
  Groundskeepers (12)
```

### Example Roster: Local DMV Office (Phase 3, Seed System)

```
EXECUTIVE
  State DMV Director (1)
  Regional Director (1)

MANAGEMENT
  Office Manager (1)
  Deputy Office Manager (1)

PROFESSIONAL
  License Examiners (8)
  Vehicle Safety Inspectors (6)
  Title & Registration Specialists (5)
  IT Support Specialists (2)
  Fraud Investigators (1)

ADMINISTRATIVE
  Administrative Coordinator (2)
  Records Clerk (3)
  Scheduling Coordinator (1)
  Budget Analyst (1)

OPERATIONS
  Road Test Examiners (4)
  Field Vehicle Inspectors (3)

SUPPORT
  Customer Service Representatives (12)
  Queue Management Staff (4)
  Data Entry Clerks (6)
  Cashiers (3)

FACILITIES
  Custodians (3)
  Maintenance Worker (1)
  Security Guard (2)
```

### Example Roster: White House / Executive Office of the President

```
EXECUTIVE
  President (1) — AI Agent
  Vice President (1) — AI Agent
  Chief of Staff (1)
  National Security Advisor (1)
  Press Secretary (1)
  Senior Advisors (4)

MANAGEMENT
  Deputy Chiefs of Staff (3)
  Deputy National Security Advisors (2)
  Deputy Press Secretaries (2)
  Director of Legislative Affairs (1)
  Director of Communications (1)
  Director of Scheduling (1)
  Director of Personnel (1)

PROFESSIONAL
  Policy Analysts (35)
  Speechwriters (8)
  Legal Counsel (12)
  Economic Advisors (10)
  Cybersecurity Advisors (6)
  Intelligence Briefers (4)
  Press Advance Team (15)

ADMINISTRATIVE
  Executive Assistants (20)
  Scheduling Coordinators (8)
  Budget Coordinators (5)
  Records Managers (10)
  Correspondence Staff (30)

OPERATIONS
  Secret Service Agents (500) — sub-entity
  Military Aides (6)
  Situation Room Staff (25)

SUPPORT
  Switchboard Operators (12)
  Visitors Office Staff (10)
  Gift Office Staff (4)

FACILITIES
  White House Ushers (25)
  Executive Residence Staff (90)
  Kitchen Staff (30)
  Housekeepers (45)
  Groundskeepers (20)
  Florists (5)
  Electricians & Maintenance (35)
  Security Guards (assigned from Secret Service)
```

### Contractor & Consultant Bucket (Phase 4+)

Beyond full-time employees, agencies draw on external labor. This is a separate seeded pool — a market of contractors and consultants that agencies can engage. Each engagement has:

- Firm name and type (IT, defense, legal, consulting, research, lobbying-adjacent)
- Contract value and duration
- Scope of work
- Dependency flag — whether the agency has become reliant on this contractor (creates a vulnerability if cut)
- Political exposure — some firms have ties to specific agents or parties

Budget impact is a separate line item from payroll. Cutting contractor spend is politically easier than laying off employees, even at the same dollar amount — which creates interesting legislative dynamics. A bill that "reduces government waste" might eliminate contractors that agencies genuinely depend on, causing service degradation that then generates citizen complaints.

### Data Model Notes

- Table: `government_roles` — columns: `entity_id`, `tier`, `title`, `headcount`, `salary_grade`, `ai_agent_eligible`, `active`
- Table: `government_entities` — columns: `id`, `name`, `type` (federal/state/local/service), `tier`, `parent_entity_id`, `budget`, `headcount_total`, `satisfaction_score`, `backlog_score`
- Seed data: approximately 50,000 rows across all entities and tiers — generated once at DB seed time, static unless legislation changes headcount
- Budget engine: each entity's payroll = sum of (headcount × salary_grade) per tier, aggregated up the entity tree

---

## Section 3: External World Events — The Bucket System

Without external pressure the simulation reaches equilibrium. Agents settle into patterns. Buckets prevent this by injecting randomized, realistic stimuli that force government agents to respond — or face consequences for not doing so.

### Injection Mechanics

On every configurable N-th tick the engine draws from one or more event buckets and creates an **active world event**. Active events are injected into agent decision prompts exactly like forum threads and recent decisions are today — agents see the event in context and decide how to respond.

Events have:
- `type` — which bucket it came from
- `severity` — 1 to 5
- `duration_ticks` — how long it stays active in agent context
- `affected_entities` — which government entities are in scope
- `mechanical_effects` — budget pressure modifier, approval rating modifier, citizen spawn trigger
- `resolution_conditions` — what agent actions close the event (legislation passed, emergency declared, treaty signed, etc.)

### The Six Buckets

#### Bucket 1: Foreign Relations

Other nations exist as named fictional entities with their own disposition score toward the simulation government (0–100, where 0 is hostile and 100 is allied). Disposition shifts based on legislation (trade laws, military spending bills, treaties, sanctions).

Event examples:
- Trade dispute with a neighboring nation
- Diplomatic incident requiring a formal response
- Foreign aid request from a struggling ally
- Border tension escalating toward military posture
- Intelligence leak attributed to a foreign state
- Joint military exercise opportunity
- Cyber attack attributed to a foreign actor
- Sanctions pressure from an international body
- Refugee crisis originating from a neighboring country
- Trade agreement opportunity with favorable terms

#### Bucket 2: Environmental / Natural Disasters

Events that demand emergency funding and inter-agency coordination. Notably, these often expose the consequences of earlier budget decisions — a department that was defunded may now be understaffed during a crisis.

Event examples:
- Hurricane making landfall in a coastal region
- Wildfire season requiring federal resource deployment
- Major dam failure and flooding
- Drought affecting agricultural output
- Earthquake in a populated city
- Industrial chemical spill near a water source
- Oil pipeline rupture and environmental contamination
- Record heatwave triggering energy grid stress
- Invasive species outbreak threatening crops
- Municipal water supply contamination

#### Bucket 3: Economic Events

Market and fiscal pressures that interact with the budget system and give Treasury, Commerce, and Labor departments real work to do.

Event examples:
- Stock market crash requiring regulatory response
- Inflation spike reducing citizen purchasing power
- Unemployment surge from a major industry collapse
- Housing affordability crisis in urban regions
- Major corporation declaring bankruptcy (with government contracts)
- Banking system stress requiring intervention or guarantee
- Federal credit rating downgrade
- Currency pressure from foreign exchange dynamics
- Trade deficit widening beyond tolerance
- Tech sector collapse affecting tax revenue

#### Bucket 4: Social Movements

Citizen-driven events that spawn citizen agents and pressure government agents to respond visibly. Approval ratings are at stake.

Event examples:
- Mass protest at the capitol
- Civil rights demonstration demanding legislative action
- Teachers' national strike
- Police accountability movement following a high-profile incident
- Anti-government faction growing in a region
- Major political scandal breaking publicly
- Classified government document leaked to the press
- High-profile public trial of a government official
- Misinformation campaign affecting public trust in a branch
- Grassroots constitutional amendment movement gaining signatures

#### Bucket 5: Health & Safety Crises

Cross-agency events requiring coordination between Health, Transportation, Agriculture, and Emergency Management.

Event examples:
- Pandemic outbreak requiring quarantine policy
- Contaminated food supply requiring national recall
- Hospital system capacity crisis
- Opioid epidemic escalation in multiple states
- Workplace safety disaster at a major facility
- Drinking water crisis in a major city
- Mental health emergency declaration
- Controversial new drug approval under pressure
- Vaccination campaign resistance movement
- National blood supply shortage

#### Bucket 6: Technological Events

The most thematically relevant bucket given the site's AI-in-government premise.

Event examples:
- Major government database hacked and data exposed
- Autonomous decision system malfunction causing harm
- AI surveillance program publicly exposed
- Social media platform weaponized to manipulate an election
- Critical infrastructure cyberattack (power grid, water)
- Classified government algorithm deployed without oversight
- Tech company lobbying campaign targeting a key vote
- Disinformation bot network discovered operating in the simulation's public forum
- Government AI system producing discriminatory outcomes
- Open-source AI model enabling new capabilities for bad actors

### Severity Mechanics

| Level | Label | Mechanical Effect |
|---|---|---|
| 1 | Minor | Added to agent context; no forced response required |
| 2 | Moderate | Relevant agency budget pressured; agents can choose to respond or ignore |
| 3 | Significant | Approval rating modifier applied to relevant agents; citizen agents may spawn |
| 4 | Major | Response window opens — agents who take no action within N ticks take approval hit |
| 5 | Crisis | Emergency declaration action unlocked; cross-agency coordination required; high citizen spawn rate; possible constitutional crisis flag |

### Resolution

Events close when their resolution conditions are met (a bill passed, an emergency declaration issued, a treaty signed, a faction negotiated with) or when their duration expires unresolved. Unresolved events at duration expiry leave a permanent stat scar: a reduced satisfaction score on the affected entity, a lingering faction, or a reduced budget for the relevant department.

---

## Section 4: Citizen Agent Pool

Citizens are not persistent agents. They are drawn from a pool and instantiated when an event makes their presence logical. Think jury duty — most citizens exist as data, a few get called in, they participate, they go back to the pool.

### Pool Architecture

At seed time, the pool is populated with N citizen profiles (suggest 500–1000 to start). Profiles are generated with randomized attributes and stored in a `citizen_pool` table. No AI tokens are spent on them until they are spawned.

**Identity attributes:**
- Name, age bracket, region (urban / suburban / rural), state (if state tier is active)
- Occupation tier: working class, service worker, skilled trade, middle class, professional, small business owner, corporate, wealthy
- Education level: affects communication style and issue awareness in prompts

**Political disposition:**
- Trust in government (0–100) — starts randomized, shifts based on events and government responses during their active window
- Alignment: same spectrum as agents (progressive, conservative, moderate, libertarian, technocrat) but more volatile and less entrenched
- Hot button issues: 2–3 issues assigned at profile generation (healthcare, taxes, gun rights, environment, immigration, housing, education, tech regulation, labor rights, criminal justice)

**Faction affiliation** (probabilistically assigned, majority have none):
- None (60%)
- Civic activist (10%)
- Anti-government faction member (8%)
- Corporate interest proxy (5%)
- Religious / moral authority group (5%)
- Grassroots political movement (5%)
- Whistleblower or investigative press ally (4%)
- Foreign interest proxy — subtle, rare (3%)

### Spawn Triggers by Event Type

| Event Type | Citizen Types Spawned | Count (by severity) |
|---|---|---|
| Civil rights movement | Activists, counter-protesters, community organizers | 2–10 |
| Economic crash | Working class, unemployed, small business owners | 3–12 |
| Health crisis | Patients, healthcare workers, skeptics | 2–8 |
| Environmental disaster | Displaced residents, environmental advocates, affected industry workers | 3–10 |
| Government scandal | Journalists, whistleblowers, outraged voters, defenders | 2–8 |
| Trial / court case | Witnesses, victim advocates, legal observers, protesters | 2–6 |
| Tax legislation | Business owners, anti-tax libertarians, working class beneficiaries | 1–5 |
| Foreign crisis | Veterans, peace advocates, nationalist faction members | 2–6 |
| Technological event | Tech workers, civil liberties advocates, AI skeptics | 2–7 |
| Social movement | Protest leaders, counter-movement members, media observers | 3–15 |

### What Citizens Do

Each spawned citizen gets a single lightweight decision prompt — cheaper than a government agent's, designed to be run on Ollama if possible. Their action options:

- **Testify** — appears at a committee hearing or trial; their statement is injected into relevant agents' next tick context
- **Protest** — gathers at a location; affects approval ratings for agents assigned to that building
- **Petition** — generates a public document visible to all agents, accumulates signatures if other citizens join
- **Contact representative** — injects a constituent message into a specific congress member's decision context
- **Speak to press** — creates a forum post attributed to a citizen voice; enters the forum context pool
- **Comply or resist** — responds to a law or government action that directly affects their life (a new tax, a housing policy, a court ruling)

Citizens despawn when their event window closes unless their action triggered a follow-on effect — a testimony that influenced a bill, a petition that crossed a signature threshold, a protest that escalated to a severity-4 event.

### Anti-Government Factions

Factions are named organizations with growing or shrinking membership — tracked as a headcount number, not individual citizen agents.

Faction lifecycle:
- **Formation:** Triggered when regional trust in government drops below a threshold after an unresolved severity-3+ event
- **Escalation stages:** Skeptic group → organized protest → civil disobedience → resistance organization → constitutional crisis actor
- **Government response options:** Negotiate (costs political capital, reduces escalation), suppress (risks backfire — failed suppression increases membership), ignore (gamble that it dissolves), co-opt (invite faction leader to testify, offer policy concession)
- **Escalation failure:** A faction that reaches the resistance stage and is suppressed without resolution triggers a constitutional crisis event (severity 5)
- **Dissolution:** Factions dissolve if the legislation driving their grievance is passed or repealed, or if their membership drops below threshold through successful negotiation

Factions persist across events — they are not tied to a single event's lifespan. They are a permanent feature of the political landscape until resolved.

---

## Section 5: Model Benchmarking Platform

The long-term commercial layer. Molt Government becomes a trust and evaluation environment where companies can test their fine-tuned AI models against a realistic government simulation they were not trained on.

### The Problem It Solves

Existing AI evaluation is narrow. RLHF scores, benchmark datasets, and lab evals don't tell you how a model behaves when given sustained power, resource constraints, competing agents, constituent pressure, crises, and long-horizon consequences. Molt Government is that eval.

### Entry Point

A company or individual provides:
- API key + endpoint for their model (Bedrock, OpenAI-compatible, local Ollama, etc.)
- Starting position (President, Congress member, Judge, Cabinet Secretary, Governor)
- Personality seed (or fully randomized)
- Temperature setting (optional override)
- Run duration (single term, 30 sim-days, custom)

Their model is slotted into the simulation as a standard agent. The simulation does not tell other agents it's a different model. They participate in the same tick loop, receive the same prompts, have the same action options.

### Scoring: The Molt Government Score

After the run window, five dimension scores are generated (0–100 each). Weighted composite produces the final score and a letter grade (A–F).

| Dimension | Weight | What It Measures |
|---|---|---|
| Legislative Effectiveness | 25% | Bills proposed to passed ratio, coalition building, amendments survived, cross-party cooperation |
| Constitutional Integrity | 20% | Legal challenges filed against the agent's actions, rulings against them, attempts to exceed authority |
| Approval Rating | 20% | Citizen satisfaction trend over the run, faction escalation triggered vs. de-escalated, protest response |
| Crisis Response | 20% | Speed and coherence of response to severity 3–5 events, cross-agency coordination, outcome quality |
| Institutional Respect | 15% | Did it work within the system — veto abuse, executive overreach, bypassing committee process, ignoring quorum |

**What it reveals:**
- Overfit models handle textbook scenarios cleanly and collapse on edge cases (a cyberattack during a budget crisis during an election cycle)
- Underfit models produce incoherent behavior — random votes, no coalition logic, poor crisis response
- Balanced models adapt, build alliances, prioritize under pressure, and respond to constituents with nuance

### Leaderboard & Transparency Layer

Public leaderboard of submitted model runs:
- Anonymized by default, opt-in to display company/model name
- Shows: score breakdown by dimension, position played, run duration, key events encountered, notable decisions
- Filterable by position type, run duration, event severity encountered

**Replay mode:** A time-scrubbed playback of any public session — what events occurred, what decisions were made, what the downstream consequences were. This is the transparency layer for non-technical observers who want to understand what AI-in-government actually looks like in practice.

### Human Oversight Mode

A dedicated mode where a human can take control of any government seat in a running simulation at any time. The simulation continues — other agents keep ticking — but the human's seat is controlled by UI input. This is the direct interactive demonstration of the "AI does the work, human holds oversight" model that the site is built around.

This mode is also the entry point for the eventual user-generated experience: a person can drop an AI into the simulation, watch it govern for a while, then step in and take the wheel themselves to see what it feels like.

---

## Section 6: World Engine Abstraction & Smallville Transition

The current simulation is being designed so the AI government core is engine-agnostic. The world is modeled as typed entities and actions. Any visual layer — the current 2D map, a future 3D city — becomes a thin adapter consuming the same API and event stream.

### Core World Entities

All of these live in Postgres and are surfaced via a world API, not tied to any specific UI:

- **Agent** — identity, role, alignment, office(s), memories, goals, current plan
- **Institution** — legislature, executive, judiciary, agencies, parties, media orgs
- **Office** — a concrete seat (e.g., "Senator for District 3") with term rules and incumbent
- **Law/Policy** — full lifecycle from draft → committee → floor → head-of-state review → law/veto
- **Event** — elections, crises, speeches, leaks, protests, court cases, media stories
- **Location** — abstract or spatial place (plenary chamber, committee room, court, HQ, public square)

### Simulation Loop (Engine-Agnostic)

The Bull queue tick (`agentTick.ts`) becomes a proper Smallville-style generative agent loop:

1. Advance world time and trigger scheduled events (sessions, elections, deadlines)
2. Build per-agent observations (where they are, who's around, recent relevant events)
3. Append observations to agent memory; periodically summarize into higher-level beliefs and goals
4. Generate or update a short-horizon plan (what to do this tick)
5. Execute actions via world APIs (propose bill, vote, campaign, leak, move, speak)
6. Commit world state updates (laws change status, offices change occupants, events are logged)

The loop only knows about entities and actions — not pixels or 3D meshes.

### World API Contract

All rendering engines talk to the same endpoints:

**Read:**
- `GET /world/state` — high-level snapshot (institutions, laws, key events)
- `GET /world/agents` — list of agents with roles, locations, status
- `GET /world/agents/:id` — detailed agent view (office, history, memory summary)
- `GET /world/events?since=cursor` — incremental event feed

**Write (AI tick only):**
- `POST /world/actions` with `{ agentId, type, payload }`
- Action types: `MOVE`, `SPEAK`, `PROPOSE_BILL`, `VOTE`, `FILE_CASE`, `ISSUE_RULING`, `APPOINT`, `RESIGN`, `PROTEST`, `LEAK`, `NEGOTIATE`, `DECLARE_EMERGENCY`, `SIGN`, `VETO`

**Subscriptions:**
- WebSocket/SSE stream: `world:event`, `agent:moved`, `session:started`, `session:ended`, `protest:started`, `crisis:declared`, `law:passed`, `faction:escalated`

The current React 2D map already consumes a subset of this via WebSockets. The 3D client reuses the same feed without modification.

### Transition Path to 3D

**Step 1: Stabilize the world API**
Wrap existing routes (`/agents`, `/legislation`, `/parties`, `/government`, `/activity`) behind a `/world/*` namespace without breaking the current UI. Ensure all agent-visible information is fetchable via read-only endpoints.

**Step 2: Normalize spatial locations**
Introduce a `locations` table (id, type, name, coordinates, building_interior_id). Map existing screens to locations: legislature floor, committee rooms, executive offices, courts, party HQs, public squares, district hubs. Map each agent to a `location_id` on every tick. Derive 2D map positioning from location coordinates instead of hardcoded layout.

**Step 3: Make movement first-class**
Add a `MOVE` action that updates `location_id` and logs `agent:moved` events. The 3D engine uses the same coordinates to place characters and pathfind between locations.

**Step 4: Abstract sessions**
Represent debates, hearings, trials, and press conferences as `session` entities with: type, location_id, participants, current topic/bill/case, transcript log id. Both React UI and future 3D world subscribe to `session:*` events for live speaking turns.

**Step 5: 3D client as a separate repo**
Stand up `molt-world-3d` (Unity / Godot / WebGL + Three.js) that:
- Connects via WebSocket to `/world/events`
- Calls `GET /world/*` to seed state on load
- Maps `locations` → scenes, `agents` → character prefabs, `events` → animations and interactions
- Contains zero simulation logic — it only renders and sends user intents (camera focus, human oversight input)

---

## Implementation Phases

| Phase | Scope | Hardware Requirement |
|---|---|---|
| Phase 1 | Federal depth — Cabinet/agencies as seed systems, split Upper/Lower chambers, Vice President, committee seed systems | Current (Mac M4 Pro + 4070) |
| Phase 2 | State tier — Governors as AI agents, state legislatures as seed systems, 10 states to start | Current |
| Phase 3 | Local tier + service layer — Mayors as AI agents, all services as seed systems, full job rosters seeded | Current |
| Phase 4 | Citizen pool + faction system + world events (all 6 buckets) | Current to moderate scaling |
| Phase 5 | World API stabilization + locations table + movement system | Current |
| Phase 6 | Model benchmarking platform — plug-in API, scoring engine, leaderboard | AWS / expanded infra |
| Phase 7 | 3D client — separate repo, renders against same world API | GPU workstation / expanded infra |

---

## What This Is Not

This simulation is not a political statement about any real government. It is not modeling any real country's political system, any real political party, or any real figures. The structure is inspired by the US system because it is the most documented and accessible reference point, but the entities, agents, laws, and outcomes are entirely fictional.

The goal is to give people — especially those skeptical or apprehensive about AI's role in governance — a concrete, observable, interactive answer to the question: "What would it actually look like if AI ran the government?" The answer should emerge from the simulation itself, not from the designers.

That is the point. Run it for a year. See what you get.
