import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

export function initSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;

  if (!url || !key) {
    console.warn('Supabase not configured — running with in-memory store');
    return;
  }

  supabase = createClient(url, key);
  console.log('Supabase connected');
}

export function getDb(): SupabaseClient | null {
  return supabase;
}

// ============================================================
// In-memory fallback store (for dev without Supabase)
// ============================================================

interface Player {
  id: string;
  telegram_id?: number;
  username: string;
  balance_eth: number;  // in wei string would be better for prod
  balance_shells: number;
  deposit_address?: string;
  deposit_index?: number;
  wins: number;
  losses: number;
  total_earned: number;
  xp: number;
  level: number;
  created_at: string;
}

interface GameRecord {
  id: string;
  arena_tier: string;
  entry_fee: number;
  players: string[];  // player IDs
  winner_id?: string;
  pot: number;
  started_at: string;
  ended_at?: string;
  status: 'waiting' | 'active' | 'finished';
}

const memStore = {
  players: new Map<string, Player>(),
  games: new Map<string, GameRecord>(),
  depositIndex: 0,
};

// === Player operations ===

export async function findPlayerByTelegramId(tgId: number): Promise<Player | null> {
  const db = getDb();
  if (db) {
    const { data } = await db.from('players').select('*').eq('telegram_id', tgId).single();
    return data;
  }
  for (const p of memStore.players.values()) {
    if (p.telegram_id === tgId) return p;
  }
  return null;
}

export async function findPlayerById(id: string): Promise<Player | null> {
  const db = getDb();
  if (db) {
    const { data } = await db.from('players').select('*').eq('id', id).single();
    return data;
  }
  return memStore.players.get(id) || null;
}

export async function createPlayer(data: Partial<Player>): Promise<Player> {
  const id = data.id || crypto.randomUUID();
  const player: Player = {
    id,
    telegram_id: data.telegram_id,
    username: data.username || 'Guest_' + id.slice(0, 6),
    balance_eth: 0,
    balance_shells: 0,
    deposit_address: data.deposit_address,
    deposit_index: data.deposit_index,
    wins: 0,
    losses: 0,
    total_earned: 0,
    xp: 0,
    level: 1,
    created_at: new Date().toISOString(),
  };

  const db = getDb();
  if (db) {
    const { data: row, error } = await db.from('players').insert(player).select().single();
    if (error) throw error;
    return row;
  }

  memStore.players.set(id, player);
  return player;
}

export async function updatePlayer(id: string, updates: Partial<Player>): Promise<Player | null> {
  const db = getDb();
  if (db) {
    const { data, error } = await db.from('players').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  const p = memStore.players.get(id);
  if (!p) return null;
  Object.assign(p, updates);
  return p;
}

export function getNextDepositIndex(): number {
  return memStore.depositIndex++;
}

// === Game operations ===

export async function createGame(data: Partial<GameRecord>): Promise<GameRecord> {
  const id = crypto.randomUUID();
  const game: GameRecord = {
    id,
    arena_tier: data.arena_tier || 'free',
    entry_fee: data.entry_fee || 0,
    players: data.players || [],
    pot: data.pot || 0,
    started_at: new Date().toISOString(),
    status: 'waiting',
  };

  const db = getDb();
  if (db) {
    const { data: row, error } = await db.from('games').insert(game).select().single();
    if (error) throw error;
    return row;
  }

  memStore.games.set(id, game);
  return game;
}

export async function updateGame(id: string, updates: Partial<GameRecord>): Promise<GameRecord | null> {
  const db = getDb();
  if (db) {
    const { data, error } = await db.from('games').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  const g = memStore.games.get(id);
  if (!g) return null;
  Object.assign(g, updates);
  return g;
}

export async function getActiveGames(): Promise<GameRecord[]> {
  const db = getDb();
  if (db) {
    const { data } = await db.from('games').select('*').in('status', ['waiting', 'active']);
    return data || [];
  }
  return [...memStore.games.values()].filter(g => g.status !== 'finished');
}

// === Leaderboard ===

export async function getLeaderboard(limit = 20): Promise<Partial<Player>[]> {
  const db = getDb();
  if (db) {
    const { data } = await db.from('players')
      .select('id,username,wins,total_earned,level')
      .order('total_earned', { ascending: false })
      .limit(limit);
    return data || [];
  }

  return [...memStore.players.values()]
    .sort((a, b) => b.total_earned - a.total_earned)
    .slice(0, limit);
}

export async function getRecentWins(limit = 20): Promise<GameRecord[]> {
  const db = getDb();
  if (db) {
    const { data } = await db.from('games')
      .select('*')
      .eq('status', 'finished')
      .order('ended_at', { ascending: false })
      .limit(limit);
    return data || [];
  }

  return [...memStore.games.values()]
    .filter(g => g.status === 'finished')
    .sort((a, b) => (b.ended_at || '').localeCompare(a.ended_at || ''))
    .slice(0, limit);
}
