import { Router, Request, Response } from 'express';
import { getPlayerFromToken } from './auth';
import { getActiveGames, createGame as dbCreateGame } from '../services/db';
import {
  createGameState, resolveCombat, deployTroop,
  fortifyTroops, buyTroop, GameState, GamePlayer,
} from '../services/game-engine';

export const gameRouter = Router();

// In-memory active games (move to Redis in prod)
const activeGames = new Map<string, GameState>();

const TIER_FEES: Record<string, number> = {
  free: 0, bronze: 0.005, silver: 0.02, gold: 0.05, diamond: 0.2,
};

// List active arenas
gameRouter.get('/arenas', async (_req: Request, res: Response) => {
  const arenas = [];
  for (const [id, g] of activeGames) {
    arenas.push({
      id,
      tier: g.tier,
      entry_fee: TIER_FEES[g.tier] || 0,
      pot: g.pot,
      players: g.players.length,
      maxPlayers: 4,
      status: g.phase,
    });
  }
  res.json({ arenas });
});

// Create or join an arena
gameRouter.post('/join', async (req: Request, res: Response) => {
  try {
    const playerId = getPlayerFromToken(req);
    if (!playerId) return res.status(401).json({ error: 'Not authenticated' });

    const { tier = 'free' } = req.body;
    const fee = TIER_FEES[tier] || 0;

    // Find a waiting game of this tier, or create one
    let game: GameState | null = null;
    for (const g of activeGames.values()) {
      if (g.tier === tier && g.phase === 'waiting' && g.players.length < 4) {
        game = g;
        break;
      }
    }

    if (!game) {
      const id = crypto.randomUUID();
      game = createGameState(id, [], tier, 0);
      game.phase = 'waiting';
      activeGames.set(id, game);
    }

    // Check if already in this game
    if (game.players.some(p => p.id === playerId)) {
      return res.json({ gameId: game.id, slot: game.players.find(p => p.id === playerId)!.slot });
    }

    const slot = game.players.length;
    const player: GamePlayer = {
      id: playerId,
      slot,
      username: 'Player_' + (slot + 1),
      shells: 50,
      reinforcements: 5,
      attackCooldown: 0,
      eliminated: false,
      isAI: false,
    };

    game.players.push(player);
    game.pot += fee;

    // Fill remaining slots with AI and start immediately
    while (game.players.length < 4) {
      const aiSlot = game.players.length;
      const aiNames = ['Red Claw', 'Blue Tide', 'Gold Shell'];
      game.players.push({
        id: 'ai_' + aiSlot,
        slot: aiSlot,
        username: aiNames[aiSlot - 1] || 'Bot_' + aiSlot,
        shells: 50,
        reinforcements: 5,
        attackCooldown: 0,
        eliminated: false,
        isAI: true,
      });
    }

    // Re-init game state with all players placed on grid
    const fullGame = createGameState(game.id, game.players, tier, game.pot);
    activeGames.set(game.id, fullGame);
    game = fullGame;

    res.json({ gameId: game.id, slot });
  } catch (err) {
    console.error('Join error:', err);
    res.status(500).json({ error: 'Failed to join' });
  }
});

// Get game state
gameRouter.get('/:gameId', (req: Request, res: Response) => {
  const game = activeGames.get(req.params.gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  res.json({
    id: game.id,
    cells: game.cells,
    players: game.players.map(p => ({
      slot: p.slot,
      username: p.username,
      shells: p.shells,
      reinforcements: p.reinforcements,
      eliminated: p.eliminated,
      isAI: p.isAI,
    })),
    phase: game.phase,
    reinforceTimer: game.reinforceTimer,
    shellTimer: game.shellTimer,
    winner: game.winner,
    tier: game.tier,
    pot: game.pot,
  });
});

// Player action: deploy
gameRouter.post('/:gameId/deploy', (req: Request, res: Response) => {
  const game = activeGames.get(req.params.gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  const playerId = getPlayerFromToken(req);
  const player = game.players.find(p => p.id === playerId);
  if (!player) return res.status(403).json({ error: 'Not in this game' });

  const { cellIdx } = req.body;
  const ok = deployTroop(game, player.slot, cellIdx);
  if (!ok) return res.status(400).json({ error: 'Cannot deploy there' });

  res.json({ ok: true, cell: game.cells[cellIdx], reinforcements: player.reinforcements });
});

// Player action: attack
gameRouter.post('/:gameId/attack', (req: Request, res: Response) => {
  const game = activeGames.get(req.params.gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  const playerId = getPlayerFromToken(req);
  const player = game.players.find(p => p.id === playerId);
  if (!player) return res.status(403).json({ error: 'Not in this game' });

  if (player.attackCooldown > 0) {
    return res.status(400).json({ error: 'Attack on cooldown', cooldown: player.attackCooldown });
  }

  const { fromIdx, toIdx } = req.body;
  const result = resolveCombat(game, fromIdx, toIdx);
  if (!result) return res.status(400).json({ error: 'Invalid attack' });

  player.attackCooldown = 2;

  res.json({
    ok: true,
    result,
    attacker: game.cells[fromIdx],
    defender: game.cells[toIdx],
    gameOver: game.phase === 'finished',
    winner: game.winner,
  });
});

// Player action: fortify
gameRouter.post('/:gameId/fortify', (req: Request, res: Response) => {
  const game = activeGames.get(req.params.gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  const playerId = getPlayerFromToken(req);
  const player = game.players.find(p => p.id === playerId);
  if (!player) return res.status(403).json({ error: 'Not in this game' });

  const { fromIdx, toIdx } = req.body;
  const moved = fortifyTroops(game, player.slot, fromIdx, toIdx);
  if (moved === 0) return res.status(400).json({ error: 'Cannot fortify' });

  res.json({ ok: true, moved, from: game.cells[fromIdx], to: game.cells[toIdx] });
});

// Player action: buy troop
gameRouter.post('/:gameId/buy', (req: Request, res: Response) => {
  const game = activeGames.get(req.params.gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  const playerId = getPlayerFromToken(req);
  const player = game.players.find(p => p.id === playerId);
  if (!player) return res.status(403).json({ error: 'Not in this game' });

  const ok = buyTroop(game, player.slot);
  if (!ok) return res.status(400).json({ error: 'Not enough shells' });

  res.json({ ok: true, shells: player.shells, reinforcements: player.reinforcements });
});

export { activeGames };
