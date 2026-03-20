# ClawSpot Arena

## What This Is
Mobile-first territory warfare game. RISK meets ClawSpot.fun. Runs in browser and as a Telegram Mini App. No wallet connect — players deposit ETH to a server-generated address, play, withdraw.

## Read Order
1. `SKILL.md` — **build instructions** — architecture, TG integration, deposit flow, file structure, priority order
2. `GAME-DESIGN.md` — full game mechanics (grid, combat, economy, regions, terrain, audio)
3. `KICKOFF.md` — vision and honest limitations
4. `CONTINUITY.md` — lessons from a previous project (what to avoid)

## Quick Summary
- 10x10 ocean grid, 6 regions (like RISK continents), terrain types
- Deploy crab troops, attack adjacent enemies, fortify connected territory
- RISK dice combat + skill-based QTE overlay
- Shell economy from held spots, buy troops/abilities
- Win: Domination (60%), Crown Control, Elimination
- Procedural Web Audio (zero audio files)
- Telegram Mini App + mobile browser
- ETH deposits via HD wallet addresses (no wallet connect)

## Rules
- Mobile-first. Touch controls are primary. Keyboard is secondary.
- 60fps (14ms frame budget). Test after every change.
- No React/Vue in the game — Canvas 2D + vanilla JS
- No wallet connect, no Web3 modal, no MetaMask
- No ONEBIT module system — write the game directly
- Playable in 30 seconds with zero sign-up
- Total JS bundle <200KB for TG Mini App fast load
- All game state is server-authoritative for multiplayer

## Tech Stack
- **Game**: Canvas 2D, vanilla JS
- **Server**: Express.js or Next.js
- **Database**: Supabase (PostgreSQL)
- **Real-time**: WebSocket (ws)
- **ETH**: ethers.js server-side (HD wallet, deposit watcher)
- **Telegram**: Bot API + WebApp SDK
- **Audio**: Web Audio API (procedural)
- **Hosting**: Railway

## Build Order
1. Grid rendering + touch controls + terrain
2. Troop display + spot selection + attack flow
3. RISK combat (dice + animation)
4. Deploy + fortify + reinforcement cycle
5. AI opponents (3 bots)
6. Shell economy + HUD
7. Audio (ambient + combat + claims)
8. Win condition + game over
9. Telegram Mini App wrapper + auth
10. ETH deposit/withdraw
