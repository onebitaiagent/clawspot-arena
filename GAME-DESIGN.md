# ClawSpot Arena — Game Design Document

> RISK meets ClawSpot. Territory warfare with crabs on a competitive grid.
> Claim spots. Deploy troops. Fortify borders. Conquer regions. Earn shells.

---

## References

### ClawSpot.fun (DeFi/Web3 inspiration)
- 100-spot grid per token, claim spots with USDC, earn 1% trading fees in ETH
- Anyone can snatch your spot by paying the listed price
- Supports human + AI agent players
- Dark theme, crab branding, Base blockchain

**What they lack**: Not a game — it's a DeFi dashboard. No animation, no strategy beyond pricing, no combat, no real-time interaction, no progression, no audio.

### RISK (Strategy inspiration)
- Territory control on a map divided into regions
- Troop deployment: earn reinforcements based on territories held + region bonuses
- Attack/defend with dice (attacker advantage, defender advantage, probability)
- Fortification: move troops between connected territories after attacking
- Region bonuses: control all of a continent = bonus troops per turn
- Elimination: knock players out by taking all their territories
- Win condition: world domination or objective cards

**What we take from RISK**: Region bonuses, reinforcement economy, fortification, strategic troop placement, the "one more attack" tension, elimination pressure.

---

## The Game: CLAWSPOT ARENA

### Elevator Pitch
**ClawSpot Arena** is RISK compressed into a real-time 10x10 grid with ClawSpot's economic model. Players deploy crab troops to claim spots, attack enemy territories, earn shells from controlled regions, and use reinforcements to expand. Real-time animated combat on Canvas 2D with pixel art crabs, procedural audio, and territory VFX.

### Core Loop
```
DEPLOY → ATTACK → FORTIFY → EARN → REINFORCE → EXPAND
```

1. **DEPLOY**: Place crab troops on your controlled spots from your reinforcement pool
2. **ATTACK**: Move troops from your spot to an adjacent enemy spot — combat resolves
3. **FORTIFY**: After attacking, redistribute troops between your connected territories
4. **EARN**: Each spot generates shells. Region bonuses for controlling entire regions.
5. **REINFORCE**: Spend shells or earn free troops based on territory count + region bonuses
6. **EXPAND**: Push into new regions, cut off enemy supply lines, dominate the grid

### Turn System (Real-Time with Phases)
Unlike classic RISK (pure turn-based), ClawSpot Arena uses **real-time turns with cooldowns**:
- **Deploy phase**: Drag troops from pool to your spots (instant)
- **Attack phase**: Tap enemy-adjacent spot to attack (3-second combat animation)
- **Fortify phase**: Redistribute troops between connected spots (instant)
- **Cooldown**: 5-second pause before your next attack (build tension, allow reaction)
- Other players act simultaneously — it's not sequential turns

This keeps the strategic depth of RISK but the real-time urgency of ClawSpot.

---

## The Grid (10x10 = 100 Spots)

### Regions (like RISK continents)
The 10x10 grid is divided into **6 regions**. Controlling all spots in a region gives a troop bonus each reinforcement cycle.

```
┌──────────────────────────────────────────────┐
│  TIDAL      │  REEF        │  ABYSS         │
│  FLATS      │  RIDGE       │  (deep water)  │
│  (10 spots) │  (8 spots)   │  (6 spots)     │
│  +2 troops  │  +3 troops   │  +5 troops     │
│─────────────┼──────────────┼────────────────│
│  CORAL      │  CROWN       │  KELP          │
│  GARDENS    │  (4 spots)   │  FOREST        │
│  (12 spots) │  +7 troops   │  (10 spots)    │
│  +3 troops  │  (center)    │  +3 troops     │
│─────────────┼──────────────┼────────────────│
│  SHORE      │  TRENCH      │                │
│  LINE       │  (8 spots)   │  (overflow     │
│  (10 spots) │  +4 troops   │   into above)  │
│  +2 troops  │              │                │
└──────────────────────────────────────────────┘
```

| Region | Spots | Troop Bonus | Terrain | Difficulty |
|--------|-------|-------------|---------|------------|
| **Tidal Flats** | 10 | +2/cycle | Shore | Easy (starter) |
| **Shore Line** | 10 | +2/cycle | Shore/Sand | Easy (starter) |
| **Reef Ridge** | 8 | +3/cycle | Reef | Medium |
| **Coral Gardens** | 12 | +3/cycle | Coral | Medium |
| **Kelp Forest** | 10 | +3/cycle | Deep Water | Medium |
| **Trench** | 8 | +4/cycle | Deep Water | Hard |
| **Abyss** | 6 | +5/cycle | Deep/Dark | Hard (few spots, big reward) |
| **Crown** | 4 | +7/cycle | Crown/Gold | Hardest (everyone wants it) |

**Total**: 68 spots in regions + 32 neutral/buffer spots = 100

### Terrain Effects
| Terrain | Combat Effect | Economy Effect | Visual |
|---------|--------------|----------------|--------|
| **Shore** | Neutral | 1x shells | Sandy yellow, foam |
| **Reef** | Defender +1 troop strength | 1.5x shells | Coral/orange, bubbles |
| **Deep Water** | Attacker -1 (hard to invade) | 1x shells | Dark blue, waves |
| **Coral** | Combo: each adjacent coral = +1 defense | 2x shells (if combo) | Pink/purple, glow |
| **Crown** | No terrain bonus (pure contest) | 3x shells | Gold, pulsing |

---

## Troops (Crabs)

### Troop Mechanics (from RISK)
- Each spot you control has a **troop count** (1-99 crabs)
- You must leave **at least 1 troop** on every spot you own
- **Reinforcements** come from: territory count + region bonuses + shell purchases
- **Attacking**: Select your spot (must have 2+ troops) → select adjacent enemy spot → combat
- **Fortifying**: After combat, move troops between your connected territories

### Reinforcement Formula
```
base = floor(total_territories / 3)    // minimum 3
region_bonuses = sum of controlled region bonuses
purchased = shells spent on troops (10 shells = 1 troop)
total_reinforcements = base + region_bonuses + purchased
```

Reinforcement cycles happen every **30 seconds** of real time (not turn-based).

### Troop Display
- 1-3 troops: Small crab sprite with number
- 4-9 troops: Medium crab with number
- 10+ troops: Large crab battalion with number
- 20+ troops: Glowing crab army (intimidation visual)

---

## Combat System

### RISK-Style with Real-Time Flair
Combat when attacking an enemy spot resolves like RISK dice, but animated:

**Attacker**: Up to 3 troops fight (must leave 1 behind)
**Defender**: Up to 2 troops defend

**Resolution** (per matchup):
- Each troop rolls a "power value" (1-6, like dice)
- Highest attacker vs highest defender → loser removes 1 troop
- Second highest vs second highest (if applicable) → loser removes 1 troop
- **Ties go to defender** (RISK rule)

**Terrain modifiers**:
- Reef: Defender rolls get +1
- Deep Water: Attacker rolls get -1
- Coral combo: Defender gets +1 per adjacent coral owned

**Active Combat Bonus** (skill element, not just dice):
During the 3-second combat animation, the attacker can perform a **Quick-Time Event**:
- **Claw Strike** (tap SPACE at right moment) — +1 to your highest roll
- **Shell Block** (tap E at right moment) — defender keeps troops on tie+1 instead of tie
- **Pinch Grab** (tap Q at right moment) — if you win, capture 1 enemy troop instead of destroying

This adds skill on top of RISK's probability, making combat feel earned.

### Combat Animation
1. Troops from attacking spot march toward defending spot (0.5s)
2. Face-off: attacking crabs vs defending crabs square up (0.5s)
3. QTE prompt appears (1s window)
4. Dice/power values roll (animated tumbling numbers)
5. Results: losing troops dissolve into bubbles, winners celebrate
6. If attacker wins and spot is empty → troops move in, territory claimed

---

## Economy

### Shell Income
Every **10 seconds**, each spot you hold generates shells:
```
income = base_rate × terrain_multiplier × region_control_bonus
```

| Factor | Value |
|--------|-------|
| Base rate per spot | 1 shell / 10 seconds |
| Reef terrain | ×1.5 |
| Coral terrain (with combo) | ×2 |
| Crown terrain | ×3 |
| Full region control | ×2 for all spots in that region |
| Adjacency (3+ connected) | ×1.25 |

### Shell Spending
| Purchase | Cost | Effect |
|----------|------|--------|
| 1 reinforcement troop | 10 shells | Add to your pool |
| Fortify boost | 25 shells | Move troops without adjacency requirement (1 use) |
| Spy intel | 15 shells | Reveal exact troop counts in a region for 30s |
| Sabotage | 40 shells | Remove 2 random troops from one enemy spot |
| Tidal Wave | 100 shells | Remove 1 troop from every enemy spot in a region |
| AI Defender | 5 shells/30s | AI agent defends a spot optimally when you're away |

---

## Progression

### Player Level (persistent across games)
| Level | XP Required | Unlock |
|-------|------------|--------|
| 1 | 0 | Basic attack only |
| 2 | 100 XP | Shell Block QTE |
| 3 | 300 XP | Pinch Grab QTE |
| 4 | 600 XP | Spy ability purchasable |
| 5 | 1000 XP | Crab Dash (attack 2 spots away) |
| 6 | 2000 XP | Sabotage ability purchasable |
| 7 | 4000 XP | Tidal Wave ability purchasable |
| 8 | 8000 XP | King Crab form (troops get +1 to all rolls) |

**XP Sources**: Win a combat (+5), Claim a spot (+3), Control a region (+20), Win a game (+100), Eliminate a player (+30)

### Cosmetics (shell-purchased, persistent)
- Crab colors / skins
- Territory border styles (flame, electric, coral, void)
- Victory animations
- Title/rank display

---

## Win Conditions

### Quick Game (5-10 min)
- **Domination**: Control 60% of the grid (60 spots)
- **Elimination**: Be the last player standing
- **Crown Control**: Hold all 4 Crown spots for 60 consecutive seconds

### Ranked Game (15-30 min)
- **Total Domination**: Control 80% of the grid
- **Region Sweep**: Control all 6 regions simultaneously
- **Shell Tycoon**: Accumulate 5000 shells (economic victory)

### Endless Arena (ClawSpot mode)
- No win condition — just earn shells indefinitely
- Players come and go
- Spots generate real value (crypto integration, Phase 4)

---

## Visual Design

### Style
- **Dark ocean void** background (#0a0a1a)
- **Pixel art crabs** — 8x8 base, numbers overlaid for troop count
- **Neon glow** territory borders in player colors
- **Region boundaries** shown as subtle dotted lines
- **Particle systems**: bubbles, sand, foam, coral sparkles, combat splashes
- **Screen shake** on combat and Tidal Wave
- **Camera**: Top-down view of full grid, zoom into combat during fights

### Color Palette
```
Background:  #0a0a1a (deep void)
Grid lines:  #1a1a3a (subtle)
Region lines: #2a2a4a (dotted, slightly brighter)
Player 1:    #00ff88 (green)
Player 2:    #ff4444 (red)
Player 3:    #4488ff (blue)
Player 4:    #ffaa00 (orange)
Player 5:    #cc44ff (purple)
Player 6:    #00dddd (cyan)
Neutral:     #333344 (unclaimed)
Shore:       #ddbb44
Reef:        #ff6633
Deep Water:  #2244aa
Coral:       #cc44aa
Crown:       #ffdd00
Shells:      #ffcc00
HP/Troops:   white text with shadow
```

### Animations
1. **Troop deploy** — crabs drop in from above with splash
2. **Troop march** — crabs walk between adjacent spots
3. **Combat** — crabs clash, power numbers roll, losers dissolve
4. **Territory claim** — color fills from center outward
5. **Territory lost** — color cracks and shatters
6. **Region captured** — all spots in region pulse with glow + chime
7. **Reinforcement cycle** — brief flash on all your spots + troop count ticks up
8. **Tidal Wave** — expanding ring washes over region
9. **Victory** — winner's territories explode with fireworks/particles
10. **QTE prompts** — button icons flash during combat window

---

## Audio Design (Procedural Web Audio)

All synthesized — no audio files.

| Sound | Synthesis | Trigger |
|-------|----------|---------|
| `ocean_ambient` | Filtered noise (bandpass 200-800Hz) + sine drones (65Hz, 98Hz) + LFO tremolo | Always |
| `troop_deploy` | Quick descending blip (sine 800→400Hz, 0.1s) | Deploy troops |
| `march` | Rhythmic soft clicks (filtered noise bursts, 4 per second) | Troops moving |
| `combat_start` | Dramatic low stinger (sawtooth 120→60Hz, 0.3s) | Attack initiated |
| `dice_roll` | Rapid clicking (noise burst train, 0.5s) | Power values rolling |
| `combat_win` | Rising major arpeggio (square wave C-E-G-C, 0.4s) | Won a fight |
| `combat_lose` | Descending minor (triangle B-Ab-E, 0.3s) | Lost a fight |
| `claim_territory` | Bright chime + whoosh (sine 1000Hz + filtered sweep) | Spot captured |
| `lose_territory` | Glass break (noise burst + high freq decay) | Spot lost |
| `region_captured` | Triumphant fanfare (layered major chord, 1s) | Full region owned |
| `reinforcements` | Quick ascending pips (sine blips, 3 notes) | Troops arrive |
| `shell_earn` | Coin pickup (sine 1000→1500Hz, 0.05s) | Income tick |
| `tidal_wave` | Sub bass + whoosh (sine 40Hz + noise sweep, 1.5s) | Area ability |
| `qte_prompt` | Alert ping (triangle 880Hz, 0.05s) | QTE window opens |
| `qte_success` | Satisfying click (square 600→800Hz, 0.03s) | QTE nailed |
| `victory` | Full fanfare (layered arpeggio + chord, 2s) | Game won |

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Game Engine** | Canvas 2D | Crab RPG base already built |
| **Rendering** | engine/renderer.js | Layer-based pipeline exists |
| **ECS** | engine/ecs.js | Entity system exists |
| **Audio** | Web Audio API | Procedural system exists in game.js |
| **Combat** | engine/fighting/ | Hitbox/state system exists |
| **Backend** | Next.js or Express.js | API + WebSocket server |
| **Database** | Supabase (PostgreSQL) | Players, games, leaderboards |
| **Real-time** | WebSockets (ws or Socket.io) | Grid state sync |
| **Blockchain** | Base L2 (Phase 4) | Optional on-chain economy |
| **Frontend** | Canvas game + React UI shell | Game + chrome |
| **Hosting** | Railway or Vercel | TBD |

---

## Implementation Phases

### Phase 1: Grid + Troops + Solo Play (Week 1-2)
**Single-player RISK-like game vs AI opponents**
- [ ] 10x10 grid rendering with region boundaries
- [ ] Terrain types per cell (visual + data)
- [ ] Crab troop sprites with count display
- [ ] Click/tap to select spot, click adjacent to attack
- [ ] RISK-style combat resolution (dice + animation)
- [ ] QTE during combat (Claw Strike only at first)
- [ ] Deploy reinforcements to your spots
- [ ] Fortify — move troops between connected spots
- [ ] Reinforcement cycle every 30s (territory count + region bonus)
- [ ] Shell income per spot (terrain multiplied)
- [ ] Buy troops with shells
- [ ] 3 AI opponents with simple strategy (claim nearby, attack weak)
- [ ] HUD: shells, territories, troops available, region control
- [ ] Basic audio: ambient + combat + claims
- [ ] Win condition: Domination (60%)

### Phase 2: Full RISK + Polish (Week 3)
- [ ] All QTE types (Shell Block, Pinch Grab)
- [ ] All abilities (Spy, Sabotage, Tidal Wave)
- [ ] Smarter AI (target weak borders, protect regions, save for abilities)
- [ ] Player level + XP system
- [ ] All animations (deploy, march, combat, claim, region capture)
- [ ] Full audio suite (all sounds from table)
- [ ] Screen shake + camera effects
- [ ] Mobile touch controls (tap to select, tap to attack, drag to fortify)
- [ ] Title screen + tutorial (animated grid walkthrough)
- [ ] Multiple win conditions (Crown Control, Elimination)

### Phase 3: Multiplayer (Week 4-5)
- [ ] WebSocket server for real-time grid state
- [ ] Player matchmaking (2-6 players per arena)
- [ ] Persistent accounts (Supabase)
- [ ] Leaderboards (wins, territories, XP)
- [ ] AI agent defenders (hire with shells)
- [ ] Spectator mode
- [ ] Ranked games + Endless Arena mode
- [ ] Anti-cheat (server-authoritative combat resolution)

### Phase 4: On-Chain Economy (Week 6+, optional)
- [ ] Base blockchain integration
- [ ] Wallet connect (optional — game works without it)
- [ ] On-chain spot ownership NFTs
- [ ] Shell token (ERC-20)
- [ ] Fee distribution from trades
- [ ] Token-gated premium arenas
- [ ] DexScreener integration
- [ ] Agent Skill File for AI players (like ClawSpot)

---

## Agent Assignment (Claude-Flow Swarm)

| Agent | Phase 1 Tasks | Phase 2 Tasks |
|-------|--------------|--------------|
| **Queen Director** | Define sprint 1, assign grid/combat/AI tasks | Define sprint 2, balance review, polish priorities |
| **Architect** | Grid system, region data, reinforcement cycle, render pipeline | WebSocket foundation, camera, mobile input |
| **Gameplay** | Combat resolution, troop deployment, AI opponents, shell economy | QTE system, abilities, smarter AI, win conditions, XP |
| **Art/VFX** | Crab sprites, territory colors, grid rendering, HUD | All animations, particles, screen shake, title screen |
| **Audio** | Ocean ambient, combat SFX, claim chimes | Full sound table, music layers, QTE audio |
| **Tester** | Frame time <14ms, combat balance (attacker ~55% win rate), economy pacing | Mobile testing, animation perf, AI difficulty, ability balance |
| **Reviewer** | Code quality, no duplicates, module size | Same + integration review for new systems |
| **Security** | Sandbox enforcement, input validation | Anti-cheat prep for multiplayer |
| **Growth** | Nothing yet | Screenshot sharing, leaderboard display |

---

## Success Metrics

1. **Playable in 30 seconds** — no sign-up, no wallet, just click Play
2. **60fps on mid-range phone** — Canvas 2D, performance budgets enforced
3. **"One more attack"** — the RISK feeling of wanting to push just a bit further
4. **Visual storytelling** — watching troops march, clash, and claim tells a story
5. **Sound makes it real** — ocean ambient + combat SFX + territory chimes = atmosphere
6. **Strategic depth** — RISK's region bonuses + ClawSpot's economic model = meaningful choices
7. **5-minute session** — Quick Game mode is designed for short sessions
8. **Shareable moments** — "I held all 4 Crown spots for a full minute" is a screenshot-worthy moment

---

## Existing Assets

### From Crab RPG prototype (web/game.js, ~900 lines)
- Full Web Audio system (SFX + procedural music)
- Canvas rendering with pixel art style
- Input handling (keyboard)
- Performance monitoring
- Combat system foundation

### From engine/ directory
- `renderer.js` — Layer-based render pipeline (7 layers)
- `ecs.js` — Entity Component System
- `spatial-hash.js` — Grid-based collision optimization
- `audio.js` — Audio module
- `input.js` — Input handling
- `performance.js` — Frame budget monitor
- `fighting/` — Combat prototype (hitbox, states, combos, input)

**Strategy**: The RPG prototype becomes the territory game. Audio system carries over directly. Renderer carries over. ECS carries over. Fighting system evolves into RISK-style troop combat with QTE overlay. Don't rewrite — refactor.
