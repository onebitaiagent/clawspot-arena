# ClawSpot Arena — Build Skill

> You are building a mobile-first territory warfare browser game. No wallet connect. No ONEBIT. Standalone project.

---

## What You're Building

A real-time territory-claiming game where players deploy crab troops on a 10x10 ocean grid. RISK-style strategy compressed into 5-minute mobile sessions. Must run as a **Telegram Mini App** and in any mobile browser.

**Key constraint**: No direct wallet connection. Players send ETH to a game-generated intermediary address to deposit, play with in-game balance, and withdraw when done. The game is playable without any crypto at all — ETH deposits are optional for players who want real stakes.

## Read These Files

1. `GAME-DESIGN.md` — full mechanics spec (grid, combat, economy, regions, terrain, audio, visuals)
2. `KICKOFF.md` — vision, limitations, execution plan
3. `CONTINUITY.md` — lessons from a previous AI-built game (what broke, what to avoid)

## Architecture

```
┌─────────────────────────────────────┐
│  Client (Canvas 2D game)            │
│  - Runs in mobile browser or TG     │
│  - Touch-first controls             │
│  - No wallet SDK, no Web3 libs      │
│  - Communicates via REST + WebSocket │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Server (Node.js / Express or Next) │
│  - Game state (authoritative)       │
│  - Player accounts (no wallet req)  │
│  - Matchmaking                      │
│  - ETH deposit/withdraw logic       │
│  - Telegram Bot API integration     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Database (Supabase / PostgreSQL)   │
│  - Player profiles + balances       │
│  - Game history                     │
│  - Leaderboards                     │
│  - Deposit addresses (HD wallet)    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  ETH Layer (Base L2)                │
│  - HD wallet generates per-player   │
│    deposit addresses                │
│  - Server watches for deposits      │
│  - Credits in-game balance          │
│  - Withdrawal sends from hot wallet │
│  - No smart contract required       │
│  - No wallet connect required       │
└─────────────────────────────────────┘
```

## Deposit/Withdraw Flow (No Wallet Connect)

### Deposit
1. Player taps "Deposit" in game menu
2. Server generates a unique ETH address for that player (HD wallet derivation from master seed)
3. Player sees address + QR code: "Send ETH here"
4. Server watches Base L2 for incoming transactions to that address
5. On confirmation, credits player's in-game balance (shells or ETH-denominated)
6. Player can now enter staked arenas

### Withdraw
1. Player taps "Withdraw" → enters amount + destination address
2. Server validates balance, deducts amount + gas fee estimate
3. Server sends ETH from hot wallet to player's destination
4. Transaction hash shown to player as confirmation

### Why No Wallet Connect
- Telegram Mini Apps can't reliably run injected wallet providers
- Mobile wallet connect UX is terrible (app switching, deep links breaking)
- Deposit address flow works on every platform with zero dependencies
- Players who don't want crypto just play for free with no friction

## Telegram Mini App Integration

### Setup
- Register bot with @BotFather, get bot token
- Set Mini App URL via BotFather or Bot API
- Game loads as a WebApp inside Telegram

### Telegram WebApp SDK
```javascript
// Available inside TG Mini App context
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand(); // full screen
  const user = tg.initDataUnsafe?.user; // { id, first_name, username }
  // Use tg.initData for server-side auth verification
}
```

### Auth Flow
1. TG opens Mini App with `initData` (signed by Telegram)
2. Client sends `initData` to server on connect
3. Server verifies signature using bot token (HMAC-SHA256)
4. Server creates/finds player account linked to Telegram user ID
5. No username/password needed — Telegram IS the auth

### Non-TG Auth (Browser)
- Simple: email/code or guest play (no auth, no deposits)
- Guest players get full game, just can't deposit/withdraw

## Tech Stack

| Layer | Tech | Notes |
|-------|------|-------|
| **Game client** | Canvas 2D, vanilla JS | Single file or few modules. No framework in game. |
| **UI shell** | Minimal HTML/CSS | Settings, deposit/withdraw, leaderboard overlays |
| **Server** | Express.js or Next.js API routes | Game state, auth, deposits |
| **Database** | Supabase (PostgreSQL) | Players, balances, games, leaderboard |
| **Real-time** | WebSocket (ws) | Grid state sync for multiplayer |
| **ETH** | ethers.js on server only | HD wallet, deposit watching, withdrawals |
| **Telegram** | Bot API + WebApp SDK | Mini App hosting, user auth |
| **Hosting** | Railway | Server + WebSocket on same service |

## Mobile-First Rules

- **Touch controls only as primary input**. Keyboard is secondary.
- Tap to select spot. Tap adjacent enemy to attack. Drag to fortify.
- **Minimum tap target: 44x44px** (Apple HIG guideline)
- **No hover states** — everything works on tap
- Canvas scales to viewport: `canvas.width = window.innerWidth; canvas.height = window.innerHeight`
- Handle `resize` and `orientationchange` events
- Prevent default on touch to avoid scroll/zoom: `{ passive: false }`
- Test at 375x667 (iPhone SE) and 390x844 (iPhone 14) minimum
- **No pinch-to-zoom** on game canvas (interferes with gameplay)
- HUD elements sized for thumb reach (bottom 1/3 of screen)

## Game Scope (Build This)

### Core (build first)
- 10x10 grid with 6 regions + terrain types
- Tap to select your spot, tap adjacent enemy to attack
- RISK-style combat (dice + QTE)
- Troop deployment + fortification
- Reinforcement cycle (30s: territories/3 + region bonuses)
- Shell income from held spots
- 3 AI opponents
- HUD: shells, spots owned, troops available
- Procedural audio (Web Audio API)
- Win condition: Domination (60%)

### Polish (build second)
- All QTE types, abilities, level-up system
- Full animations + particles
- Title screen, tutorial
- Multiple win conditions

### Multiplayer + Economy (build third)
- WebSocket real-time grid sync
- Telegram Mini App integration
- Player accounts + leaderboard
- ETH deposit/withdraw (Base L2)
- Staked arenas (entry fee, winner takes pot)

## What NOT to Build

- No wallet connect / Web3 modal / MetaMask integration
- No smart contracts (server-side HD wallet is simpler + cheaper)
- No React/Vue/Angular — game is Canvas 2D, UI is minimal HTML
- No ONEBIT consensus engine — this is a standalone game, not an agent experiment
- No Twitter bot
- No module system — write the game directly, not as injectable modules

## File Structure (Target)

```
Game/
├── web/
│   ├── index.html          # Game shell
│   ├── game.js             # Canvas game (main)
│   └── style.css           # Minimal UI styles
├── server/
│   ├── index.ts            # Express server
│   ├── routes/
│   │   ├── auth.ts         # TG auth + guest
│   │   ├── game.ts         # Game state API
│   │   └── wallet.ts       # Deposit/withdraw
│   ├── services/
│   │   ├── game-engine.ts  # Server-authoritative game logic
│   │   ├── matchmaking.ts  # Arena creation/joining
│   │   └── eth.ts          # HD wallet, deposit watcher, withdrawals
│   └── ws.ts               # WebSocket handler
├── GAME-DESIGN.md
├── KICKOFF.md
├── package.json
└── .env.example
```

## Existing Code

There's a Crab RPG prototype in `web/game.js` (~900 lines) with working:
- Web Audio procedural synthesis (SFX + music)
- Canvas rendering with pixel art style
- Input handling
- Combat foundation

And engine modules in `engine/`:
- `renderer.js` — 7-layer render pipeline
- `ecs.js` — Entity Component System
- `spatial-hash.js` — grid collision
- `input.js`, `audio.js`, `performance.js`

**Use what's useful, ignore the rest.** The RPG game loop needs to become a territory grid game. The audio system carries over directly.

## Performance Budgets

- Frame time: <14ms (60fps)
- Max particles: 300
- Max entities: 50
- Canvas size: match viewport (no fixed size)
- Total JS bundle: <200KB (for TG Mini App fast load)
- First paint: <1 second on 4G

## Priority Order

1. Grid rendering + touch controls + terrain
2. Troop display + spot selection + attack flow
3. RISK combat (dice + animation)
4. Deploy + fortify + reinforcement cycle
5. AI opponents (3 bots, simple strategy)
6. Shell economy + HUD
7. Audio (ambient + combat + claims)
8. Win condition + game over screen
9. Telegram Mini App wrapper + auth
10. ETH deposit/withdraw

Build each one completely before moving to the next. Test on mobile after each step.
