import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { getPlayerFromTokenString } from './routes/auth';
import { activeGames } from './routes/game';
import { tickGame, resolveCombat, GameState } from './services/game-engine';

interface ClientSocket extends WebSocket {
  playerId?: string;
  gameId?: string;
  playerSlot?: number;
  alive?: boolean;
}

const wss = new WebSocketServer({ noServer: true });
const clients = new Map<string, Set<ClientSocket>>(); // gameId → clients

export function initWebSocket(server: HttpServer) {
  server.on('upgrade', (req, socket, head) => {
    // Parse token from query string
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      socket.destroy();
      return;
    }

    const playerId = getPlayerFromTokenString(token);
    if (!playerId) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      (ws as ClientSocket).playerId = playerId;
      (ws as ClientSocket).alive = true;
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws: ClientSocket) => {
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        handleMessage(ws, msg);
      } catch (e) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
      }
    });

    ws.on('pong', () => { ws.alive = true; });

    ws.on('close', () => {
      if (ws.gameId) {
        const gameClients = clients.get(ws.gameId);
        if (gameClients) {
          gameClients.delete(ws);
          if (gameClients.size === 0) clients.delete(ws.gameId);
        }
      }
    });
  });

  // Heartbeat
  setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = ws as ClientSocket;
      if (!client.alive) { client.terminate(); return; }
      client.alive = false;
      client.ping();
    });
  }, 30000);

  // Game tick loop (every 500ms)
  setInterval(() => {
    for (const [gameId, game] of activeGames) {
      if (game.phase !== 'deploy' && game.phase !== 'play') continue;

      const now = Date.now();
      const dt = (now - game.lastTick) / 1000;
      game.lastTick = now;

      const { reinforced, shellIncome } = tickGame(game, dt);

      // AI turns
      if (game.phase === 'play') {
        for (const p of game.players) {
          if (!p.isAI || p.eliminated || p.attackCooldown > 0) continue;
          runAITurn(game, p.slot);
        }
      }

      // Broadcast state to connected clients
      if (reinforced || shellIncome) {
        broadcastGameState(gameId, game);
      }

      // Clean up finished games after 60s
      if ((game.phase as string) === 'finished' && now - game.lastTick > 60000) {
        activeGames.delete(gameId);
        clients.delete(gameId);
      }
    }
  }, 500);

  console.log('WebSocket server initialized');
}

function handleMessage(ws: ClientSocket, msg: any) {
  switch (msg.type) {
    case 'join': {
      const gameId = msg.gameId;
      const game = activeGames.get(gameId);
      if (!game) { ws.send(JSON.stringify({ type: 'error', message: 'Game not found' })); return; }

      const player = game.players.find(p => p.id === ws.playerId);
      if (!player) { ws.send(JSON.stringify({ type: 'error', message: 'Not in game' })); return; }

      ws.gameId = gameId;
      ws.playerSlot = player.slot;

      if (!clients.has(gameId)) clients.set(gameId, new Set());
      clients.get(gameId)!.add(ws);

      // Send full state
      ws.send(JSON.stringify({ type: 'state', game: serializeGame(game) }));
      break;
    }

    case 'deploy': {
      const game = activeGames.get(ws.gameId || '');
      if (!game || ws.playerSlot === undefined) return;
      const cell = game.cells[msg.cellIdx];
      if (!cell || cell.owner !== ws.playerSlot) return;
      const player = game.players[ws.playerSlot];
      if (player.reinforcements <= 0) return;
      cell.troops++;
      player.reinforcements--;
      broadcastToGame(ws.gameId!, { type: 'deploy', slot: ws.playerSlot, cellIdx: msg.cellIdx, troops: cell.troops, reinforcements: player.reinforcements });
      break;
    }

    case 'attack': {
      const game = activeGames.get(ws.gameId || '');
      if (!game || ws.playerSlot === undefined) return;
      const player = game.players[ws.playerSlot];
      if (player.attackCooldown > 0) return;
      const result = resolveCombat(game, msg.fromIdx, msg.toIdx);
      if (!result) return;
      player.attackCooldown = 2;
      broadcastToGame(ws.gameId!, {
        type: 'combat',
        slot: ws.playerSlot,
        fromIdx: msg.fromIdx, toIdx: msg.toIdx,
        result,
        attacker: game.cells[msg.fromIdx],
        defender: game.cells[msg.toIdx],
        gameOver: game.phase === 'finished',
        winner: game.winner,
      });
      break;
    }

    case 'fortify': {
      const game = activeGames.get(ws.gameId || '');
      if (!game || ws.playerSlot === undefined) return;
      const from = game.cells[msg.fromIdx];
      const to = game.cells[msg.toIdx];
      if (!from || !to || from.owner !== ws.playerSlot || to.owner !== ws.playerSlot) return;
      if (from.troops <= 1) return;
      const move = Math.max(1, Math.floor((from.troops - 1) / 2));
      from.troops -= move;
      to.troops += move;
      broadcastToGame(ws.gameId!, { type: 'fortify', slot: ws.playerSlot, fromIdx: msg.fromIdx, toIdx: msg.toIdx, moved: move });
      break;
    }

    case 'buy': {
      const game = activeGames.get(ws.gameId || '');
      if (!game || ws.playerSlot === undefined) return;
      const player = game.players[ws.playerSlot];
      if (player.shells < 10) return;
      player.shells -= 10;
      player.reinforcements++;
      ws.send(JSON.stringify({ type: 'bought', shells: player.shells, reinforcements: player.reinforcements }));
      break;
    }
  }
}

function runAITurn(game: GameState, slot: number) {
  const player = game.players[slot];
  if (!player || player.eliminated) return;

  // Deploy reinforcements to borders
  if (player.reinforcements > 0) {
    const borders = game.cells.filter(c => {
      if (c.owner !== slot) return false;
      const r = c.row, col = c.col;
      const nbs = [];
      if (r > 0) nbs.push(game.cells[(r-1)*10+col]);
      if (r < 9) nbs.push(game.cells[(r+1)*10+col]);
      if (col > 0) nbs.push(game.cells[r*10+col-1]);
      if (col < 9) nbs.push(game.cells[r*10+col+1]);
      return nbs.some(n => n.owner !== slot);
    });
    const targets = borders.length > 0 ? borders : game.cells.filter(c => c.owner === slot);
    while (player.reinforcements > 0 && targets.length > 0) {
      targets[Math.floor(Math.random() * targets.length)].troops++;
      player.reinforcements--;
    }
  }

  // Buy troops
  while (player.shells >= 10 && player.reinforcements < 3) {
    player.shells -= 10;
    player.reinforcements++;
  }

  // Find best attack
  let bestScore = -1, bestFrom = -1, bestTo = -1;
  for (const c of game.cells) {
    if (c.owner !== slot || c.troops < 2) continue;
    const r = c.row, col = c.col;
    const nbs: number[] = [];
    if (r > 0) nbs.push((r-1)*10+col);
    if (r < 9) nbs.push((r+1)*10+col);
    if (col > 0) nbs.push(r*10+col-1);
    if (col < 9) nbs.push(r*10+col+1);
    for (const ni of nbs) {
      const nb = game.cells[ni];
      if (nb.owner === slot) continue;
      let score = (c.troops - nb.troops) * 2;
      if (nb.owner === -1) score += 3;
      if (nb.troops === 0) score += 5;
      score += Math.random() * 3;
      if (score > bestScore) { bestScore = score; bestFrom = c.row * 10 + c.col; bestTo = ni; }
    }
  }

  if (bestFrom >= 0 && bestTo >= 0 && bestScore > 0) {
    const result = resolveCombat(game, bestFrom, bestTo);
    if (result) {
      player.attackCooldown = 3 + Math.random() * 2;
      const gameId = game.id;
      broadcastToGame(gameId, {
        type: 'combat',
        slot,
        fromIdx: bestFrom, toIdx: bestTo,
        result,
        attacker: game.cells[bestFrom],
        defender: game.cells[bestTo],
        gameOver: game.phase === 'finished',
        winner: game.winner,
      });
    }
  }
}

function serializeGame(game: GameState) {
  return {
    id: game.id,
    cells: game.cells,
    players: game.players.map(p => ({
      slot: p.slot, username: p.username,
      shells: p.shells, reinforcements: p.reinforcements,
      eliminated: p.eliminated, isAI: p.isAI,
    })),
    phase: game.phase,
    reinforceTimer: game.reinforceTimer,
    shellTimer: game.shellTimer,
    winner: game.winner,
    tier: game.tier,
    pot: game.pot,
  };
}

function broadcastToGame(gameId: string, msg: any) {
  const gameClients = clients.get(gameId);
  if (!gameClients) return;
  const data = JSON.stringify(msg);
  for (const ws of gameClients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  }
}

function broadcastGameState(gameId: string, game: GameState) {
  broadcastToGame(gameId, { type: 'state', game: serializeGame(game) });
}
