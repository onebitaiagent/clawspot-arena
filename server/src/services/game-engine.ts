// Server-authoritative game engine
// All combat resolution, reinforcements, and state changes happen here

import crypto from 'crypto';

export interface Cell {
  row: number;
  col: number;
  region: string | null;
  terrain: string;
  owner: number;  // -1=neutral, 0-5=players
  troops: number;
}

export interface GamePlayer {
  id: string;
  slot: number;        // 0-3
  username: string;
  shells: number;
  reinforcements: number;
  attackCooldown: number;
  eliminated: boolean;
  isAI: boolean;
}

export interface GameState {
  id: string;
  cells: Cell[];
  players: GamePlayer[];
  phase: 'waiting' | 'deploy' | 'play' | 'finished';
  reinforceTimer: number;
  shellTimer: number;
  winner: number;       // slot or -1
  createdAt: number;
  lastTick: number;
  tier: string;
  pot: number;
}

// Region/terrain maps (same as client)
const REGION_MAP = [
  'TTT...RR..','TTTT.RRR..','TT...RRR.A','.CCC....AA',
  '.CCCC$$KKA','.CCC.$$KKA','..CC..KKKK','SS..HHH.KK',
  'SSSSHHHH..','SSSS.HH...',
];
const TERRAIN_MAP = [
  'ssss..rr..','ssss.rrr..','ss...rrr.d','.ccc....dd',
  '.cccc**kkd','.ccc.**kkd','..cc..kkkk','ss..ddd.kk',
  'ssssdddd..','ssss.dd...',
];
const RC: Record<string, string> = {T:'tidal',R:'reef',A:'abyss',C:'coral',$:'crown',K:'kelp',S:'shore',H:'trench'};
const TC: Record<string, string> = {s:'shore',r:'reef',d:'deep',c:'coral','*':'crown',k:'deep','.':'shore'};

const TERRAIN_STATS: Record<string, { atkMod: number; defMod: number; shellMult: number }> = {
  shore:  { atkMod: 0,  defMod: 0, shellMult: 1   },
  reef:   { atkMod: 0,  defMod: 1, shellMult: 1.5 },
  deep:   { atkMod: -1, defMod: 0, shellMult: 1   },
  coral:  { atkMod: 0,  defMod: 0, shellMult: 2   },
  crown:  { atkMod: 0,  defMod: 0, shellMult: 3   },
};

const REGION_BONUS: Record<string, number> = {
  tidal: 2, reef: 3, abyss: 5, coral: 3, crown: 7, kelp: 3, shore: 2, trench: 4,
};

const STARTS = [
  [[8,0],[8,1],[9,0],[9,1]],
  [[0,0],[0,1],[1,0],[1,1]],
  [[0,8],[0,9],[1,8],[1,9]],
  [[8,8],[8,9],[9,8],[9,9]],
];

export function createGameState(id: string, players: GamePlayer[], tier: string, pot: number): GameState {
  const cells: Cell[] = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      cells.push({
        row: r, col: c,
        region: RC[REGION_MAP[r][c]] || null,
        terrain: TC[TERRAIN_MAP[r][c]] || 'shore',
        owner: -1,
        troops: 0,
      });
    }
  }

  // Place starting troops
  for (let i = 0; i < players.length; i++) {
    for (const [r, c] of STARTS[i]) {
      const cell = cells[r * 10 + c];
      cell.owner = i;
      cell.troops = 3;
    }
    players[i].shells = 50;
    players[i].reinforcements = 5;
    players[i].attackCooldown = 0;
    players[i].eliminated = false;
  }

  // Neutral troops
  for (const cell of cells) {
    if (cell.owner === -1 && Math.random() < 0.3) {
      cell.troops = Math.floor(Math.random() * 2) + 1;
    }
  }

  return {
    id, cells, players,
    phase: players.length >= 2 ? 'deploy' : 'waiting',
    reinforceTimer: 30,
    shellTimer: 10,
    winner: -1,
    createdAt: Date.now(),
    lastTick: Date.now(),
    tier, pot,
  };
}

function cellAt(cells: Cell[], r: number, c: number): Cell | null {
  if (r < 0 || r >= 10 || c < 0 || c >= 10) return null;
  return cells[r * 10 + c];
}

function neighbors(cells: Cell[], r: number, c: number): Cell[] {
  const n: Cell[] = [];
  if (r > 0) n.push(cells[(r - 1) * 10 + c]);
  if (r < 9) n.push(cells[(r + 1) * 10 + c]);
  if (c > 0) n.push(cells[r * 10 + c - 1]);
  if (c < 9) n.push(cells[r * 10 + c + 1]);
  return n;
}

function isAdjacent(a: Cell, b: Cell): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

function countTerritories(cells: Cell[], owner: number): number {
  return cells.filter(c => c.owner === owner).length;
}

function getRegionControl(cells: Cell[], owner: number): string[] {
  const regions: Record<string, { owned: number; total: number }> = {};
  for (const c of cells) {
    if (!c.region) continue;
    if (!regions[c.region]) regions[c.region] = { owned: 0, total: 0 };
    regions[c.region].total++;
    if (c.owner === owner) regions[c.region].owned++;
  }
  return Object.entries(regions)
    .filter(([, v]) => v.owned === v.total)
    .map(([k]) => k);
}

function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

export interface CombatResult {
  atkRolls: number[];
  defRolls: number[];
  atkLoss: number;
  defLoss: number;
  captured: boolean;
  troopsMoved: number;
}

export function resolveCombat(state: GameState, atkIdx: number, defIdx: number): CombatResult | null {
  const atk = state.cells[atkIdx];
  const def = state.cells[defIdx];

  if (!atk || !def) return null;
  if (!isAdjacent(atk, def)) return null;
  if (atk.owner === def.owner) return null;
  if (atk.troops < 2) return null;

  const atkCount = Math.min(atk.troops - 1, 3);
  if (atkCount <= 0) return null;

  // Empty unoccupied cell — instant claim, no dice
  if (def.troops <= 0 && def.owner === -1) {
    const moveTroops = Math.min(atk.troops - 1, atkCount);
    def.owner = atk.owner;
    def.troops = moveTroops;
    atk.troops -= moveTroops;
    return { atkRolls: [], defRolls: [], atkLoss: 0, defLoss: 0, captured: true, troopsMoved: moveTroops };
  }

  const defCount = Math.min(def.troops, 2);

  const atkRolls: number[] = [];
  const defRolls: number[] = [];
  for (let i = 0; i < atkCount; i++) atkRolls.push(rollDice());
  for (let i = 0; i < defCount; i++) defRolls.push(rollDice());

  const t = TERRAIN_STATS[def.terrain] || TERRAIN_STATS.shore;

  // Coral defense bonus
  let coralBonus = 0;
  if (def.terrain === 'coral') {
    for (const nb of neighbors(state.cells, def.row, def.col)) {
      if (nb.terrain === 'coral' && nb.owner === def.owner) coralBonus++;
    }
  }

  for (let i = 0; i < atkRolls.length; i++)
    atkRolls[i] = Math.max(1, atkRolls[i] + t.atkMod);
  for (let i = 0; i < defRolls.length; i++)
    defRolls[i] = Math.min(6, defRolls[i] + t.defMod + coralBonus);

  atkRolls.sort((a, b) => b - a);
  defRolls.sort((a, b) => b - a);

  let atkLoss = 0, defLoss = 0;
  for (let i = 0; i < Math.min(atkRolls.length, defRolls.length); i++) {
    if (atkRolls[i] > defRolls[i]) defLoss++;
    else atkLoss++;
  }

  // Apply
  atk.troops -= atkLoss;
  def.troops -= defLoss;

  let captured = false;
  let troopsMoved = 0;

  if (def.troops <= 0) {
    captured = true;
    troopsMoved = Math.min(atk.troops - 1, atkCount);
    def.owner = atk.owner;
    def.troops = troopsMoved;
    atk.troops -= troopsMoved;
  }

  return { atkRolls, defRolls, atkLoss, defLoss, captured, troopsMoved };
}

export function deployTroop(state: GameState, playerSlot: number, cellIdx: number): boolean {
  const player = state.players[playerSlot];
  if (!player || player.reinforcements <= 0) return false;

  const cell = state.cells[cellIdx];
  if (!cell || cell.owner !== playerSlot) return false;

  cell.troops++;
  player.reinforcements--;
  return true;
}

export function fortifyTroops(state: GameState, playerSlot: number, fromIdx: number, toIdx: number): number {
  const from = state.cells[fromIdx];
  const to = state.cells[toIdx];

  if (!from || !to) return 0;
  if (from.owner !== playerSlot || to.owner !== playerSlot) return 0;
  if (from.troops <= 1) return 0;

  const move = Math.max(1, Math.floor((from.troops - 1) / 2));
  from.troops -= move;
  to.troops += move;
  return move;
}

export function buyTroop(state: GameState, playerSlot: number): boolean {
  const player = state.players[playerSlot];
  if (!player || player.shells < 10) return false;
  player.shells -= 10;
  player.reinforcements++;
  return true;
}

export function tickGame(state: GameState, dt: number): { reinforced: boolean; shellIncome: boolean } {
  let reinforced = false;
  let shellIncome = false;

  // Cooldowns
  for (const p of state.players) {
    if (p.attackCooldown > 0) p.attackCooldown -= dt;
  }

  // Reinforcements
  state.reinforceTimer -= dt;
  if (state.reinforceTimer <= 0) {
    state.reinforceTimer = 30;
    reinforced = true;
    for (const p of state.players) {
      if (p.eliminated) continue;
      const terr = countTerritories(state.cells, p.slot);
      if (terr === 0) { p.eliminated = true; continue; }
      let base = Math.max(3, Math.floor(terr / 3));
      for (const r of getRegionControl(state.cells, p.slot)) {
        base += REGION_BONUS[r] || 0;
      }
      p.reinforcements += base;
    }
  }

  // Shell income
  state.shellTimer -= dt;
  if (state.shellTimer <= 0) {
    state.shellTimer = 10;
    shellIncome = true;
    for (const p of state.players) {
      if (p.eliminated) continue;
      let income = 0;
      const rc = getRegionControl(state.cells, p.slot);
      for (const c of state.cells) {
        if (c.owner !== p.slot) continue;
        let mult = (TERRAIN_STATS[c.terrain] || TERRAIN_STATS.shore).shellMult;
        if (c.region && rc.includes(c.region)) mult *= 2;
        income += mult;
      }
      p.shells += Math.floor(income);
    }
  }

  // Check win
  for (const p of state.players) {
    if (countTerritories(state.cells, p.slot) >= 60) {
      state.winner = p.slot;
      state.phase = 'finished';
    }
  }

  // Check last standing
  const alive = state.players.filter(p => !p.eliminated && countTerritories(state.cells, p.slot) > 0);
  if (alive.length === 1 && state.players.length > 1) {
    state.winner = alive[0].slot;
    state.phase = 'finished';
  }

  return { reinforced, shellIncome };
}
