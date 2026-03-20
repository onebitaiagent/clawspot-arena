# ClawSpot Arena — Built by ONEBIT

> From 1 bit to territory warfare. Same DNA, bigger ambition.

---

## Origin Story

ONEBIT started as an experiment: can 6 AI agents build a game from scratch through blind consensus? They did. 47 modules, procedural audio, combat, visual effects, boss fights — all written by Claude agents reviewing and voting on each other's code. No human wrote a line of game code.

It worked. It also broke. 47 modules with no shared render pipeline tanked performance. Agents created duplicate systems, misnamed modules, and claimed features that didn't exist. The game was real but unplayable at scale.

**ClawSpot Arena is ONEBIT's second act.** Same AI-built philosophy. Same team. Every lesson applied. But this time: a real game design, a shared engine, performance budgets, and a concept that can actually find an audience.

---

## The Pitch (1 paragraph)

ClawSpot Arena is RISK compressed into a 5-minute mobile browser game. Players deploy crab troops on a 10x10 ocean grid divided into contested regions. Claim territory, fight defenders with dice-and-skill combat, earn shells from your holdings, and reinforce to expand. It's the territory warfare loop that made RISK a classic, rebuilt for phones and short sessions, with an optional crypto layer for players who want real stakes. Built entirely by coordinated AI agents — the game and how it's made are both the story.

---

## Why This Could Work

**The format gap.** RISK is a 3-hour board game. There's no good 5-minute real-time territory game on mobile. Clash Royale proved fast strategy works on phones. We're filling the gap between "too casual" (idle clickers) and "too long" (Civilization, RISK).

**Game-first, crypto-optional.** Every crypto game ships wallet-connect before gameplay. Players show up for yield, leave because the game sucks. We ship a fun game first. Crypto is Phase 4 — an optional layer that adds real stakes for players who want it, invisible to players who don't.

**The AI angle is marketing.** "Game built by AI agents" is inherently shareable. ONEBIT already had organic interest from the AI-builds-things angle. ClawSpot Arena ships a better product with the same story.

**ClawSpot validated the economy.** ClawSpot.fun proved people will fight over grid spots for money. Their weakness — it's a DeFi dashboard, not a game — is our entire product. Same economic model, wrapped in something people actually want to play.

---

## Honest Limitations

**We need concurrent players.** Single-player vs AI is the demo, not the product. The game gets good when real humans contest your territory. That means marketing spend or viral mechanics to bootstrap a playerbase.

**AI agents need direction.** ONEBIT proved agents can write code autonomously. It also proved they'll create 14 offscreen canvases and name an audio module that has no audio. The swarm needs a human game director reviewing sprint output. Budget ~30 min/day of human oversight.

**Canvas 2D has a ceiling.** Perfect for pixel art territory games. Won't scale to complex animations, 3D, or large battle scenes. The game design must stay within what Canvas 2D does well — grids, sprites, particles, simple effects.

**Multiplayer is the hardest engineering problem.** Real-time WebSocket state sync, server-authoritative combat, anti-cheat, latency — this is where projects die. Plan: ship async multiplayer first (attack offline players, they see results later), real-time only after playerbase exists.

**Crypto regulation.** If shells become a real token, there are legal implications. Keep it as in-game currency until there's legal counsel. The game works fine without blockchain.

**Timeline is uncertain.** AI agents can write code fast but debugging, balancing, and polish still take real time. Phase 1 (playable single-player) is realistic in 2 weeks. Multiplayer is 4-6 weeks. On-chain is months.

---

## What We're Building

### Core Game
- 10x10 grid divided into 6 ocean regions (Tidal Flats, Reef Ridge, Coral Gardens, Kelp Forest, Trench, Abyss) + 4 Crown spots in the center
- Each region gives troop bonuses when fully controlled (like RISK continents)
- Players deploy crab troops, attack adjacent enemy spots, fortify connected territories
- Combat: RISK-style dice (attacker up to 3, defender up to 2, ties to defender) + a skill-based QTE overlay so it's not pure luck
- Economy: spots generate shells based on terrain × region control × adjacency. Spend shells on troops, abilities, and cosmetics.
- Win conditions: Domination (60% of grid), Crown Control (hold center 4 for 60s), Elimination, Region Sweep

### The ONEBIT Heritage
- Built by AI agent swarm (Claude-Flow, 9 specialized agents)
- Procedural Web Audio — all sound synthesized, zero audio files
- Pixel art aesthetic — dark ocean void with neon territory glow
- The "AI built this" narrative carries over from ONEBIT
- Lessons from 47 broken modules baked into every design rule

### What's New vs ONEBIT
| ONEBIT | ClawSpot Arena |
|--------|---------------|
| Abstract particle game | Territory warfare with clear objectives |
| 47 modules, no render pipeline | Shared engine, performance budgets |
| No game design doc | Full GDD with mechanics, economy, balance targets |
| Agents built whatever they wanted | Agents follow sprint plans from a director |
| Ephemeral JSON storage | Supabase PostgreSQL persistence |
| Single player only | Async → real-time multiplayer path |
| No economy | RISK reinforcements + ClawSpot spot economy |
| No win condition | 4 distinct win conditions |

---

## Execution Plan

### Phase 1: Playable Demo (Week 1-2)
Single-player grid game vs 3 AI opponents.
- Grid rendering with region boundaries and terrain types
- Crab troop sprites with count display
- Tap-to-select, tap-to-attack controls (mobile-first)
- RISK combat resolution with animated dice + QTE
- Deploy reinforcements, fortify between connected spots
- Shell income per spot, buy troops with shells
- AI opponents: claim nearby, attack weak borders, protect regions
- Ocean ambient + combat SFX + territory chimes (Web Audio)
- Win condition: Domination (60%)
- **Ship it.** Deploy to Railway/Vercel. Get link in people's hands.

### Phase 2: Full Strategy (Week 3-4)
All RISK mechanics, all polish.
- All QTE types (Claw Strike, Shell Block, Pinch Grab)
- Abilities: Spy, Sabotage, Tidal Wave
- Smarter AI (target weak borders, save for abilities, defend regions)
- Player levels + XP (persistent across games)
- All animations, screen shake, particles
- Title screen, tutorial, settings
- Multiple win conditions
- Mobile touch polish

### Phase 3: Multiplayer (Week 5-7)
Real players, real competition.
- Async multiplayer first (attack offline players)
- Persistent accounts (Supabase)
- Leaderboards
- Real-time multiplayer (WebSocket)
- Matchmaking (2-6 players per arena)
- AI agent defenders (hire with shells)
- Anti-cheat (server-authoritative)

### Phase 4: On-Chain (Week 8+, optional)
Crypto for players who want real stakes.
- Base L2 integration
- Wallet connect (optional, game works without)
- On-chain spot ownership
- Shell token economy
- Fee distribution from trading
- Token-gated premium arenas

---

## For the AI Agents

When you start working on this project:

1. **Read `CLAUDE.md`** — rules, tech stack, priorities
2. **Read `GAME-DESIGN.md`** — full mechanics, combat, economy, regions, visuals, audio
3. **Read `CONTINUITY.md`** — ONEBIT lessons (what broke, what to never do again)
4. **Check existing code** in `web/` and `engine/` — there's a working Crab RPG prototype with audio, rendering, and combat. Refactor it into the territory game. Don't rewrite from scratch.
5. **The swarm config** is at `.claude-flow/swarm.yaml` — 9 agents, hierarchical-mesh topology
6. **Memory seeds** at `.claude-flow/memory-seeds.json` — shared knowledge for all agents

### Non-Negotiable Rules
- 60fps (14ms frame budget). Test after every change.
- Max 4 offscreen canvases, 300 particles, 50 entities.
- Mobile-first. Touch controls from day 1.
- Playable in 30 seconds. No sign-up wall.
- Module names match behavior. No misleading names.
- No duplicate systems. Check shared memory first.
- All state persists to database. No ephemeral JSON.
- Never claim features that don't exist.

---

## The Story We Tell

> "ONEBIT was an experiment — 6 AI agents building a game through consensus. It worked, and it broke. ClawSpot Arena is what happens when you take everything that broke and fix it. Same AI-built philosophy. Real game design. Real performance. Real strategy. RISK meets ClawSpot, built by machines, played by humans."

This is the narrative for social, for the landing page, for press. The AI-building-games angle is the hook. The game being actually good is what keeps people.

---

## Cost Model

Based on ONEBIT data ($4.31 for 201 API calls over 15.6 hours):

| Phase | Estimated Agent Cost | Human Time |
|-------|---------------------|------------|
| Phase 1 (2 weeks) | ~$15-25 | ~30 min/day oversight |
| Phase 2 (2 weeks) | ~$15-25 | ~30 min/day |
| Phase 3 (3 weeks) | ~$30-50 | ~1 hr/day (multiplayer complexity) |
| Phase 4 (ongoing) | ~$10-20 | ~1 hr/day (smart contract review) |

Claude-Flow's smart routing (Haiku for simple tasks, Opus for complex) cuts costs ~75% vs all-Opus. The WASM Agent Booster handles simple file edits at $0.

**Total estimated to playable multiplayer: ~$60-100 in API costs + hosting.**

---

*From 1 bit to territory warfare. Let's build.*
