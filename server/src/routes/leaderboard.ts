import { Router, Request, Response } from 'express';
import { getLeaderboard, getRecentWins } from '../services/db';

export const leaderboardRouter = Router();

// Top players by ETH earned
leaderboardRouter.get('/top', async (_req: Request, res: Response) => {
  try {
    const players = await getLeaderboard(20);
    res.json({ players });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// Recent game results
leaderboardRouter.get('/recent', async (_req: Request, res: Response) => {
  try {
    const games = await getRecentWins(20);
    res.json({ games });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get recent games' });
  }
});
