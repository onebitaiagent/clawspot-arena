import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { initWebSocket } from './ws';
import { authRouter } from './routes/auth';
import { gameRouter } from './routes/game';
import { walletRouter } from './routes/wallet';
import { leaderboardRouter } from './routes/leaderboard';
import { botRouter } from './routes/bot';
import { initSupabase } from './services/db';
import { initEth } from './services/eth';
import { startDepositWatcher } from './services/deposit-watcher';

const app = express();
const server = http.createServer(app);
const PORT = parseInt(process.env.PORT || '3847');

// Middleware
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (_req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.json());

// API routes
app.use('/api/auth', authRouter);
app.use('/api/game', gameRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/bot', botRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Serve static web files
app.use(express.static(path.join(__dirname, '../../web')));

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../web/index.html'));
});

// WebSocket
initWebSocket(server);

// Init DB and start
initSupabase();
initEth();
startDepositWatcher();

server.listen(PORT, () => {
  console.log(`ClawSpot Arena server running on :${PORT}`);
});
