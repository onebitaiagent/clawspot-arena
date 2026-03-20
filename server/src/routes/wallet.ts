import { Router, Request, Response } from 'express';
import { getPlayerFromToken } from './auth';
import { findPlayerById, updatePlayer } from '../services/db';
import { getDepositAddress, withdrawToAddress, ethToWei, weiToEth } from '../services/eth';

export const walletRouter = Router();

// Get deposit address for current player
walletRouter.get('/deposit-address', async (req: Request, res: Response) => {
  try {
    const playerId = getPlayerFromToken(req);
    if (!playerId) return res.status(401).json({ error: 'Not authenticated' });

    const address = await getDepositAddress(playerId);
    res.json({ address, chain: 'Base L2' });
  } catch (err: any) {
    if (err.message === 'ETH not configured') {
      return res.status(503).json({ error: 'Deposits not available yet' });
    }
    console.error('Deposit address error:', err);
    res.status(500).json({ error: 'Failed to get deposit address' });
  }
});

// Get balance
walletRouter.get('/balance', async (req: Request, res: Response) => {
  try {
    const playerId = getPlayerFromToken(req);
    if (!playerId) return res.status(401).json({ error: 'Not authenticated' });

    const player = await findPlayerById(playerId);
    if (!player) return res.status(404).json({ error: 'Player not found' });

    res.json({
      balance_eth: player.balance_eth,
      balance_shells: player.balance_shells,
      deposit_address: player.deposit_address || null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

// Request withdrawal
walletRouter.post('/withdraw', async (req: Request, res: Response) => {
  try {
    const playerId = getPlayerFromToken(req);
    if (!playerId) return res.status(401).json({ error: 'Not authenticated' });

    const { to_address, amount_eth } = req.body;
    if (!to_address || !amount_eth) {
      return res.status(400).json({ error: 'Missing to_address or amount_eth' });
    }

    const player = await findPlayerById(playerId);
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const amountNum = parseFloat(amount_eth);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (player.balance_eth < amountNum) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Process withdrawal
    const amountWei = ethToWei(amount_eth);
    const { hash, fee } = await withdrawToAddress(to_address, amountWei);

    // Deduct from balance
    await updatePlayer(playerId, {
      balance_eth: player.balance_eth - amountNum,
    });

    res.json({
      ok: true,
      tx_hash: hash,
      amount: amount_eth,
      fee_eth: weiToEth(fee),
      chain: 'Base L2',
    });
  } catch (err: any) {
    if (err.message === 'ETH not configured') {
      return res.status(503).json({ error: 'Withdrawals not available yet' });
    }
    console.error('Withdraw error:', err);
    res.status(500).json({ error: 'Withdrawal failed' });
  }
});
