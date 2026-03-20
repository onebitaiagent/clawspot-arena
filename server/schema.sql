-- ClawSpot Arena — Supabase Schema
-- Run this in Supabase SQL editor

-- Players
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE,
  username TEXT NOT NULL,
  balance_eth DOUBLE PRECISION DEFAULT 0,
  balance_shells INTEGER DEFAULT 0,
  deposit_address TEXT,
  deposit_index INTEGER,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  total_earned DOUBLE PRECISION DEFAULT 0,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_players_telegram ON players(telegram_id);
CREATE INDEX IF NOT EXISTS idx_players_earned ON players(total_earned DESC);

-- Games
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arena_tier TEXT NOT NULL DEFAULT 'free',
  entry_fee DOUBLE PRECISION DEFAULT 0,
  players TEXT[] DEFAULT '{}',
  winner_id UUID REFERENCES players(id),
  pot DOUBLE PRECISION DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'waiting'
);

CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_ended ON games(ended_at DESC);

-- Deposits
CREATE TABLE IF NOT EXISTS deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) NOT NULL,
  tx_hash TEXT UNIQUE NOT NULL,
  amount_wei TEXT NOT NULL,
  amount_eth DOUBLE PRECISION NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deposits_player ON deposits(player_id);

-- Withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) NOT NULL,
  tx_hash TEXT,
  amount_eth DOUBLE PRECISION NOT NULL,
  to_address TEXT NOT NULL,
  fee_eth DOUBLE PRECISION DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_player ON withdrawals(player_id);
